from django.db import models
from apps.ipd.models import IPDAdmission
from apps.shared.models import Hospital, SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel


class DischargeSummary(SoftDeleteModel, TimeStampedModel, UUIDPrimaryKeyModel):
    admission = models.OneToOneField(IPDAdmission, on_delete=models.CASCADE, related_name="discharge_summary")
    hospital = models.ForeignKey(Hospital, on_delete=models.PROTECT, related_name="discharge_summaries")

    summary_notes = models.TextField(blank=True, default="")
    treatment_given = models.TextField(blank=True, default="")
    condition_at_discharge = models.TextField(blank=True, default="")
    medications_on_discharge = models.TextField(blank=True, default="")
    follow_up_advice = models.TextField(blank=True, default="")
    
    # Financial capture at the moment of discharge (snapshot)
    total_billed = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    outstanding_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self) -> str:
        return f"Summary for {self.admission.patient.uhid}"
