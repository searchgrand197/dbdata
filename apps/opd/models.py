from django.conf import settings
from django.db import models

from apps.patients.models import Patient
from apps.shared.models import Hospital, SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel


class OPDVisit(SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel):
    class Status(models.TextChoices):
        WAITING = "waiting"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        CANCELLED = "cancelled"

    class PaymentMode(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"
        OTHER = "other", "Other"

    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="opd_visits")
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="opd_visits")

    visit_date = models.DateField()
    queue_number = models.PositiveIntegerField(default=0, db_index=True)

    doctor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="opd_visits_as_doctor",
    )

    visit_reason = models.TextField(blank=True, default="")
    symptoms = models.TextField(blank=True, default="")
    vitals = models.JSONField(default=dict, blank=True)

    consultation_notes = models.TextField(blank=True, default="")
    diagnosis = models.TextField(blank=True, default="")
    test_recommendations = models.TextField(blank=True, default="")
    revisit_advice = models.TextField(blank=True, default="")
    follow_up_date = models.DateField(null=True, blank=True, db_index=True)
    follow_up_completed = models.BooleanField(default=False, db_index=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices, default=PaymentMode.CASH, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["hospital", "visit_date"]),
            models.Index(fields=["hospital", "doctor_user", "visit_date"]),
            models.Index(fields=["patient", "visit_date"]),
        ]

    def __str__(self) -> str:
        return f"OPD {self.patient.uhid} ({self.visit_date})"


class OPDVisitStatusHistory(TimeStampedModel, UUIDPrimaryKeyModel):
    visit = models.ForeignKey(OPDVisit, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="opd_status_changes",
    )

    notes = models.TextField(blank=True, default="")

