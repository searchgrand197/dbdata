from django.contrib import admin

from apps.billing.models import BillingInvoice, DailyClosingSummary, InvoiceItem, InvoiceNumberSequence


@admin.register(InvoiceNumberSequence)
class InvoiceNumberSequenceAdmin(admin.ModelAdmin):
    list_display = ("hospital", "year", "last_seq")


@admin.register(BillingInvoice)
class BillingInvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_no", "patient", "status", "total_amount", "invoice_date", "hospital")
    list_filter = ("status", "encounter_type", "hospital", "invoice_date")
    search_fields = ("invoice_no", "patient__uhid")
    date_hierarchy = "invoice_date"


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ("invoice", "description", "quantity", "line_total")


@admin.register(DailyClosingSummary)
class DailyClosingSummaryAdmin(admin.ModelAdmin):
    list_display = ("hospital", "closing_date", "total_collected", "total_invoiced")
