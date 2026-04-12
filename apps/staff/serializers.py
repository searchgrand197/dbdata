from rest_framework import serializers

from apps.staff.models import (
    Department,
    Designation,
    EmergencyContact,
    Shift,
    StaffAvailabilityOverride,
    StaffIDProof,
    StaffProfile,
    StaffShiftAssignment,
)


class DepartmentSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Department
        fields = [
            "id",
            "hospital_id",
            "code",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]


class DepartmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["code", "name", "description", "is_active"]


class DepartmentBriefSerializer(serializers.ModelSerializer):
    """
    Lightweight department representation for nesting on other resources (e.g. doctors, specialties).
    """

    class Meta:
        model = Department
        fields = ["id", "code", "name", "description", "is_active"]


class DesignationSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Designation
        fields = ["id", "hospital_id", "code", "name", "is_active", "created_at", "updated_at"]


class DesignationCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = ["code", "name", "is_active"]


class ShiftSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Shift
        fields = ["id", "hospital_id", "name", "start_time", "end_time", "is_active", "created_at", "updated_at"]


class ShiftCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ["name", "start_time", "end_time", "is_active"]


class StaffProfileSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation_name = serializers.CharField(source="designation.name", read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "hospital_id",
            "user",
            "user_email",
            "department",
            "department_name",
            "designation",
            "designation_name",
            "employee_code",
            "first_name",
            "last_name",
            "phone",
            "address",
            "joining_date",
            "employment_status",
            "is_deleted",
            "created_at",
            "updated_at",
        ]


class StaffProfileCreateUpdateSerializer(serializers.ModelSerializer):
    # Optional email used when auto-creating a user for this staff profile.
    email = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = StaffProfile
        fields = [
            "user",
            "department",
            "designation",
            "employee_code",
            "first_name",
            "last_name",
            "phone",
            "address",
            "joining_date",
            "employment_status",
            "email",
        ]


class EmergencyContactSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(source="staff.hospital_id", read_only=True)

    class Meta:
        model = EmergencyContact
        fields = [
            "id",
            "hospital_id",
            "staff",
            "name",
            "relationship",
            "phone",
            "notes",
            "created_at",
            "updated_at",
        ]


class EmergencyContactCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ["staff", "name", "relationship", "phone", "notes"]


class StaffIDProofSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(source="staff.hospital_id", read_only=True)

    class Meta:
        model = StaffIDProof
        fields = [
            "id",
            "hospital_id",
            "staff",
            "proof_type",
            "number",
            "issued_at",
            "expires_at",
            "document_metadata",
        ]


class StaffShiftAssignmentSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    staff_employee_code = serializers.CharField(source="staff.employee_code", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)

    class Meta:
        model = StaffShiftAssignment
        fields = [
            "id",
            "hospital_id",
            "staff",
            "staff_employee_code",
            "date",
            "end_date",
            "shift",
            "shift_name",
            "status",
            "assigned_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["assigned_by", "hospital_id"]


class StaffShiftAssignmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffShiftAssignment
        fields = ["staff", "date", "end_date", "shift", "status"]


class StaffAvailabilityOverrideSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    staff_employee_code = serializers.CharField(source="staff.employee_code", read_only=True)

    class Meta:
        model = StaffAvailabilityOverride
        fields = [
            "id",
            "hospital_id",
            "staff",
            "staff_employee_code",
            "date",
            "is_available",
            "notes",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["updated_by", "hospital_id"]


class StaffAvailabilityOverrideCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffAvailabilityOverride
        fields = ["staff", "date", "is_available", "notes"]

