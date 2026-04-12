from django.contrib import admin

from apps.appointments.models import Appointment, AppointmentStatusHistory


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "appointment_datetime", "status", "consultation_type", "hospital")
    list_filter = ("status", "consultation_type", "hospital")
    search_fields = ("patient__uhid", "patient__phone", "doctor__name")
    date_hierarchy = "appointment_datetime"


@admin.register(AppointmentStatusHistory)
class AppointmentStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("appointment", "from_status", "to_status", "changed_by", "created_at")
