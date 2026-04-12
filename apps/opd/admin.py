from django.contrib import admin

from apps.opd.models import OPDVisit, OPDVisitStatusHistory


@admin.register(OPDVisit)
class OPDVisitAdmin(admin.ModelAdmin):
    list_display = ("patient", "visit_date", "doctor_user", "status", "hospital")
    list_filter = ("status", "visit_date", "hospital")
    search_fields = ("patient__uhid", "diagnosis", "visit_reason")
    date_hierarchy = "visit_date"


@admin.register(OPDVisitStatusHistory)
class OPDVisitStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("visit", "from_status", "to_status", "changed_by", "created_at")
