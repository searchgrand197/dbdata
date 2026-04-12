"""
Map ``UserModulePermission`` / ``DesignationModulePermission`` rows to ``Permission`` codes.
Used for ``/api/v1/auth/me/permissions/`` and any server-side checks that mirror that list.
"""

from __future__ import annotations

from apps.roles_permissions.models import (
    DesignationPermissionProfile,
    Permission,
    UserPermissionProfile,
)
from apps.staff.models import StaffProfile


def _codes_from_module_link(link) -> set[str]:
    """``link`` is a ``UserModulePermission`` or ``DesignationModulePermission`` (same flags)."""
    if not link.is_active:
        return set()
    module = link.module
    actions: list[str] = []
    if link.can_view:
        actions.append(Permission.Actions.VIEW)
    if link.can_add:
        actions.append(Permission.Actions.CREATE)
    if link.can_edit:
        actions.append(Permission.Actions.UPDATE)
    if link.can_delete:
        actions.append(Permission.Actions.DELETE)
    if link.can_print:
        actions.append(Permission.Actions.PRINT)
    if link.can_download:
        actions.append(Permission.Actions.EXPORT)
    if not actions:
        return set()
    return set(
        Permission.objects.filter(module=module, action__in=actions, is_active=True).values_list(
            "code", flat=True
        )
    )


def permission_codes_for_user(user) -> list[str]:
    if getattr(user, "is_superuser", False):
        return sorted(Permission.objects.filter(is_active=True).values_list("code", flat=True))

    codes: set[str] = set()

    try:
        uprofile = user.rbac_module_profile
    except UserPermissionProfile.DoesNotExist:
        pass
    else:
        qs = uprofile.module_links.filter(is_active=True).select_related("module")
        for link in qs:
            codes.update(_codes_from_module_link(link))

    staff_qs = StaffProfile.objects.filter(user_id=user.id, is_deleted=False).select_related("designation")
    for staff in staff_qs:
        if not staff.designation_id:
            continue
        dprofile = DesignationPermissionProfile.objects.filter(designation_id=staff.designation_id).first()
        if not dprofile:
            continue
        for link in dprofile.module_links.filter(is_active=True).select_related("module"):
            codes.update(_codes_from_module_link(link))

    return sorted(codes)
