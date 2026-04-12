from django.contrib import admin

from apps.doctors.models import DoctorDailyAvailability, DoctorProfile, DoctorWeeklySchedule, Specialty


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "department", "hospital", "is_active")
    search_fields = ("name", "code")


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "doctor_code",
        "mobile_number",
        "alternate_mobile_number",
        "get_departments",
        "specialty",
        "hospital",
        "is_active",
    )
    list_filter = ("hospital", "is_active", "doctor_type", "is_deleted")
    search_fields = ("name", "doctor_code", "mobile_number", "alternate_mobile_number")

    def get_departments(self, obj):
        return ", ".join(d.name for d in obj.departments.all())

    get_departments.short_description = "Departments"

    def get_queryset(self, request):
        """
        Hide soft-deleted doctors in the main changelist so that using the
        built-in 'Delete selected' action behaves like a real delete from the
        admin UI.
        """
        qs = super().get_queryset(request)
        return qs.filter(is_deleted=False)


@admin.register(DoctorWeeklySchedule)
class DoctorWeeklyScheduleAdmin(admin.ModelAdmin):
    list_display = ("doctor", "day_of_week", "start_time", "end_time", "hospital")


@admin.register(DoctorDailyAvailability)
class DoctorDailyAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("doctor", "date", "is_available", "hospital")
