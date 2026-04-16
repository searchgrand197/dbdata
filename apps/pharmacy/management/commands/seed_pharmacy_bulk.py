import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import Medicine, MedicineBatch, MedicineCategory, StockLedger, Unit
from apps.patients.models import Patient
from apps.pharmacy.models import PharmacyInvoice, PharmacyInvoiceItem
from apps.shared.models import Hospital

User = get_user_model()


class Command(BaseCommand):
    help = "Seed pharmacy bulk demo data (medicines, batches, categories, invoices)."

    def add_arguments(self, parser):
        parser.add_argument("--medicines", type=int, default=100)
        parser.add_argument("--batches", type=int, default=100)
        parser.add_argument("--categories", type=int, default=500)
        parser.add_argument("--invoices", type=int, default=1000)
        parser.add_argument("--hospital-id", type=str, default="")
        parser.add_argument("--hospital-name", type=str, default="")

    @transaction.atomic
    def handle(self, *args, **options):
        med_count = max(0, int(options["medicines"]))
        batch_count = max(0, int(options["batches"]))
        category_count = max(0, int(options["categories"]))
        invoice_count = max(0, int(options["invoices"]))

        hospital_id = (options.get("hospital_id") or "").strip()
        hospital_name = (options.get("hospital_name") or "").strip()

        hospital = None
        if hospital_id:
            hospital = Hospital.objects.filter(id=hospital_id).first()
            if not hospital:
                raise CommandError(f"Hospital id not found: {hospital_id}")
        elif hospital_name:
            hospital = Hospital.objects.filter(name__iexact=hospital_name).first()
            if not hospital:
                raise CommandError(f"Hospital name not found: {hospital_name}")
        else:
            # Predictable default for local dev; avoids seeding into another tenant unexpectedly.
            hospital = Hospital.objects.filter(name__iexact="Default Hospital").first() or Hospital.objects.order_by("name").first()

        if not hospital:
            raise CommandError("No hospital found. Create hospital data first.")

        user = (
            User.objects.filter(hospital_id=hospital.id).first()
            or User.objects.filter(is_superuser=True).first()
            or User.objects.first()
        )
        if not user:
            raise CommandError("No user found. Create at least one user first.")

        unit, _ = Unit.objects.get_or_create(
            hospital_id=hospital.id,
            code="TAB",
            defaults={"name": "Tablet", "is_active": True},
        )

        # 1) Categories
        created_categories = 0
        for i in range(1, category_count + 1):
            _, created = MedicineCategory.objects.get_or_create(
                hospital_id=hospital.id,
                name=f"Category {i:03d}",
                defaults={"is_active": True},
            )
            if created:
                created_categories += 1

        categories = list(MedicineCategory.objects.filter(hospital_id=hospital.id).order_by("name"))
        if not categories:
            c = MedicineCategory.objects.create(hospital_id=hospital.id, name="Category 001", is_active=True)
            categories = [c]

        # 2) Medicines
        medicines = list(Medicine.objects.filter(hospital_id=hospital.id).order_by("name"))
        created_medicines = 0
        for i in range(1, med_count + 1):
            cat = categories[(i - 1) % len(categories)]
            pack_size = random.choice([1, 2, 5, 10, 15, 20])
            default_mrp = Decimal(str(random.randint(30, 300)))
            medicine, created = Medicine.objects.get_or_create(
                hospital_id=hospital.id,
                sku=f"SEED-MED-{i:04d}",
                defaults={
                    "name": f"Seed Medicine {i:03d}",
                    "company_name": f"Company {(i % 25) + 1}",
                    "form": cat.name,
                    "composition": f"Compound {i % 17}",
                    "strength": f"{(i % 9 + 1) * 50}mg",
                    "unit": unit,
                    "hsn_code": "3004",
                    "pack_info": f"1x{pack_size}",
                    "default_mrp": default_mrp,
                    "unit_conversions": {"strip": pack_size},
                    "gst_percent": Decimal("5.00"),
                    "is_active": True,
                },
            )
            if created:
                created_medicines += 1
            medicines.append(medicine)

        if not medicines:
            raise CommandError("No medicines available after seeding.")

        # 3) Batches + opening stock entries
        created_batches = 0
        created_ledger = 0
        for i in range(1, batch_count + 1):
            med = medicines[(i - 1) % len(medicines)]
            batch, created = MedicineBatch.objects.get_or_create(
                hospital_id=hospital.id,
                medicine_id=med.id,
                batch_no=f"SEED-BATCH-{i:04d}",
                defaults={
                    "expiry_date": timezone.localdate() + timedelta(days=180 + i),
                    "mfg_date": timezone.localdate() - timedelta(days=120),
                    "unit_cost": Decimal(str(random.randint(20, 180))),
                    "mrp": med.default_mrp,
                    "sale_rate": med.default_mrp,
                },
            )
            if created:
                created_batches += 1

            # Only add opening stock once for new batches.
            if created:
                qty = Decimal(str(random.randint(20, 250)))
                StockLedger.objects.create(
                    hospital_id=hospital.id,
                    medicine_id=med.id,
                    batch_id=batch.id,
                    qty_change=qty,
                    reason=StockLedger.Reason.STOCK_IN,
                    reference_type="seed",
                    reference_id=f"seed-batch-{i}",
                    created_by=user,
                )
                created_ledger += 1

        batches = list(MedicineBatch.objects.filter(hospital_id=hospital.id).order_by("created_at"))
        if not batches:
            raise CommandError("No batches available after seeding.")

        # 4) Ensure a patient pool exists
        patients = list(Patient.objects.filter(hospital_id=hospital.id)[:200])
        if not patients:
            for i in range(1, 51):
                p = Patient.objects.create(
                    hospital_id=hospital.id,
                    uhid=f"SEED-UHID-{i:04d}",
                    first_name=f"Patient{i:03d}",
                    last_name="Demo",
                    gender=Patient.Gender.OTHER,
                    phone=f"900000{i:04d}"[-10:],
                )
                patients.append(p)

        # 5) Invoices + items
        created_invoices = 0
        created_items = 0
        hospital_tag = str(hospital.id).split("-")[0].upper()
        for i in range(1, invoice_count + 1):
            patient = patients[(i - 1) % len(patients)]
            inv_date = timezone.localdate() - timedelta(days=random.randint(0, 90))
            invoice_no = f"SEED-{hospital_tag}-INV-{timezone.localdate().year}-{i:05d}"
            inv, created = PharmacyInvoice.objects.get_or_create(
                invoice_no=invoice_no,
                defaults={
                    "hospital_id": hospital.id,
                    "patient_id": patient.id,
                    "date": inv_date,
                    "status": PharmacyInvoice.Status.FINALIZED,
                    "gst_enabled": True,
                    "subtotal": Decimal("0.00"),
                    "cgst": Decimal("0.00"),
                    "sgst": Decimal("0.00"),
                    "grand_total": Decimal("0.00"),
                    "created_by": user,
                },
            )
            if not created:
                continue
            created_invoices += 1

            lines = random.randint(1, 3)
            subtotal = Decimal("0.00")
            used = set()
            for li in range(lines):
                b = batches[(i + li) % len(batches)]
                if b.id in used:
                    continue
                used.add(b.id)
                qty = Decimal(str(random.randint(1, 5)))
                rate = b.sale_rate if b.sale_rate and b.sale_rate > 0 else Decimal("50.00")
                amount = (qty * rate).quantize(Decimal("0.01"))
                PharmacyInvoiceItem.objects.create(
                    invoice_id=inv.id,
                    medicine_id=b.medicine_id,
                    batch_id=b.id,
                    qty=qty,
                    mrp=b.mrp or rate,
                    rate=rate,
                    amount=amount,
                    cgst_rate=Decimal("2.50"),
                    sgst_rate=Decimal("2.50"),
                )
                subtotal += amount
                created_items += 1

            gst = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
            half = (gst / Decimal("2")).quantize(Decimal("0.01"))
            inv.subtotal = subtotal
            inv.cgst = half
            inv.sgst = gst - half
            inv.grand_total = subtotal + gst
            inv.save(update_fields=["subtotal", "cgst", "sgst", "grand_total", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Pharmacy bulk seed complete."))
        self.stdout.write(
            f"Created -> categories: {created_categories}, medicines: {created_medicines}, "
            f"batches: {created_batches}, stock_entries: {created_ledger}, "
            f"invoices: {created_invoices}, invoice_items: {created_items}"
        )

