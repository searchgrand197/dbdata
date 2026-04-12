from django.conf import settings
from django.db import models

from apps.opd.models import OPDVisit
from apps.patients.models import Patient
from apps.shared.models import Hospital, SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel


class IPDAdmission(SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel):
    class Status(models.TextChoices):
        ADMITTED = "admitted"
        TRANSFERRED = "transferred"
        DISCHARGED = "discharged"
        CANCELLED = "cancelled"

    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="ipd_admissions")
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="ipd_admissions")

    opd_visit = models.ForeignKey(
        OPDVisit, null=True, blank=True, on_delete=models.SET_NULL, related_name="ipd_conversions"
    )

    admission_date = models.DateField()
    expected_discharge_date = models.DateField(null=True, blank=True)

    assigned_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ipd_admissions_as_doctor",
    )
    assigned_nurse = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ipd_admissions_as_nurse",
    )

    ward_name = models.CharField(max_length=200, blank=True, default="")
    room_name = models.CharField(max_length=200, blank=True, default="")
    bed_code = models.CharField(max_length=100, blank=True, default="")

    admission_diagnosis = models.TextField(blank=True, default="")
    admission_notes = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ADMITTED, db_index=True)

    discharged_at = models.DateTimeField(null=True, blank=True)
    discharge_notes = models.TextField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["hospital", "admission_date"]),
            models.Index(fields=["hospital", "assigned_doctor", "admission_date"]),
            models.Index(fields=["patient", "admission_date"]),
        ]

    def __str__(self) -> str:
        return f"IPD {self.patient.uhid} ({self.admission_date})"


class IPDAdmissionStatusHistory(TimeStampedModel, UUIDPrimaryKeyModel):
    admission = models.ForeignKey(IPDAdmission, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    notes = models.TextField(blank=True, default="")

    class Meta:
        indexes = [models.Index(fields=["admission", "to_status"])]


class IPDTransferHistory(TimeStampedModel, UUIDPrimaryKeyModel):
    admission = models.ForeignKey(IPDAdmission, on_delete=models.CASCADE, related_name="transfer_history")

    from_ward_name = models.CharField(max_length=200, blank=True, default="")
    to_ward_name = models.CharField(max_length=200, blank=True, default="")
    from_room_name = models.CharField(max_length=200, blank=True, default="")
    to_room_name = models.CharField(max_length=200, blank=True, default="")
    from_bed_code = models.CharField(max_length=100, blank=True, default="")
    to_bed_code = models.CharField(max_length=100, blank=True, default="")

    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    notes = models.TextField(blank=True, default="")

