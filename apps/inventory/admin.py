from django.contrib import admin

from apps.inventory.models import Medicine, MedicineBatch, MedicineReorderRule, StockLedger, Unit


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "hospital", "is_active")
    search_fields = ("code", "name")


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "unit", "hospital", "is_active")
    search_fields = ("sku", "name")


@admin.register(MedicineBatch)
class MedicineBatchAdmin(admin.ModelAdmin):
    list_display = ("medicine", "batch_no", "expiry_date", "hospital")
    search_fields = ("batch_no", "medicine__name")


@admin.register(MedicineReorderRule)
class MedicineReorderRuleAdmin(admin.ModelAdmin):
    list_display = ("medicine", "reorder_level", "hospital", "is_active")


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ("medicine", "batch", "qty_change", "reason", "created_at", "hospital")
    list_filter = ("reason", "hospital")
    date_hierarchy = "created_at"
