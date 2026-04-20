from django.db import IntegrityError, transaction
from decimal import Decimal
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.services.stock_service import deduct_stock_fifo, get_batch_available_qty

from apps.pharmacy.invoice_number import next_pharmacy_invoice_number
from apps.pharmacy.models import PharmacyInvoice, PharmacyInvoiceItem, PharmacyOutletSettings, PharmacySupplier
from apps.pharmacy.purchase_challan import process_purchase_challan
from apps.pharmacy.purchase_history import detail_purchase_history, list_purchase_history
from apps.pharmacy.serializers import (
    PharmacyInvoiceItemSerializer,
    PharmacyInvoiceSerializer,
    PharmacyOutletSettingsSerializer,
    PharmacySupplierSerializer,
    PurchaseChallanSerializer,
)
from apps.shared.response import success_response


class PharmacyOutletSettingsView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/pharmacy/settings/ — letterhead & compliance fields for print."""

    serializer_class = PharmacyOutletSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        hospital = getattr(self.request.user, "hospital", None)
        if hospital is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Hospital context required.")
        obj, _ = PharmacyOutletSettings.objects.get_or_create(
            hospital=hospital,
            defaults={"business_name": hospital.name or ""},
        )
        return obj


class PharmacyPurchaseChallanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        ser = PurchaseChallanSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return Response({"success": False, "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        hospital = getattr(request.user, "hospital", None)
        if hospital is None:
            return Response({"success": False, "detail": "Hospital context required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            vd = ser.validated_data
            lines = process_purchase_challan(
                request=request,
                hospital=hospital,
                lines=vd["lines"],
                supplier_id=vd.get("supplier_id"),
                invoice_no=(vd.get("invoice_no") or "").strip(),
                purchase_date=vd.get("purchase_date"),
                payment_type=vd.get("payment_type") or "cash",
                gst_enabled=vd.get("gst_enabled", True),
            )
        except ValueError as exc:
            return Response({"success": False, "detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return success_response({"lines": lines}, message="Purchase posted.")


class PharmacySupplierViewSet(viewsets.ModelViewSet):
    """CRUD + search for purchase parties (supplier master)."""

    serializer_class = PharmacySupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ("name", "phone", "gst_number")

    def get_queryset(self):
        user = self.request.user
        hid = getattr(user, "hospital_id", None)
        if not hid:
            return PharmacySupplier.objects.none()
        return PharmacySupplier.objects.filter(hospital_id=hid, is_active=True).order_by("name")


class PharmacyNextInvoiceNumberView(APIView):
    """GET /api/v1/pharmacy/invoice/next-number/ — preview next INV-{YYYY}-{seq} (not reserved)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        hospital = getattr(request.user, "hospital", None)
        if hospital is None:
            return Response({"success": False, "detail": "Hospital context required."}, status=status.HTTP_400_BAD_REQUEST)
        return success_response({"invoice_no": next_pharmacy_invoice_number(hospital.id)})


class PharmacyInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PharmacyInvoice.objects.all().order_by("-created_at")
    serializer_class = PharmacyInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["invoice_no", "patient__first_name", "patient__last_name", "patient__uhid"]

    def get_queryset(self):
        qs = super().get_queryset().filter(hospital=self.request.user.hospital)
        patient_id = self.request.query_params.get("patient")
        ipd_admission = self.request.query_params.get("ipd_admission")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if ipd_admission:
            qs = qs.filter(ipd_admission_id=ipd_admission)
        return qs

    def perform_create(self, serializer):
        hospital = self.request.user.hospital
        raw = (serializer.validated_data.get("invoice_no") or "").strip()
        if raw and not PharmacyInvoice.objects.filter(invoice_no=raw).exists():
            invoice_no = raw
        else:
            invoice_no = next_pharmacy_invoice_number(hospital.id)
            while PharmacyInvoice.objects.filter(invoice_no=invoice_no).exists():
                invoice_no = next_pharmacy_invoice_number(hospital.id)
        payment_method = (serializer.validated_data.get("payment_method") or "cash").lower()
        grand_total = serializer.validated_data.get("grand_total") or Decimal("0.00")
        paid_amount = serializer.validated_data.get("paid_amount")
        if payment_method == "credit":
            paid_amount = Decimal("0.00")
        elif paid_amount is None:
            paid_amount = grand_total
        for _ in range(3):
            try:
                serializer.save(
                    hospital=hospital,
                    created_by=self.request.user,
                    invoice_no=invoice_no,
                    payment_method=payment_method,
                    paid_amount=paid_amount,
                )
                return
            except IntegrityError:
                invoice_no = next_pharmacy_invoice_number(hospital.id)
                while PharmacyInvoice.objects.filter(invoice_no=invoice_no).exists():
                    invoice_no = next_pharmacy_invoice_number(hospital.id)
        # If all retries fail, bubble up the final DB integrity error.
        serializer.save(
            hospital=hospital,
            created_by=self.request.user,
            invoice_no=invoice_no,
            payment_method=payment_method,
            paid_amount=paid_amount,
        )

    @action(detail=False, methods=["get"], url_path="pending-credits")
    def pending_credits(self, request, *args, **kwargs):
        qs = (
            self.get_queryset()
            .select_related("patient")
            .filter(payment_method="credit")
            .exclude(status=PharmacyInvoice.Status.CANCELLED)
            .order_by("-date", "-created_at")
        )
        search = (request.query_params.get("search") or "").strip()
        patient_id = (request.query_params.get("patient_id") or "").strip()
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if search:
            qs = qs.filter(
                Q(invoice_no__icontains=search)
                | Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
                | Q(patient__uhid__icontains=search)
                | Q(patient__phone__icontains=search)
            )

        patients: dict[str, dict] = {}
        total_pending = Decimal("0.00")
        for inv in qs:
            due = (inv.grand_total or Decimal("0")) - (inv.paid_amount or Decimal("0"))
            if due <= 0:
                continue
            pid = str(inv.patient_id)
            row = patients.get(pid)
            if row is None:
                first_name = (inv.patient.first_name or "").strip()
                last_name = (inv.patient.last_name or "").strip()
                row = {
                    "patient_id": pid,
                    "patient_name": " ".join([x for x in [first_name, last_name] if x]).strip() or "Unknown",
                    "uhid": inv.patient.uhid or "",
                    "phone": inv.patient.phone or "",
                    "total_pending_amount": Decimal("0.00"),
                    "bills": [],
                }
                patients[pid] = row
            row["total_pending_amount"] += due
            row["bills"].append(
                {
                    "id": str(inv.id),
                    "invoice_no": inv.invoice_no,
                    "date": inv.date.isoformat() if inv.date else None,
                    "grand_total": str(inv.grand_total or Decimal("0.00")),
                    "paid_amount": str(inv.paid_amount or Decimal("0.00")),
                    "due_amount": str(due),
                    "ipd_admission": str(inv.ipd_admission_id) if inv.ipd_admission_id else None,
                    "status": inv.status,
                }
            )
            total_pending += due

        rows = []
        for row in patients.values():
            row["total_pending_amount"] = str(row["total_pending_amount"])
            row["bill_count"] = len(row["bills"])
            rows.append(row)
        rows.sort(key=lambda r: Decimal(r["total_pending_amount"]), reverse=True)
        return success_response(
            rows,
            meta={
                "total_patients": len(rows),
                "total_pending_amount": str(total_pending),
            },
        )


class PharmacyInvoiceItemViewSet(viewsets.ModelViewSet):
    queryset = PharmacyInvoiceItem.objects.all()
    serializer_class = PharmacyInvoiceItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(invoice__hospital=self.request.user.hospital)

    @transaction.atomic
    def perform_create(self, serializer):
        item = serializer.save()
        inv = item.invoice
        hospital = inv.hospital
        batch = item.batch
        allow_expired = str(self.request.query_params.get("allow_expired", "")).lower() in ("1", "true", "yes")
        if (
            batch.expiry_date
            and batch.expiry_date < timezone.now().date()
            and not allow_expired
        ):
            raise serializers.ValidationError({"batch": ["This batch is expired and cannot be sold."]})
        available = get_batch_available_qty(batch)
        if available < item.qty:
            raise serializers.ValidationError(
                {"qty": [f"Insufficient stock for batch {batch.batch_no}. Available {available}, requested {item.qty}."]}
            )
        try:
            deduct_stock_fifo(
                request=self.request,
                hospital=hospital,
                medicine_batch_pairs=[(batch, item.qty)],
                reference_id=str(inv.id),
            )
        except ValueError as exc:
            raise serializers.ValidationError({"non_field_errors": [str(exc)]}) from exc


class PurchaseHistoryListView(APIView):
    """GET /api/v1/pharmacy/purchase-history/ — paginated tiles for Marg-style dashboard."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        hospital = getattr(request.user, "hospital", None)
        if hospital is None:
            return Response({"success": False, "detail": "Hospital context required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            limit = max(1, min(int(request.query_params.get("limit", 20)), 100))
            offset = max(0, int(request.query_params.get("offset", 0)))
        except ValueError:
            limit, offset = 20, 0
        search = (request.query_params.get("search") or "").strip()
        supplier_id = request.query_params.get("supplier_id")
        gst = (request.query_params.get("gst") or "all").lower()
        if gst not in ("all", "gst", "non"):
            gst = "all"
        date_from = parse_date(request.query_params.get("date_from", "") or "")
        date_to = parse_date(request.query_params.get("date_to", "") or "")

        rows, total = list_purchase_history(
            hospital_id=hospital.id,
            limit=limit,
            offset=offset,
            search=search,
            supplier_id=supplier_id if supplier_id else None,
            date_from=date_from,
            date_to=date_to,
            gst=gst,
        )
        return success_response(
            rows,
            meta={"total": total, "limit": limit, "offset": offset, "has_more": offset + len(rows) < total},
        )


class PurchaseHistoryDetailView(APIView):
    """GET /api/v1/pharmacy/purchase-history/<uuid>/ — full challan + lines + return hints."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        hospital = getattr(request.user, "hospital", None)
        if hospital is None:
            return Response({"success": False, "detail": "Hospital context required."}, status=status.HTTP_400_BAD_REQUEST)
        data = detail_purchase_history(hospital_id=hospital.id, pk=pk)
        if not data:
            return Response({"success": False, "detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return success_response(data)
