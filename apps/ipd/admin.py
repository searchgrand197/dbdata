from django.contrib import admin

from apps.ipd.models import IPDAdmission, IPDAdmissionStatusHistory, IPDTransferHistory


@admin.register(IPDAdmission)
class IPDAdmissionAdmin(admin.ModelAdmin):
    list_display = ("patient", "admission_date", "status", "ward_name", "bed_code", "hospital")
    list_filter = ("status", "hospital", "admission_date")
    search_fields = ("patient__uhid", "ward_name", "bed_code")
    date_hierarchy = "admission_date"


@admin.register(IPDAdmissionStatusHistory)
class IPDAdmissionStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("admission", "from_status", "to_status", "changed_by", "created_at")


@admin.register(IPDTransferHistory)
class IPDTransferHistoryAdmin(admin.ModelAdmin):
    list_display = ("admission", "from_bed_code", "to_bed_code", "changed_by", "created_at")
