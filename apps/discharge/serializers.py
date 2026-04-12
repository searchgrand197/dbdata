from rest_framework import serializers
from apps.discharge.models import DischargeSummary

class DischargeSummarySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="admission.patient.full_name", read_only=True)
    patient_uhid = serializers.CharField(source="admission.patient.uhid", read_only=True)
    admission_date = serializers.DateField(source="admission.admission_date", read_only=True)

    class Meta:
        model = DischargeSummary
        fields = [
            "id",
            "admission",
            "hospital",
            "patient_name",
            "patient_uhid",
            "admission_date",
            "summary_notes",
            "treatment_given",
            "condition_at_discharge",
            "medications_on_discharge",
            "follow_up_advice",
            "total_billed",
            "total_paid",
            "outstanding_balance",
            "created_at",
        ]
        read_only_fields = ["hospital"]
