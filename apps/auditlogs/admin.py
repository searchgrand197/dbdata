from django.contrib import admin

from apps.auditlogs.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "module", "action", "actor", "hospital", "object_type", "object_id")
    list_filter = ("module", "action", "hospital")
    search_fields = ("object_id", "request_id", "user_agent")
    readonly_fields = (
        "hospital",
        "actor",
        "module",
        "action",
        "object_type",
        "object_id",
        "before",
        "after",
        "ip_address",
        "user_agent",
        "request_id",
        "created_at",
        "updated_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
