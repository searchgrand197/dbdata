from __future__ import annotations

from django.db import transaction
from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from apps.billing.models import BillingInvoice
from apps.payments.models import PaymentTransaction
from apps.payments.serializers import (
    PaymentTransactionCreateSerializer,
    PaymentTransactionSerializer,
)
from apps.roles_permissions.permissions import HasRequiredPermission
from apps.auditlogs.services import create_audit_log
from apps.shared.response import success_response


class PaymentTransactionViewSet(viewsets.ModelViewSet):
    queryset = PaymentTransaction.objects.all().select_related("invoice", "collected_by")
    filter_backends = (SearchFilter,)
    search_fields = ("invoice__invoice_no", "invoice__patient__uhid", "transaction_reference", "receipt_no")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]
    http_method_names = ["get", "post"]

    required_permission_map = {
        "list": "payments.view_transaction",
        "retrieve": "payments.view_transaction",
        "create": "payments.create_transaction",
    }

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return PaymentTransactionSerializer
        return PaymentTransactionCreateSerializer

    def get_required_permission(self) -> str | None:
        return self.required_permission_map.get(getattr(self, "action", None))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_superuser:
            return qs
        return qs.filter(hospital_id=self.request.user.hospital_id)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = PaymentTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice: BillingInvoice = serializer.validated_data["invoice"]

        if not request.user.is_superuser and invoice.hospital_id != request.user.hospital_id:
            return Response(
                {"success": False, "errors": {"invoice": ["Invoice does not belong to your hospital."]}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if invoice.status in {BillingInvoice.Status.CANCELLED, BillingInvoice.Status.REFUNDED}:
            return Response(
                {"success": False, "errors": {"invoice": ["Cannot accept payments for cancelled/refunded invoices."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = serializer.validated_data
        payload["hospital_id"] = invoice.hospital_id
        payload["collected_by_id"] = request.user.id

        payment = PaymentTransaction.objects.create(**payload)

        total_paid = invoice.payments.aggregate(t=Sum("amount"))["t"] or 0
        invoice.amount_paid = total_paid
        invoice.save(update_fields=["amount_paid"])

        create_audit_log(
            request=request,
            hospital=invoice.hospital,
            module="payments",
            action="create_payment",
            obj=payment,
            after={
                "invoice_no": invoice.invoice_no,
                "amount": str(payment.amount),
                "payment_mode": payment.payment_mode,
                "status": payment.status,
            },
        )

        return success_response(data=PaymentTransactionSerializer(payment).data, status_code=status.HTTP_201_CREATED)

from django.shortcuts import render

# Create your views here.
