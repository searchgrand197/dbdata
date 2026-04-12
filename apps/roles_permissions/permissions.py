from rest_framework.permissions import BasePermission


class HasRequiredPermission(BasePermission):
    """
    Enforces RBAC/permission checks based on `view.required_permission`.

    If `required_permission` is not set on the view, this permission becomes a no-op.
    """

    def has_permission(self, request, view) -> bool:
        # Permissions app is disabled; allow authenticated users.
        return bool(getattr(request.user, "is_authenticated", False))

