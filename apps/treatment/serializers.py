from rest_framework import serializers

from apps.treatment.models import TreatmentPlan, TreatmentPlanItem, TreatmentTask


# ────────────────────────────────────────────────────────────────────────────
# Plan
# ────────────────────────────────────────────────────────────────────────────

class TreatmentPlanSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    patient_name = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlan
        fields = [
            "id",
            "hospital_id",
            "ipd_admission",
            "patient_name",
            "created_by",
            "created_by_email",
            "name",
            "notes",
            "start_date",
            "end_date",
            "status",
            "item_count",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        try:
            return obj.ipd_admission.patient.full_name
        except Exception:
            return None

    def get_item_count(self, obj):
        return obj.items.filter(is_active=True).count()


class TreatmentPlanCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = ["ipd_admission", "name", "notes", "start_date", "end_date", "status"]


# ────────────────────────────────────────────────────────────────────────────
# Plan items
# ────────────────────────────────────────────────────────────────────────────

class TreatmentPlanItemSerializer(serializers.ModelSerializer):
    assigned_staff_name = serializers.SerializerMethodField()
    assigned_designation_name = serializers.CharField(source="assigned_designation.name", read_only=True)
    assigned_department_name = serializers.CharField(source="assigned_department.name", read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlanItem
        fields = [
            "id",
            "plan",
            "parent",
            "sequence",
            "title",
            "instructions",
            "category",
            "day_offset",
            "time_of_day",
            "assigned_staff",
            "assigned_staff_name",
            "assigned_designation",
            "assigned_designation_name",
            "assigned_department",
            "assigned_department_name",
            "is_active",
            "task_count",
            "created_at",
            "updated_at",
        ]

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            parts = f"{(obj.assigned_staff.first_name or '').strip()} {(obj.assigned_staff.last_name or '').strip()}".strip()
            return parts or obj.assigned_staff.employee_code or str(obj.assigned_staff.id)
        return None

    def get_task_count(self, obj):
        return obj.tasks.count()


class TreatmentPlanItemCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlanItem
        fields = [
            "plan",
            "parent",
            "sequence",
            "title",
            "instructions",
            "category",
            "day_offset",
            "time_of_day",
            "assigned_staff",
            "assigned_designation",
            "assigned_department",
            "is_active",
        ]


# ────────────────────────────────────────────────────────────────────────────
# Tasks (what staff see and act on)
# ────────────────────────────────────────────────────────────────────────────

class TreatmentTaskSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(source="ipd_admission.hospital_id", read_only=True)
    patient_name = serializers.SerializerMethodField()
    item_title = serializers.CharField(source="plan_item.title", read_only=True)
    item_category = serializers.CharField(source="plan_item.category", read_only=True)
    assigned_staff_name = serializers.SerializerMethodField()
    completed_by_email = serializers.EmailField(source="completed_by.email", read_only=True)

    class Meta:
        model = TreatmentTask
        fields = [
            "id",
            "hospital_id",
            "plan_item",
            "item_title",
            "item_category",
            "ipd_admission",
            "patient_name",
            "date",
            "time_of_day",
            "assigned_staff",
            "assigned_staff_name",
            "status",
            "priority",
            "notes_from_doctor",
            "notes_from_staff",
            "completed_at",
            "completed_by",
            "completed_by_email",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        try:
            return obj.ipd_admission.patient.full_name
        except Exception:
            return None

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            parts = f"{(obj.assigned_staff.first_name or '').strip()} {(obj.assigned_staff.last_name or '').strip()}".strip()
            return parts or obj.assigned_staff.employee_code or str(obj.assigned_staff.id)
        return None


class TreatmentTaskStatusUpdateSerializer(serializers.ModelSerializer):
    """Used by staff to update task status and add notes."""

    class Meta:
        model = TreatmentTask
        fields = ["status", "priority", "notes_from_staff"]
