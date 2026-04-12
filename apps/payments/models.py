from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.billing.models import BillingInvoice
from apps.shared.models import Hospital, SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel


class PaymentTransaction(SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel):
    class PaymentMode(models.TextChoices):
        CASH = "cash"
        CARD = "card"
        UPI = "upi"
        BANK_TRANSFER = "bank_transfer"
        OTHER = "other"

    class Status(models.TextChoices):
        SUCCESS = "success"
        PENDING = "pending"
        FAILED = "failed"
        CANCELLED = "cancelled"

    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="payments")
    invoice = models.ForeignKey(BillingInvoice, on_delete=models.PROTECT, related_name="payments")

    payment_mode = models.CharField(max_length=30, choices=PaymentMode.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    transaction_reference = models.CharField(max_length=120, blank=True, default="")
    receipt_no = models.CharField(max_length=60, blank=True, default="")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS, db_index=True)
    paid_at = models.DateTimeField(default=timezone.now, db_index=True)

    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="collected_payments",
    )

    def __str__(self) -> str:
        return f"{self.invoice.invoice_no} - {self.amount} ({self.status})"


class RefundLog(TimeStampedModel, UUIDPrimaryKeyModel):
    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="refunds")
    invoice = models.ForeignKey(BillingInvoice, on_delete=models.PROTECT, related_name="refunds")
    payment = models.ForeignKey(PaymentTransaction, on_delete=models.PROTECT, null=True, blank=True, related_name="refunds")

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reason = models.CharField(max_length=500, blank=True, default="")
    refunded_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_refunds",
    )

    def __str__(self) -> str:
        return f"Refund {self.invoice.invoice_no} - {self.amount}"

