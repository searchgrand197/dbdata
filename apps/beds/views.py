from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.beds.models import Bed, BedRoom, Floor
from apps.beds.serializers import (
    BedRoomSerializer,
    BedSerializer,
    BedStatusUpdateSerializer,
    FloorBriefSerializer,
    FloorSerializer,
    FloorWithRoomsSerializer,
)
from apps.shared.response import success_response


class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name"]

    def get_serializer_class(self):
        if self.action in {"list"}:
            return FloorBriefSerializer
        return FloorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(hospital=user.hospital)

    def perform_create(self, serializer):
        hospital_id = self.request.data.get("hospital_id") or self.request.user.hospital_id
        from apps.shared.models import Hospital
        hospital = Hospital.objects.get(pk=hospital_id)
        serializer.save(hospital=hospital)


class BedRoomViewSet(viewsets.ModelViewSet):
    queryset = BedRoom.objects.select_related("floor").prefetch_related("beds")
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["floor", "room_type", "is_ac", "is_active"]
    search_fields = ["name", "room_number"]

    def get_serializer_class(self):
        return BedRoomSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(hospital=user.hospital)

    def perform_create(self, serializer):
        hospital_id = self.request.data.get("hospital_id") or self.request.user.hospital_id
        from apps.shared.models import Hospital
        hospital = Hospital.objects.get(pk=hospital_id)
        serializer.save(hospital=hospital)


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related("room", "room__floor")
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["room", "status", "room__floor", "room__room_type"]
    search_fields = ["bed_code", "bed_number"]

    def get_serializer_class(self):
        if self.action in {"set_status"}:
            return BedStatusUpdateSerializer
        return BedSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        return qs.filter(hospital=user.hospital)

    def perform_create(self, serializer):
        hospital_id = self.request.data.get("hospital_id") or self.request.user.hospital_id
        from apps.shared.models import Hospital
        hospital = Hospital.objects.get(pk=hospital_id)
        serializer.save(hospital=hospital)

    @action(detail=True, methods=["patch"], url_path="set-status")
    def set_status(self, request, pk=None):
        bed = self.get_object()
        ser = BedStatusUpdateSerializer(bed, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return success_response(data=BedSerializer(bed).data)

    @action(detail=False, methods=["get"], url_path="by-floor")
    def by_floor(self, request):
        """Return all floors → rooms → beds in one call for the bed-picker UI."""
        qs = Floor.objects.filter(is_active=True)
        user = request.user
        if not user.is_superuser:
            qs = qs.filter(hospital=user.hospital)
        qs = qs.prefetch_related(
            "rooms",
            "rooms__beds",
        ).order_by("floor_number")
        return success_response(data=FloorWithRoomsSerializer(qs, many=True).data)
