from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "hospital",
            "recipient",
            "notification_type",
            "title",
            "message",
            "is_read",
            "read_at",
            "reference_type",
            "reference_id",
            "created_at",
        ]
        read_only_fields = ["id", "hospital", "recipient", "created_at"]
