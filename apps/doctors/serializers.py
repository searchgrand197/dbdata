from rest_framework import serializers

from apps.doctors.models import (
    DoctorDailyAvailability,
    DoctorProfile,
    DoctorWeeklySchedule,
    Specialty,
)
from apps.staff.models import Department
from apps.staff.serializers import DepartmentBriefSerializer


class SpecialtySerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_entity = DepartmentBriefSerializer(source="department", read_only=True)

    class Meta:
        model = Specialty
        fields = [
            "id",
            "hospital_id",
            "code",
            "name",
            "department",
            "department_name",
            "department_entity",
            "is_active",
            "created_at",
            "updated_at",
        ]


class SpecialtyCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = ["code", "name", "department", "is_active"]


class DoctorProfileSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    departments_entities = DepartmentBriefSerializer(source="departments", many=True, read_only=True)
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "hospital_id",
            "user",
            "user_email",
            "departments",
            "departments_entities",
            "specialty",
            "specialty_name",
            "doctor_type",
            "doctor_code",
            "name",
            "mobile_number",
            "alternate_mobile_number",
            "address",
            "consultation_fee",
            "is_active",
            "is_deleted",
            "created_at",
            "updated_at",
        ]


class DoctorProfileCreateUpdateSerializer(serializers.ModelSerializer):
    departments = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Department.objects.all()
    )

    class Meta:
        model = DoctorProfile
        fields = [
            "user",
            "departments",
            "specialty",
            "doctor_type",
            "doctor_code",
            "name",
            "mobile_number",
            "alternate_mobile_number",
            "address",
            "consultation_fee",
            "is_active",
        ]


class DoctorWeeklyScheduleSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)

    class Meta:
        model = DoctorWeeklySchedule
        fields = ["id", "hospital_id", "doctor", "doctor_name", "day_of_week", "start_time", "end_time", "slot_minutes", "is_available", "created_at", "updated_at"]


class DoctorWeeklyScheduleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorWeeklySchedule
        fields = ["doctor", "day_of_week", "start_time", "end_time", "slot_minutes", "is_available"]


class DoctorDailyAvailabilitySerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)

    class Meta:
        model = DoctorDailyAvailability
        fields = ["id", "hospital_id", "doctor", "doctor_name", "date", "is_available", "open_from_time", "open_to_time", "closed_reason", "updated_by", "created_at", "updated_at"]


class DoctorDailyAvailabilityCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorDailyAvailability
        fields = ["doctor", "date", "is_available", "open_from_time", "open_to_time", "closed_reason"]

