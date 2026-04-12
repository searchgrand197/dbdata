from django.contrib import admin

from apps.treatment.models import TreatmentPlan, TreatmentPlanItem, TreatmentTask


class TreatmentPlanItemInline(admin.TabularInline):
    model = TreatmentPlanItem
    extra = 1
    fields = ("sequence", "title", "category", "day_offset", "time_of_day", "assigned_staff", "assigned_designation", "assigned_department", "is_active")
    autocomplete_fields = ("assigned_staff", "assigned_designation", "assigned_department")
    show_change_link = True


@admin.register(TreatmentPlan)
class TreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "ipd_admission", "get_patient", "created_by", "start_date", "end_date", "status", "hospital")
    list_filter = ("hospital", "status", "start_date")
    search_fields = ("name", "ipd_admission__patient__first_name", "ipd_admission__patient__uhid")
    inlines = [TreatmentPlanItemInline]
    readonly_fields = ("created_at", "updated_at")

    def get_patient(self, obj):
        try:
            return obj.ipd_admission.patient
        except Exception:
            return "-"

    get_patient.short_description = "Patient"


@admin.register(TreatmentPlanItem)
class TreatmentPlanItemAdmin(admin.ModelAdmin):
    list_display = ("title", "plan", "category", "day_offset", "time_of_day", "assigned_staff", "assigned_designation", "is_active")
    list_filter = ("category", "is_active", "day_offset")
    search_fields = ("title", "instructions", "plan__name")
    autocomplete_fields = ("assigned_staff", "assigned_designation", "assigned_department")


@admin.register(TreatmentTask)
class TreatmentTaskAdmin(admin.ModelAdmin):
    list_display = ("get_item_title", "get_patient", "date", "time_of_day", "assigned_staff", "status", "priority", "completed_at")
    list_filter = ("status", "priority", "date")
    search_fields = ("plan_item__title", "ipd_admission__patient__first_name", "assigned_staff__employee_code")
    readonly_fields = ("created_at", "updated_at", "completed_at", "completed_by")

    def get_item_title(self, obj):
        return obj.plan_item.title

    get_item_title.short_description = "Task"

    def get_patient(self, obj):
        try:
            return obj.ipd_admission.patient
        except Exception:
            return "-"

    get_patient.short_description = "Patient"
