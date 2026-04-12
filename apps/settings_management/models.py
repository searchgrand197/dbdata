from django.conf import settings
from django.db import models

from apps.shared.models import Hospital, TimeStampedModel, UUIDPrimaryKeyModel


class LeaveApprover(TimeStampedModel, UUIDPrimaryKeyModel):
    """
    Defines who is allowed to approve leave applications for a hospital.
    A hospital can have multiple approvers.
    """

    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name="leave_approvers",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="leave_approver_hospitals",
        help_text="User who is permitted to approve leave requests for this hospital.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Uncheck to temporarily suspend this approver without deleting the record.",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional note (e.g. 'HR Manager', 'Backup approver').",
    )

    class Meta:
        unique_together = [("hospital", "user")]
        verbose_name = "Leave Approver"
        verbose_name_plural = "Leave Approvers"
        ordering = ["hospital__name", "user__email"]

    def __str__(self) -> str:
        return f"{self.user.email} → {self.hospital.name}"
