from django.contrib import admin

from apps.tokens.models import DailyTokenCounter, Token, TokenStatusHistory


@admin.register(DailyTokenCounter)
class DailyTokenCounterAdmin(admin.ModelAdmin):
    list_display = ("doctor", "date", "current_number", "hospital")


@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    list_display = ("token_number", "doctor", "patient", "date", "status", "hospital")
    list_filter = ("status", "date", "hospital")
    search_fields = ("patient__uhid", "doctor__name")


@admin.register(TokenStatusHistory)
class TokenStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("token", "from_status", "to_status", "changed_by", "created_at")
