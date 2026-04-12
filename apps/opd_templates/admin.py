from django.contrib import admin
from .models import OPDTemplate


@admin.register(OPDTemplate)
class OPDTemplateAdmin(admin.ModelAdmin):
    list_display = ("key", "name", "updated_at")
    readonly_fields = ("created_at", "updated_at")
    search_fields = ("key", "name")
