from django.contrib.auth import password_validation
from django.contrib.auth.hashers import check_password
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.accounts.models import User


class UserProfileSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "full_name",
            "hospital_id",
            "is_staff",
            "is_superuser",
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["phone", "first_name", "last_name"]


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user: User = self.context["request"].user

        old_password = attrs.get("old_password")
        if not check_password(old_password, user.password):
            raise serializers.ValidationError({"old_password": _("Old password is incorrect.")})

        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError({"confirm_password": _("Passwords do not match.")})

        password_validation.validate_password(new_password, user=user)
        return attrs

