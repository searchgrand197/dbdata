from __future__ import annotations

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.patients.filters import PatientFilterSet
from apps.patients.models import Patient, PatientAddress
from apps.patients.serializers import PatientCreateUpdateSerializer, PatientSerializer
from apps.patients.services.uhid_service import generate_uhid
from apps.roles_permissions.permissions import HasRequiredPermission
from apps.auditlogs.services import create_audit_log
from apps.shared.response import success_response


class PatientViewSet(viewsets.ModelViewSet):
    """
    Patient master data APIs.

    Notes:
    - All queries are scoped to `request.user.hospital` for non-superusers.
    - UHID is generated per hospital+year when missing on create.
    """

    queryset = Patient.objects.all()
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_class = PatientFilterSet
    search_fields = ("uhid", "phone", "first_name", "last_name", "email")
    ordering_fields = ("created_at", "updated_at", "dob", "first_name", "last_name", "uhid")
    ordering = ("-created_at",)

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    required_permission_map = {
        "list": "patients.view_patient",
        "retrieve": "patients.view_patient",
        "by_phone": "patients.view_patient",
        "create": "patients.create_patient",
        "update": "patients.update_patient",
        "partial_update": "patients.update_patient",
        "destroy": "patients.delete_patient",
    }

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return PatientSerializer
        return PatientCreateUpdateSerializer

    def get_required_permission(self) -> str | None:
        return self.required_permission_map.get(getattr(self, "action", None))

    def get_permissions(self):
        # Inject into our global RBAC permission class.
        self.required_permission = self.get_required_permission()
        return super().get_permissions()

    def _get_hospital_for_request(self):
        user = self.request.user
        if user.is_superuser:
            hospital_id = self.request.data.get("hospital_id") or self.request.query_params.get("hospital_id")
            if not hospital_id:
                raise ValueError("hospital_id is required for superuser requests.")
            return user.hospital_id if user.hospital_id else hospital_id
        return user.hospital_id

    def get_queryset(self):
        qs = super().get_queryset().select_related("address")
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(hospital_id=user.hospital_id)

    @action(detail=False, methods=["get"], url_path="by-phone")
    def by_phone(self, request, *args, **kwargs):
        """
        List every patient in this hospital that shares the same normalized mobile
        (patient.phone or guardian contact phone). Use when several family members use one number.
        """
        phone = (request.query_params.get("phone") or request.query_params.get("q") or "").strip()
        if not phone:
            return Response(
                {
                    "success": False,
                    "errors": {"phone": ["Query parameter `phone` or `q` is required."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            hospital_id = self._get_hospital_for_request()
        except ValueError as exc:
            return Response(
                {"success": False, "errors": {"hospital": [str(exc)]}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.patients.services.phone_family import patients_with_same_phone

        matches = patients_with_same_phone(hospital_id=hospital_id, phone=phone)
        if not matches:
            return success_response(data=[])

        id_order = {p.id: i for i, p in enumerate(matches)}
        ordered = sorted(
            Patient.objects.filter(id__in=id_order).select_related("address"),
            key=lambda p: id_order[p.id],
        )
        return success_response(data=PatientSerializer(ordered, many=True).data)

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser and not request.user.hospital_id:
            return Response(
                {"success": False, "errors": {"hospital": ["User is not assigned to any hospital."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hospital_id = request.user.hospital_id if not request.user.is_superuser else request.data.get("hospital_id")

        if not hospital_id:
            return Response(
                {"success": False, "errors": {"hospital_id": ["hospital_id is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()
        from apps.shared.models import Hospital

        hospital = Hospital.objects.get(pk=hospital_id)
        if not data.get("uhid"):
            with transaction.atomic():
                data["uhid"] = generate_uhid(hospital)

        # Extract address + age before passing to serializer
        address_line1 = data.get("address_line1", "")
        city          = data.get("city", "")
        state         = data.get("state", "")
        age           = data.get("age")

        # Convert age → approximate dob if dob not provided
        if age and not data.get("dob"):
            from datetime import date
            approx_year = date.today().year - int(age)
            data = data.copy()
            data["dob"] = f"{approx_year}-01-01"

        serializer = PatientCreateUpdateSerializer(data=data, context={"hospital": hospital})
        serializer.is_valid(raise_exception=True)
        patient = serializer.save(hospital=hospital)

        # Save address if provided
        if address_line1 or city or state:
            PatientAddress.objects.update_or_create(
                patient=patient,
                defaults={"line1": address_line1, "city": city, "state": state},
            )

        create_audit_log(
            request=request,
            hospital=hospital,
            module="patients",
            action="create",
            obj=patient,
            after={"uhid": patient.uhid, "phone": patient.phone, "status": patient.status},
        )
        return success_response(data=PatientSerializer(patient).data, status_code=status.HTTP_201_CREATED)

    def perform_destroy(self, instance: Patient):
        hospital = instance.hospital
        before = {"uhid": instance.uhid, "status": instance.status}
        instance.delete()
        create_audit_log(
            request=self.request,
            hospital=hospital,
            module="patients",
            action="delete",
            obj=instance,
            before=before,
            after={"is_deleted": True},
        )

from django.shortcuts import render

# Create your views here.
