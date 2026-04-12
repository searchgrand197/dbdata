from rest_framework import serializers

from apps.payments.models import PaymentTransaction


class PaymentTransactionSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    invoice_no = serializers.CharField(source="invoice.invoice_no", read_only=True)
    patient_uhid = serializers.CharField(source="invoice.patient.uhid", read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            "id",
            "hospital_id",
            "invoice",
            "invoice_no",
            "patient_uhid",
            "payment_mode",
            "amount",
            "transaction_reference",
            "receipt_no",
            "status",
            "paid_at",
            "collected_by",
            "created_at",
            "updated_at",
        ]


class PaymentTransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ["invoice", "payment_mode", "amount", "transaction_reference", "receipt_no", "status", "paid_at"]
        extra_kwargs = {
            "status": {"required": False, "default": PaymentTransaction.Status.SUCCESS},
        }

