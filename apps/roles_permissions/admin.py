from django.contrib import admin
from django.contrib.auth import get_user_model

from apps.roles_permissions.models import (
    DesignationModulePermission,
    DesignationPermissionProfile,
    Module,
    UserModulePermission,
    UserPermissionProfile,
)
from apps.staff.models import Designation

User = get_user_model()


class DesignationModuleInline(admin.TabularInline):
    model = DesignationModulePermission
    extra = 1
    autocomplete_fields = ("module",)
    fields = (
        "module",
        "can_add",
        "can_edit",
        "can_delete",
        "can_view",
        "can_print",
        "can_download",
        "is_active",
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "module":
            kwargs["queryset"] = Module.objects.filter(is_active=True).order_by("name", "code")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class UserModuleInline(admin.TabularInline):
    model = UserModulePermission
    extra = 1
    autocomplete_fields = ("module",)
    fields = (
        "module",
        "can_add",
        "can_edit",
        "can_delete",
        "can_view",
        "can_print",
        "can_download",
        "is_active",
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "module":
            kwargs["queryset"] = Module.objects.filter(is_active=True).order_by("name", "code")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active")
    search_fields = ("code", "name")


@admin.register(DesignationPermissionProfile)
class DesignationPermissionProfileAdmin(admin.ModelAdmin):
    """
    Choose an existing staff designation, then link RBAC modules below.
    Requires ``staff.Designation`` to be registered in admin (for autocomplete).
    """

    list_display = ("designation",)
    list_select_related = ("designation", "designation__hospital")
    search_fields = ("designation__name", "designation__code", "designation__hospital__name")
    autocomplete_fields = ("designation",)
    inlines = (DesignationModuleInline,)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "designation":
            kwargs["queryset"] = (
                Designation.objects.filter(is_active=True)
                .select_related("hospital")
                .order_by("hospital__name", "name", "code")
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(UserPermissionProfile)
class UserPermissionProfileAdmin(admin.ModelAdmin):
    """
    Choose a user, then link RBAC modules + action flags (same as designation permissions).
    ``accounts.User`` must stay registered in admin for autocomplete on ``user``.
    """

    list_display = ("user",)
    list_select_related = ("user", "user__hospital")
    search_fields = ("user__email", "user__first_name", "user__last_name", "user__phone")
    autocomplete_fields = ("user",)
    inlines = (UserModuleInline,)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "user":
            kwargs["queryset"] = User.objects.filter(is_active=True).order_by("email")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
