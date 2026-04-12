from __future__ import annotations

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.roles_permissions.permissions import HasRequiredPermission
from apps.treatment.models import TreatmentPlan, TreatmentPlanItem, TreatmentTask
from apps.treatment.serializers import (
    TreatmentPlanCreateUpdateSerializer,
    TreatmentPlanItemCreateUpdateSerializer,
    TreatmentPlanItemSerializer,
    TreatmentPlanSerializer,
    TreatmentTaskSerializer,
    TreatmentTaskStatusUpdateSerializer,
)
from apps.treatment.services import cancel_plan, complete_task, generate_tasks_for_plan


class HospitalScopedMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        if not getattr(user, "hospital_id", None):
            return qs.none()
        return qs.filter(hospital_id=user.hospital_id)


# ────────────────────────────────────────────────────────────────────────────
# TreatmentPlan
# ────────────────────────────────────────────────────────────────────────────

class TreatmentPlanViewSet(HospitalScopedMixin, viewsets.ModelViewSet):
    """
    CRUD for treatment plans.
    After creating or updating a plan, call the /generate-tasks/ action to
    materialise TreatmentTask rows for staff.
    """

    queryset = TreatmentPlan.objects.all().select_related(
        "ipd_admission", "ipd_admission__patient", "created_by"
    )
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ("ipd_admission", "status")
    search_fields = ("name", "notes", "ipd_admission__patient__first_name")
    ordering_fields = ("start_date", "created_at", "status")
    ordering = ("-created_at",)

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return TreatmentPlanSerializer
        return TreatmentPlanCreateUpdateSerializer

    def perform_create(self, serializer):
        user = self.request.user
        plan = serializer.save(
            hospital_id=user.hospital_id,
            created_by=user,
        )
        # Auto-generate tasks immediately for the plan's date range.
        generate_tasks_for_plan(plan, plan.start_date, plan.end_date or plan.start_date)

    def perform_update(self, serializer):
        plan = serializer.save()
        # Re-generate / update tasks for any pending items.
        generate_tasks_for_plan(plan, plan.start_date, plan.end_date or plan.start_date)

    @action(detail=True, methods=["post"], url_path="generate-tasks")
    def generate_tasks(self, request, pk=None):
        """
        Manually trigger task generation for this plan.
        Accepts optional body: { "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }
        """
        plan = self.get_object()
        from_date_str = request.data.get("from_date")
        to_date_str = request.data.get("to_date")

        from datetime import date as dt_date
        from_date = dt_date.fromisoformat(from_date_str) if from_date_str else plan.start_date
        to_date = dt_date.fromisoformat(to_date_str) if to_date_str else (plan.end_date or plan.start_date)

        count = generate_tasks_for_plan(plan, from_date, to_date)
        return Response({"tasks_created": count})

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancel the plan and all pending tasks under it."""
        plan = self.get_object()
        cancel_plan(plan=plan, cancelled_by=request.user)
        return Response({"detail": "Plan cancelled."})


# ────────────────────────────────────────────────────────────────────────────
# TreatmentPlanItem
# ────────────────────────────────────────────────────────────────────────────

class TreatmentPlanItemViewSet(viewsets.ModelViewSet):
    """
    CRUD for individual items (medications, nursing tasks, etc.) inside a plan.
    Filtered by plan via query param ?plan=<uuid>.
    """

    queryset = TreatmentPlanItem.objects.all().select_related(
        "plan", "assigned_staff", "assigned_designation", "assigned_department", "parent"
    )
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ("plan", "category", "day_offset", "is_active")
    search_fields = ("title", "instructions")
    ordering_fields = ("day_offset", "time_of_day", "sequence")
    ordering = ("day_offset", "time_of_day", "sequence")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return TreatmentPlanItemSerializer
        return TreatmentPlanItemCreateUpdateSerializer

    def perform_create(self, serializer):
        item = serializer.save()
        # Auto-generate the task for this specific item.
        plan = item.plan
        task_date = plan.start_date
        from datetime import timedelta
        task_date = plan.start_date + timedelta(days=item.day_offset)
        generate_tasks_for_plan(plan, task_date, task_date)

    def perform_update(self, serializer):
        item = serializer.save()
        # Regenerate task for updated item (only if still pending).
        plan = item.plan
        from datetime import timedelta
        task_date = plan.start_date + timedelta(days=item.day_offset)
        generate_tasks_for_plan(plan, task_date, task_date)


# ────────────────────────────────────────────────────────────────────────────
# TreatmentTask
# ────────────────────────────────────────────────────────────────────────────

class TreatmentTaskViewSet(viewsets.ModelViewSet):
    """
    Readable by all staff; status updates by the assigned staff member.
    Supports:
      - ?date=YYYY-MM-DD  filter by date
      - ?assigned_staff=<uuid>
      - ?ipd_admission=<uuid>
      - ?status=pending / done / ...
      - ?mine=true  → only tasks assigned to the logged-in user's staff profile
    """

    queryset = TreatmentTask.objects.all().select_related(
        "plan_item",
        "plan_item__plan",
        "ipd_admission",
        "ipd_admission__patient",
        "assigned_staff",
        "completed_by",
    )
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ("date", "status", "priority", "assigned_staff", "ipd_admission")
    search_fields = ("plan_item__title", "ipd_admission__patient__first_name")
    ordering_fields = ("date", "time_of_day", "priority", "status")
    ordering = ("date", "time_of_day", "priority")

    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return TreatmentTaskStatusUpdateSerializer
        return TreatmentTaskSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_superuser:
            qs = qs.filter(ipd_admission__hospital_id=user.hospital_id)

        # ?mine=true → filter to logged-in user's staff profile
        if self.request.query_params.get("mine") == "true":
            from apps.staff.models import StaffProfile
            staff = StaffProfile.objects.filter(
                user=user, is_deleted=False
            ).first()
            if staff:
                qs = qs.filter(assigned_staff=staff)
            else:
                qs = qs.none()

        return qs

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        """Mark task as done with optional staff notes."""
        task = self.get_object()
        notes = request.data.get("notes", "")
        try:
            complete_task(task=task, completed_by=request.user, notes=notes)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TreatmentTaskSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="skip")
    def skip(self, request, pk=None):
        """Mark task as skipped."""
        task = self.get_object()
        if task.status in (TreatmentTask.Status.DONE, TreatmentTask.Status.CANCELLED):
            return Response(
                {"detail": f"Task is already {task.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = TreatmentTask.Status.SKIPPED
        task.notes_from_staff = request.data.get("notes", task.notes_from_staff)
        task.save(update_fields=["status", "notes_from_staff", "updated_at"])
        return Response(TreatmentTaskSerializer(task, context={"request": request}).data)
