from django.utils import timezone

from apps.patients.models import Patient, UHIDSequence
from apps.shared.models import Hospital


def generate_uhid(hospital: Hospital) -> str:
    """
    Generates a hospital-scoped UHID with a short prefix and 4‑digit sequence:
      <XXX>-<SEQ(4)>

    Where:
    - XXX is derived from the hospital slug (first 3 characters, uppercased),
      e.g. "varun-hospital" -> "VAR"
    - SEQ(4) is a zero-padded running number per hospital+year (for uniqueness),
      but the year itself is not shown in the UHID.
    """

    now = timezone.now()
    year = now.year

    seq, _ = UHIDSequence.objects.select_for_update().get_or_create(hospital=hospital, year=year)
    seq.last_seq += 1
    seq.save(update_fields=["last_seq"])

    prefix = (hospital.slug or "").upper()[:3] or "HOS"
    return f"{prefix}-{seq.last_seq:04d}"


def patient_scoped_by_hospital(patient: Patient, hospital: Hospital) -> bool:
    return patient.hospital_id == hospital.id

