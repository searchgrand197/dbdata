from rest_framework import permissions
from rest_framework.views import APIView

from apps.roles_permissions.effective_permissions import permission_codes_for_user
from apps.shared.response import success_response


class MyPermissionsView(APIView):
    """
    Returns permission codes derived from the user's module access
    (Users permissions + designation module links on linked staff profile).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        codes = permission_codes_for_user(request.user)
        return success_response(data={"permissions": codes})
