from django.contrib import admin

from apps.pharmacy.models import PharmacyOutletSettings


@admin.register(PharmacyOutletSettings)
class PharmacyOutletSettingsAdmin(admin.ModelAdmin):
    list_display = ("hospital", "business_name", "gst_number", "updated_at")
    search_fields = ("business_name", "gst_number", "hospital__name")
