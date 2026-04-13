from __future__ import annotations

import re
from decimal import Decimal

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from apps.auditlogs.services import create_audit_log
from apps.inventory.models import Medicine, MedicineBatch, StockLedger, Unit
from apps.inventory.serializers import (
    MedicineBatchCreateUpdateSerializer,
    MedicineBatchRatesUpdateSerializer,
    MedicineBatchSerializer,
    MedicineCreateUpdateSerializer,
    MedicineSerializer,
    StockLedgerCreateSerializer,
    StockLedgerSerializer,
    UnitCreateUpdateSerializer,
    UnitSerializer,
)
from apps.inventory.services.stock_service import get_batch_available_qty
from apps.roles_permissions.permissions import HasRequiredPermission
from apps.shared.response import success_response
from apps.shared.models import Hospital


def _tablets_per_strip_from_pack_info(pack_info: str) -> int | None:
    """e.g. '1x10' or '1 x 10' → 10 tablets per strip (uses the number after x)."""
    if not pack_info or not str(pack_info).strip():
        return None
    m = re.match(r"^\s*(\d+)\s*[x×]\s*(\d+)\s*$", str(pack_info).strip(), re.I)
    if not m:
        return None
    return int(m.group(2))


class HospitalScopedMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # If the user has a hospital (including superusers), scope to that tenant so lists match
        # pharmacy purchase, billing, and stock rules.
        hid = getattr(user, "hospital_id", None)
        if hid:
            return qs.filter(hospital_id=hid)
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
        hospital_id = self.request.user.hospital_id
        unit = serializer.validated_data.get("unit")
        if unit is None:
            unit, _ = Unit.objects.get_or_create(
                hospital_id=hospital_id,
                code="TAB",
                defaults={"name": "Tablet", "is_active": True},
            )
            medicine = serializer.save(hospital_id=hospital_id, unit=unit)
        else:
            medicine = serializer.save(hospital_id=hospital_id)

        per_strip = _tablets_per_strip_from_pack_info(medicine.pack_info or "")
        conv = medicine.unit_conversions or {}
        if per_strip and per_strip > 0 and not conv.get("strip"):
            conv = {**conv, "strip": float(per_strip)}
            medicine.unit_conversions = conv
            medicine.save(update_fields=["unit_conversions", "updated_at"])

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
        if self.action in {"update", "partial_update"}:
            return MedicineBatchRatesUpdateSerializer
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

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        refreshed = self.get_queryset().get(pk=instance.pk)
        return Response(MedicineBatchSerializer(refreshed, context={"request": request}).data)


class StockLedgerViewSet(HospitalScopedMixin, viewsets.ModelViewSet):
    queryset = StockLedger.objects.all().select_related("medicine", "batch", "hospital").order_by("-created_at")
    filter_backends = (DjangoFilterBackend, SearchFilter)
    filterset_fields = ("batch", "medicine")
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

        med_id = data["medicine"]
        if str(med_id) != str(medicine_batch.medicine_id):
            raise ValidationError({"medicine": ["Medicine must match the selected batch."]})

        qty_change = Decimal(data["qty_change"])
        reason = data["reason"]
        if reason in {StockLedger.Reason.STOCK_IN, StockLedger.Reason.RETURN_IN} and qty_change <= 0:
            raise ValidationError({"qty_change": ["Must be greater than zero for stock in / return."]})
        if reason == StockLedger.Reason.DISPENSE_OUT and qty_change >= 0:
            raise ValidationError({"qty_change": ["Must be negative for dispense out."]})

        ref_type = (data.get("reference_type") or "").strip()
        ref_id = (data.get("reference_id") or "").strip()
        allow_negative = bool(data.get("allow_negative_stock", False))

        if reason == StockLedger.Reason.ADJUST:
            if qty_change == 0:
                raise ValidationError({"qty_change": ["Adjustment quantity cannot be zero."]})
            if not ref_id:
                raise ValidationError({"reference_id": ["Reason is required for stock adjustments."]})
            available = get_batch_available_qty(medicine_batch)
            projected = available + qty_change
            if projected < 0 and not allow_negative:
                raise ValidationError(
                    {
                        "qty_change": [
                            f"Resulting stock would be negative ({projected}). Enable allow_negative_stock or reduce the adjustment."
                        ]
                    }
                )
            if not ref_type:
                ref_type = "inventory_adjust"

        entry = StockLedger.objects.create(
            hospital_id=hospital.id,
            medicine_id=med_id,
            batch=medicine_batch,
            qty_change=qty_change,
            reason=reason,
            reference_type=ref_type[:50],
            reference_id=ref_id[:100],
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

        serializer.instance = entry

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            StockLedgerSerializer(serializer.instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

from django.shortcuts import render

# Create your views here.
