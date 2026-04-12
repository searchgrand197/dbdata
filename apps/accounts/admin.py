from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin for custom email-based user (replaces default Users)."""

    ordering = ("email",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "phone",
        "hospital_id",
        "hospital",
        "is_staff",
        "is_active",
        "is_superuser",
        "date_joined",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "hospital")
    search_fields = ("email", "first_name", "last_name", "phone")
    readonly_fields = ("hospital_id", "last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Profile",
            {"fields": ("first_name", "last_name", "phone", "hospital_id", "hospital")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "phone",
                    "hospital",
                    "is_staff",
                    "is_superuser",
                    "is_active",
                ),
            },
        ),
    )
