from __future__ import annotations

from apps.notifications.models import Notification


def send_notification(
    hospital_id,
    recipient,
    notification_type: str,
    title: str,
    message: str = "",
    reference_type: str = "",
    reference_id: str = "",
):
    return Notification.objects.create(
        hospital_id=hospital_id,
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        reference_type=reference_type,
        reference_id=reference_id,
    )


def notify_treatment_assigned(hospital_id, recipient, patient_name: str, plan_name: str, plan_id: str):
    return send_notification(
        hospital_id=hospital_id,
        recipient=recipient,
        notification_type=Notification.NType.TREATMENT_ASSIGNED,
        title=f"Treatment Plan assigned: {patient_name}",
        message=f"You have been assigned to treatment plan '{plan_name}' for patient {patient_name}.",
        reference_type="treatment_plan",
        reference_id=str(plan_id),
    )


def notify_treatment_updated(hospital_id, recipient, patient_name: str, plan_name: str, plan_id: str):
    return send_notification(
        hospital_id=hospital_id,
        recipient=recipient,
        notification_type=Notification.NType.TREATMENT_UPDATED,
        title=f"Treatment Plan updated: {patient_name}",
        message=f"Treatment plan '{plan_name}' for patient {patient_name} has been updated.",
        reference_type="treatment_plan",
        reference_id=str(plan_id),
    )


def notify_package_assigned(hospital_id, recipient, patient_name: str, package_name: str, plan_id: str):
    return send_notification(
        hospital_id=hospital_id,
        recipient=recipient,
        notification_type=Notification.NType.PACKAGE_ASSIGNED,
        title=f"Package assigned: {package_name}",
        message=f"Package '{package_name}' assigned to patient {patient_name}.",
        reference_type="treatment_plan",
        reference_id=str(plan_id),
    )
