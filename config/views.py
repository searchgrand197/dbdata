"""
Browser-facing pages (API console, etc.).
"""

from django.views.generic import TemplateView

from apps.shared.hospital_themes import get_hospital_theme


class ApiConsoleView(TemplateView):
    """
    HMS-branded Swagger UI for exploring and testing all REST endpoints.
    Served at ``/api/v1/docs/``.
    """

    template_name = "api_console.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        req = self.request

        hospital = None
        if getattr(req, "user", None) is not None and getattr(req.user, "is_authenticated", False):
            # User.hospital is optional; tenant scoping is handled in API endpoints.
            hospital = getattr(req.user, "hospital", None)

        hospital_name = getattr(hospital, "name", None) or "HMS"
        hospital_slug = getattr(hospital, "slug", None)
        theme = get_hospital_theme(hospital_slug)

        # Short badge mark (e.g. `HMS`, `SUN`, etc.).
        brand_mark = "".join([p[0] for p in hospital_name.split() if p])[:3].upper() or "HMS"

        ctx["hospital_name"] = hospital_name
        ctx["brand_mark"] = brand_mark
        ctx["theme"] = theme

        # Relative URL works with Swagger; absolute helps if proxies rewrite paths.
        ctx["schema_path"] = "/api/v1/schema/"
        ctx["schema_url"] = req.build_absolute_uri("/api/v1/schema/")
        ctx["login_path"] = "/api/v1/auth/login/"
        ctx["admin_url"] = "/admin/"
        return ctx


class FieldPermissionMatrixPageView(TemplateView):
    """Browser UI for per-field Create/Read/Update matrix (JWT in page)."""

    template_name = "field_permissions/matrix.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["api_base"] = "/api/v1"
        return ctx
