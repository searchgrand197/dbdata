from __future__ import annotations

from decimal import Decimal

from rest_framework import permissions, status, viewsets
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from apps.auditlogs.services import create_audit_log
from apps.inventory.models import Medicine, MedicineBatch, StockLedger, Unit
from apps.inventory.serializers import (
    MedicineBatchCreateUpdateSerializer,
    MedicineBatchSerializer,
    MedicineCreateUpdateSerializer,
    MedicineSerializer,
    StockLedgerCreateSerializer,
    StockLedgerSerializer,
    UnitCreateUpdateSerializer,
    UnitSerializer,
)
from apps.roles_permissions.permissions import HasRequiredPermission
from apps.shared.response import success_response
from apps.shared.models import Hospital


class HospitalScopedMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(hospital_id=user.hospital_id)


class UnitViewSet(HospitalScopedMixin, viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    filter_backends = (DjangoFilterBackend, SearchFilter)
    search_fields = ("code", "name")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    required_permission_map = {
        "list": "inventory.view_unit",
        "retrieve": "inventory.view_unit",
        "create": "inventory.create_unit",
        "update": "inventory.update_unit",
        "partial_update": "inventory.update_unit",
        "destroy": "inventory.delete_unit",
    }

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return UnitSerializer
        return UnitCreateUpdateSerializer

    def get_required_permission(self):
        return self.required_permission_map.get(getattr(self, "action", None))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        return super().get_permissions()

    def perform_create(self, serializer):
        unit = serializer.save(hospital_id=self.request.user.hospital_id)
        create_audit_log(
            request=self.request,
            hospital=unit.hospital,
            module="inventory",
            action="create_unit",
            obj=unit,
            after={"code": unit.code, "name": unit.name},
        )


class MedicineViewSet(HospitalScopedMixin, viewsets.ModelViewSet):
    queryset = Medicine.objects.all().select_related("unit")
    filter_backends = (DjangoFilterBackend, SearchFilter)
    search_fields = ("sku", "name")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    required_permission_map = {
        "list": "inventory.view_medicine",
        "retrieve": "inventory.view_medicine",
        "create": "inventory.create_medicine",
        "update": "inventory.update_medicine",
        "partial_update": "inventory.update_medicine",
        "destroy": "inventory.delete_medicine",
    }

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return MedicineSerializer
        return MedicineCreateUpdateSerializer

    def get_required_permission(self):
        return self.required_permission_map.get(getattr(self, "action", None))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        return super().get_permissions()

    def perform_create(self, serializer):
        medicine = serializer.save(hospital_id=self.request.user.hospital_id)
        create_audit_log(
            request=self.request,
            hospital=medicine.hospital,
            module="inventory",
            action="create_medicine",
            obj=medicine,
            after={"sku": medicine.sku, "name": medicine.name},
        )


class MedicineBatchViewSet(HospitalScopedMixin, viewsets.ModelViewSet):
    queryset = MedicineBatch.objects.all().select_related("medicine", "medicine__unit")
    filter_backends = (DjangoFilterBackend, SearchFilter)
    search_fields = ("batch_no", "medicine__name")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    required_permission_map = {
        "list": "inventory.view_batch",
        "retrieve": "inventory.view_batch",
        "create": "inventory.create_batch",
        "update": "inventory.update_batch",
        "partial_update": "inventory.update_batch",
        "destroy": "inventory.delete_batch",
    }

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return MedicineBatchSerializer
        return MedicineBatchCreateUpdateSerializer

    def get_required_permission(self):
        return self.required_permission_map.get(getattr(self, "action", None))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        return super().get_permissions()

    def perform_create(self, serializer):
        batch = serializer.save(hospital_id=self.request.user.hospital_id)
        create_audit_log(
            request=self.request,
            hospital=batch.hospital,
            module="inventory",
            action="create_batch",
            obj=batch,
            after={"batch_no": batch.batch_no, "expiry_date": str(batch.expiry_date)},
        )


class StockLedgerViewSet(HospitalScopedMixin, viewsets.ModelViewSet):
    queryset = StockLedger.objects.all().select_related("medicine", "batch", "hospital")
    filter_backends = (DjangoFilterBackend, SearchFilter)
    search_fields = ("medicine__name", "batch__batch_no", "reference_type", "reference_id")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    http_method_names = ["get", "post"]

    required_permission_map = {
        "list": "inventory.view_stock_ledger",
        "retrieve": "inventory.view_stock_ledger",
        "create": "inventory.create_stock_ledger",
    }

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return StockLedgerSerializer
        return StockLedgerCreateSerializer

    def get_required_permission(self):
        return self.required_permission_map.get(getattr(self, "action", None))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        return super().get_permissions()

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        medicine_batch = MedicineBatch.objects.select_related("medicine", "hospital").get(pk=data["batch"])
        hospital = medicine_batch.hospital

        if not self.request.user.is_superuser and hospital.id != self.request.user.hospital_id:
            raise permissions.PermissionDenied("Not in your hospital.")

        qty_change = Decimal(data["qty_change"])
        reason = data["reason"]
        if reason in {StockLedger.Reason.STOCK_IN, StockLedger.Reason.RETURN_IN} and qty_change <= 0:
            return Response({"success": False, "errors": {"qty_change": ["qty_change must be > 0 for stock_in/return_in."]}}, status=status.HTTP_400_BAD_REQUEST)
        if reason == StockLedger.Reason.DISPENSE_OUT and qty_change >= 0:
            return Response({"success": False, "errors": {"qty_change": ["qty_change must be < 0 for dispense_out."]}}, status=status.HTTP_400_BAD_REQUEST)

        entry = StockLedger.objects.create(
            hospital_id=hospital.id,
            medicine_id=data["medicine"],
            batch=medicine_batch,
            qty_change=qty_change,
            reason=reason,
            reference_type=data.get("reference_type", ""),
            reference_id=data.get("reference_id", ""),
            created_by=self.request.user,
        )

        create_audit_log(
            request=self.request,
            hospital=hospital,
            module="inventory",
            action="create_stock_ledger",
            obj=entry,
            after={"qty_change": str(entry.qty_change), "reason": entry.reason},
        )

        return entry

    def create(self, request, *args, **kwargs):
        # Use DRF default validation but return consistent payload.
        return super().create(request, *args, **kwargs)

from django.shortcuts import render

# Create your views here.
