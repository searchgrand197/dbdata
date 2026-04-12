from django.contrib import admin

from apps.staff.models import (
    Department,
    Designation,
    Shift,
    StaffAvailabilityOverride,
    StaffProfile,
    StaffShiftAssignment,
)
from apps.staff.services import auto_cancel_expired_shift_assignments


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = (
        "employee_code",
        "first_name",
        "last_name",
        "phone",
        "department",
        "designation",
        "employment_status",
        "hospital",
    )
    list_filter = ("hospital", "department", "designation", "employment_status")
    search_fields = ("employee_code", "first_name", "last_name", "phone", "user__email")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "hospital", "is_active")
    list_filter = ("hospital", "is_active")
    search_fields = ("code", "name", "description")


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    """Keep designations here for CRUD; search_fields power autocomplete on permission profiles."""

    list_display = ("code", "name", "hospital", "is_active")
    list_filter = ("hospital", "is_active")
    search_fields = ("code", "name")


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("name", "hospital", "start_time", "end_time", "is_active")
    list_filter = ("hospital", "is_active")
    search_fields = ("name",)


@admin.register(StaffShiftAssignment)
class StaffShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ("staff", "date", "end_date", "shift", "status", "hospital", "assigned_by")
    list_filter = ("hospital", "shift", "status", "date", "end_date")
    search_fields = ("staff__employee_code", "staff__first_name", "staff__last_name", "shift__name")

    actions = ["run_auto_cancel_expired"]

    def run_auto_cancel_expired(self, request, queryset):
        updated = auto_cancel_expired_shift_assignments()
        self.message_user(request, f"Auto-cancelled {updated} expired shift assignments.")

    run_auto_cancel_expired.short_description = "Auto-cancel expired assignments (by end_date)"


@admin.register(StaffAvailabilityOverride)
class StaffAvailabilityOverrideAdmin(admin.ModelAdmin):
    list_display = ("staff", "date", "is_available", "hospital", "updated_by")
    list_filter = ("hospital", "is_available", "date")
    search_fields = ("staff__employee_code", "staff__first_name", "staff__last_name")

