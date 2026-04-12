from django.contrib import admin

from apps.settings_management.models import LeaveApprover


@admin.register(LeaveApprover)
class LeaveApproverAdmin(admin.ModelAdmin):
    list_display = ("hospital", "user_email", "is_active", "notes", "created_at")
    list_filter = ("hospital", "is_active")
    search_fields = ("user__email", "user__first_name", "user__last_name", "hospital__name")
    list_editable = ("is_active",)
    autocomplete_fields = ("user",)

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Approver (email)"
    user_email.admin_order_field = "user__email"
