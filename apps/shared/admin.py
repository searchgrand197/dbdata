from django.contrib import admin

from apps.shared.models import Hospital


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "timezone", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)
