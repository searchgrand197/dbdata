from config.settings_common import *  # noqa


DEBUG = True
ALLOWED_HOSTS = ["*"]

# For local development, allow all origins unless the user explicitly configures CORS.
CORS_ALLOW_ALL_ORIGINS = True

# Useful when password-reset APIs send emails (optional for this API-only project).
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

