from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.shared.models import Hospital, SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel
from apps.staff.models import Department


class Specialty(TimeStampedModel, UUIDPrimaryKeyModel):
    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="specialties")
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="specialties")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("hospital", "code")]
        indexes = [models.Index(fields=["hospital", "name"])]

    def __str__(self) -> str:
        return self.name


class DoctorProfile(SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel):
    class DoctorType(models.TextChoices):
        CONSULTANT = "consultant"
        VISITING = "visiting"
        RESIDENT = "resident"
        OTHER = "other"

    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="doctor_profiles")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_profiles",
    )

    # A doctor can belong to multiple departments.
    departments = models.ManyToManyField(Department, related_name="doctors")
    specialty = models.ForeignKey(Specialty, on_delete=models.PROTECT, related_name="doctors")
    doctor_type = models.CharField(max_length=20, choices=DoctorType.choices, default=DoctorType.CONSULTANT)

    doctor_code = models.CharField(max_length=80, blank=True, default="")
    name = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=25, blank=True, default="")
    alternate_mobile_number = models.CharField(max_length=25, blank=True, default="")
    address = models.TextField(blank=True, default="")
    consultation_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
        ]

    def __str__(self) -> str:
        return self.name


class DoctorWeeklySchedule(TimeStampedModel, UUIDPrimaryKeyModel):
    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="weekly_schedules")
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="weekly_schedules")
    # Monday=0 ... Sunday=6
    day_of_week = models.PositiveSmallIntegerField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_minutes = models.PositiveIntegerField(default=15)
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = [("hospital", "doctor", "day_of_week", "start_time", "end_time")]
        indexes = [models.Index(fields=["hospital", "doctor", "day_of_week"])]

    def __str__(self) -> str:
        return f"{self.doctor_id} dow={self.day_of_week}"


class DoctorDailyAvailability(TimeStampedModel, UUIDPrimaryKeyModel):
    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="daily_availabilities")
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="daily_availabilities")
    date = models.DateField(db_index=True)
    is_available = models.BooleanField(default=True)
    open_from_time = models.TimeField(null=True, blank=True)
    open_to_time = models.TimeField(null=True, blank=True)
    closed_reason = models.CharField(max_length=300, blank=True, default="")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="availability_updates")

    class Meta:
        unique_together = [("hospital", "doctor", "date")]
        indexes = [models.Index(fields=["hospital", "doctor", "date"])]

    def __str__(self) -> str:
        return f"{self.doctor_id} {self.date}"


def default_doctor_daily_date() -> timezone.datetime.date:
    return timezone.now().date()
