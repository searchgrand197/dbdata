from rest_framework import serializers
from apps.pharmacy.models import PharmacyInvoice, PharmacyInvoiceItem
from apps.patients.serializers import PatientSerializer
from apps.doctors.serializers import DoctorProfileSerializer
from apps.inventory.serializers import MedicineSerializer

class PharmacyInvoiceItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source="medicine.name")
    batch_no = serializers.ReadOnlyField(source="batch.batch_no")
    expiry_date = serializers.ReadOnlyField(source="batch.expiry_date")
    
    class Meta:
        model = PharmacyInvoiceItem
        fields = (
            "id", "invoice", "medicine", "medicine_name", "batch", "batch_no", "expiry_date", 
            "qty", "mrp", "rate", "cgst_rate", "sgst_rate", "amount"
        )

class PharmacyInvoiceSerializer(serializers.ModelSerializer):
    items = PharmacyInvoiceItemSerializer(many=True, read_only=True)
    patient_details = PatientSerializer(source="patient", read_only=True)
    doctor_details = DoctorProfileSerializer(source="referred_by", read_only=True)
    
    class Meta:
        model = PharmacyInvoice
        fields = (
            "id", "patient", "patient_details", "referred_by", "doctor_details", 
            "invoice_no", "date", "status", "subtotal", "total_discount", 
            "cgst", "sgst", "grand_total", "remarks", "items", "created_at"
        )
