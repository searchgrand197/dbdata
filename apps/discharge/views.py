from decimal import Decimal
from django.db.models import Sum
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.discharge.models import DischargeSummary
from apps.discharge.serializers import DischargeSummarySerializer
from apps.ipd.models import IPDAdmission
from apps.billing.models import BillingInvoice
from apps.payments.models import PaymentTransaction
from apps.shared.response import success_response


class DischargeSummaryViewSet(viewsets.ModelViewSet):
    queryset = DischargeSummary.objects.all().select_related("admission", "admission__patient")
    serializer_class = DischargeSummarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            return qs
        return qs.filter(hospital_id=self.request.user.hospital_id)

    def perform_create(self, serializer):
        admission = serializer.validated_data["admission"]
        hospital_id = admission.hospital_id
        serializer.save(hospital_id=hospital_id)
        
        # 1. Finalize Room Charges before closing
        from django.utils import timezone
        from apps.beds.models import Bed
        from apps.billing.models import BillingInvoice, InvoiceItem, InvoiceNumberSequence
        
        # Calculate stay exactly as in billing_summary
        end_date = timezone.now().date()
        delta = end_date - admission.admission_date
        stay_days = max(1, delta.days + 1)
        
        if admission.bed_code:
            bed = Bed.objects.filter(bed_code=admission.bed_code, hospital_id=hospital_id).select_related("room").first()
            if bed and bed.room:
                daily_rate = bed.room.daily_charge
                total_room_amount = stay_days * daily_rate
                
                if total_room_amount > 0:
                    # Generate Room Invoice No
                    year = end_date.year
                    seq, _ = InvoiceNumberSequence.objects.select_for_update().get_or_create(hospital_id=hospital_id, year=year)
                    seq.last_seq += 1
                    seq.save(update_fields=["last_seq"])
                    
                    slug_part = (admission.hospital.slug or admission.hospital.name or "HOSP")[:5].upper()
                    room_inv_no = f"IPDROOM-{slug_part}-{year}-{seq.last_seq:04d}"
                    
                    # Create the final room invoice
                    room_invoice = BillingInvoice.objects.create(
                        hospital_id=hospital_id,
                        invoice_no=room_inv_no,
                        encounter_type=BillingInvoice.EncounterType.IPD,
                        patient=admission.patient,
                        ipd_admission=admission,
                        status=BillingInvoice.Status.FINALIZED,
                        subtotal_amount=total_room_amount,
                        total_amount=total_room_amount,
                        amount_paid=Decimal("0.00"),
                        currency="INR",
                        invoice_date=end_date
                    )
                    InvoiceItem.objects.create(
                        invoice=room_invoice,
                        description=f"Room Charges: {admission.bed_code} ({stay_days} days @ ₹{daily_rate})",
                        quantity=Decimal(str(stay_days)),
                        unit_price=daily_rate,
                        line_total=total_room_amount
                    )

        # 2. Mark the admission as discharged
        if admission.status != IPDAdmission.Status.DISCHARGED:
            admission.status = IPDAdmission.Status.DISCHARGED
            admission.discharged_at = timezone.now()
            admission.save(update_fields=["status", "discharged_at"])

    @action(detail=False, methods=["get"], url_path="billing-summary")
    def billing_summary(self, request):
        """Calculate total billed, paid, and outstanding for an admission including room charges."""
        admission_id = request.query_params.get("admission_id")
        if not admission_id:
            return Response({"error": "admission_id query param required"}, status=400)
            
        try:
            from django.utils import timezone
            from apps.beds.models import Bed
            admission = IPDAdmission.objects.select_related("patient", "hospital").get(pk=admission_id)
        except IPDAdmission.DoesNotExist:
            return Response({"error": "Admission not found"}, status=404)

        # 1. Total Services (Surgery, Pharmacy, etc.)
        total_services = BillingInvoice.objects.filter(
            ipd_admission=admission,
            status=BillingInvoice.Status.FINALIZED
        ).aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")

        # 2. Dynamic Room Charges
        room_total = Decimal("0.00")
        stay_days = 0
        daily_rate = Decimal("0.00")
        
        # Determine stay duration (minimum 1 day)
        end_date = admission.discharged_at.date() if admission.discharged_at else timezone.now().date()
        delta = end_date - admission.admission_date
        stay_days = max(1, delta.days + 1)

        # Get room rate
        if admission.bed_code:
            bed = Bed.objects.filter(bed_code=admission.bed_code, hospital=admission.hospital).select_related("room").first()
            if bed and bed.room:
                daily_rate = bed.room.daily_charge
                room_total = stay_days * daily_rate

        # 3. Total Paid: Sum of all successful payment transactions (advances)
        total_paid = PaymentTransaction.objects.filter(
            invoice__ipd_admission=admission,
            status=PaymentTransaction.Status.SUCCESS
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        total_billed = total_services + room_total
        outstanding = total_billed - total_paid

        return Response({
            "admission_id": admission_id,
            "patient_name": f"{admission.patient.first_name} {admission.patient.last_name}",
            "admission_date": admission.admission_date,
            "stay_days": stay_days,
            "daily_rate": daily_rate,
            "room_total": room_total,
            "total_services": total_services,
            "total_billed": total_billed,
            "total_paid": total_paid,
            "outstanding": outstanding
        })
