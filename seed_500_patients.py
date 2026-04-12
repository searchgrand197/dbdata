import os
import django
import random
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.opd.models import OPDVisit
from apps.patients.models import Patient
from apps.shared.models import Hospital
from django.contrib.auth import get_user_model

User = get_user_model()
hospital = Hospital.objects.first()
doctor = User.objects.first()

first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
reasons = ["Fever and chills", "Persistent Cough", "Severe Headache", "Body ache", "Follow up visit", "Routine checkup", "Stomach pain", "Back pain", "Common Cold", "Flu symptoms", "Allergic reaction", "Minor cut", "Joint pain", "High blood pressure", "Diabetes check"]

print("Starting to add 500 random patients...")

for i in range(1, 501):
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    # Ensure phone is somewhat unique
    phone = f"+1{random.randint(100, 999)}{random.randint(1000000, 9999999)}"
    reason = random.choice(reasons)
    
    # Generate unique uhid
    uhid = f"UHID-TEST-500-{i}-{random.randint(1000, 9999)}"
    
    female_names = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"]
    gender = "female" if fname in female_names else "male"
    
    patient = Patient.objects.create(
        hospital=hospital,
        uhid=uhid,
        first_name=fname,
        last_name=lname,
        phone=phone,
        gender=gender,
        dob="1985-06-20"
    )
    
    OPDVisit.objects.create(
        hospital=hospital,
        patient=patient,
        doctor_user=doctor,
        visit_date=date.today(),
        queue_number=100 + i,
        visit_reason=reason,
        status="waiting"
    )

print("Successfully generated 500 users and their OPD visits!")
