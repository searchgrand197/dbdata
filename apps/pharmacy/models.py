from decimal import Decimal
from django.conf import settings
from django.db import models
from apps.shared.models import Hospital, TimeStampedModel, UUIDPrimaryKeyModel
from apps.patients.models import Patient
from apps.doctors.models import DoctorProfile
from apps.inventory.models import Medicine, MedicineBatch

class PharmacyInvoice(TimeStampedModel, UUIDPrimaryKeyModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        FINALIZED = "finalized", "Finalized"
        CANCELLED = "cancelled", "Cancelled"

    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="pharmacy_invoices")
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="pharmacy_invoices")
    referred_by = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="pharmacy_referrals")
    
    invoice_no = models.CharField(max_length=50, unique=True)
    date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    
    remarks = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_pharmacy_invoices")

    def __str__(self):
        return f"Invoice {self.invoice_no} - {self.patient.first_name}"

class PharmacyInvoiceItem(TimeStampedModel, UUIDPrimaryKeyModel):
    invoice = models.ForeignKey(PharmacyInvoice, on_delete=models.CASCADE, related_name="items")
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="pharmacy_sale_items")
    batch = models.ForeignKey(MedicineBatch, on_delete=models.PROTECT, related_name="pharmacy_sale_items")
    
    qty = models.DecimalField(max_digits=12, decimal_places=2)
    mrp = models.DecimalField(max_digits=12, decimal_places=2)
    rate = models.DecimalField(max_digits=12, decimal_places=2) # Sale rate
    
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("6.00"))
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("6.00"))
    
    amount = models.DecimalField(max_digits=12, decimal_places=2) # Excluding tax? Or total?
    # I'll store the total amount for this row (qty * rate) including tax if needed, but standard GST is often rate * qty + taxes.
    
    def __str__(self):
        return f"{self.medicine.name} x {self.qty}"
