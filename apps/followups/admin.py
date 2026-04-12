from django.contrib import admin

from apps.followups.models import FollowUp, FollowUpStatusHistory


@admin.register(FollowUp)
class FollowUpAdmin(admin.ModelAdmin):
    list_display = (
        "patient",
        "doctor",
        "next_visit_date",
        "followup_status",
        "reminder_status",
        "hospital",
    )
    list_filter = ("followup_status", "reminder_status", "hospital")
    search_fields = ("patient__uhid", "advice", "call_remark")
    date_hierarchy = "next_visit_date"


@admin.register(FollowUpStatusHistory)
class FollowUpStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("followup", "from_status", "to_status", "changed_by", "created_at")
