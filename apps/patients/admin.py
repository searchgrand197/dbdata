from django.contrib import admin

from apps.patients.models import (
    Allergy,
    ChronicDisease,
    EmergencyContact,
    Patient,
    PatientActivity,
    PatientAddress,
    PatientFamilyGroup,
    PatientGuardian,
    PatientTag,
    PatientTagAssignment,
    UHIDSequence,
)


@admin.register(PatientFamilyGroup)
class PatientFamilyGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "hospital", "is_active")
    search_fields = ("name", "code")


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("uhid", "first_name", "last_name", "phone", "hospital", "status", "created_at")
    list_filter = ("status", "hospital", "gender")
    search_fields = ("uhid", "phone", "first_name", "last_name", "email")


@admin.register(PatientAddress)
class PatientAddressAdmin(admin.ModelAdmin):
    list_display = ("patient", "city", "state")


@admin.register(PatientGuardian)
class PatientGuardianAdmin(admin.ModelAdmin):
    list_display = ("patient", "name", "relationship", "phone")


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ("patient", "name", "phone")


@admin.register(PatientTag)
class PatientTagAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "hospital")


@admin.register(PatientTagAssignment)
class PatientTagAssignmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "tag", "assigned_at")


@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ("patient", "allergy", "severity")


@admin.register(ChronicDisease)
class ChronicDiseaseAdmin(admin.ModelAdmin):
    list_display = ("patient", "disease")


@admin.register(PatientActivity)
class PatientActivityAdmin(admin.ModelAdmin):
    list_display = ("patient", "activity_type", "actor", "created_at")
    list_filter = ("activity_type",)


@admin.register(UHIDSequence)
class UHIDSequenceAdmin(admin.ModelAdmin):
    list_display = ("hospital", "year", "last_seq")
