from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.pharmacy.calculations import normalize_gst_type
from apps.pharmacy.models import PharmacyInvoice, PharmacyInvoiceItem, PharmacyOutletSettings, PharmacySupplier
from apps.patients.serializers import PatientSerializer
from apps.doctors.serializers import DoctorProfileSerializer


class PharmacyOutletSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyOutletSettings
        fields = (
            "id",
            "business_name",
            "address",
            "mobile",
            "gst_number",
            "dl_number",
            "email",
            "website",
            "default_gst_percent",
            "created_at",
            "updated_at",
        )


class PharmacyInvoiceItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source="medicine.name")
    batch_no = serializers.ReadOnlyField(source="batch.batch_no")
    expiry_date = serializers.ReadOnlyField(source="batch.expiry_date")
    
    class Meta:
        model = PharmacyInvoiceItem
        fields = (
            "id", "invoice", "medicine", "medicine_name", "batch", "batch_no", "expiry_date", 
            "qty", "mrp", "rate", "cgst_rate", "sgst_rate", "amount"
        )

    def validate(self, attrs):
        batch = attrs.get("batch") or getattr(self.instance, "batch", None)
        if batch and batch.expiry_date and batch.expiry_date < timezone.now().date():
            raise serializers.ValidationError({"batch": ["This batch is expired and cannot be sold."]})
        inv = attrs.get("invoice")
        if inv is None and getattr(self.instance, "invoice_id", None):
            inv = self.instance.invoice
        gst_on = True
        if inv is not None:
            if isinstance(inv, PharmacyInvoice):
                gst_on = inv.gst_enabled
            else:
                ge = PharmacyInvoice.objects.filter(pk=inv).values_list("gst_enabled", flat=True).first()
                gst_on = ge if ge is not None else True
        if not gst_on:
            attrs = {**attrs, "cgst_rate": Decimal("0"), "sgst_rate": Decimal("0")}
        return attrs


class PharmacyInvoiceSerializer(serializers.ModelSerializer):
    items = PharmacyInvoiceItemSerializer(many=True, read_only=True)
    patient_details = PatientSerializer(source="patient", read_only=True)
    doctor_details = DoctorProfileSerializer(source="referred_by", read_only=True)

    def validate(self, attrs: dict) -> dict:
        gst_on = attrs.get("gst_enabled")
        if gst_on is None and self.instance is not None:
            gst_on = self.instance.gst_enabled
        if gst_on is False:
            attrs["cgst"] = Decimal("0")
            attrs["sgst"] = Decimal("0")
        return attrs

    class Meta:
        model = PharmacyInvoice
        fields = (
            "id",
            "patient",
            "patient_details",
            "referred_by",
            "doctor_details",
            "invoice_no",
            "date",
            "status",
            "gst_enabled",
            "subtotal",
            "total_discount",
            "cgst",
            "sgst",
            "grand_total",
            "remarks",
            "items",
            "created_at",
        )
        extra_kwargs = {
            # Generated in PharmacyInvoiceViewSet.perform_create if omitted.
            "invoice_no": {"required": False, "allow_blank": True},
        }


class PharmacySupplierSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = PharmacySupplier
        fields = (
            "id",
            "hospital_id",
            "name",
            "phone",
            "gst_number",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "hospital_id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["hospital_id"] = self.context["request"].user.hospital_id
        return super().create(validated_data)


class PurchaseChallanLineSerializer(serializers.Serializer):
    medicine = serializers.UUIDField()
    batch_no = serializers.CharField(max_length=80)
    expiry_date = serializers.DateField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3)
    # pack: quantity = strips/boxes; total_qty = quantity × conversion (tablets). base: quantity = tablets; conversion ignored.
    quantity_basis = serializers.ChoiceField(choices=["pack", "base"], default="pack")
    pack_type = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    conversion = serializers.DecimalField(max_digits=14, decimal_places=3, required=False, default=Decimal("1"))
    rate_type = serializers.ChoiceField(
        choices=["STRIP", "TABLET"],
        required=False,
        allow_null=True,
        default=None,
    )
    purchase_rate = serializers.DecimalField(max_digits=14, decimal_places=2)
    mrp = serializers.DecimalField(max_digits=14, decimal_places=2)
    sale_rate = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    gst_type = serializers.CharField(required=False, default="exclusive")
    gst_percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    discount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal("0"))
    skip_gst = serializers.BooleanField(required=False, default=False)
    no_gst = serializers.BooleanField(required=False, default=False)

    def validate_gst_percent(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("GST % cannot be negative.")
        return value

    def validate(self, attrs):
        attrs["gst_type"] = normalize_gst_type(attrs.get("gst_type"))
        if attrs.get("skip_gst") or attrs.get("no_gst"):
            attrs["no_gst"] = True
        return attrs


class PurchaseChallanSerializer(serializers.Serializer):
    supplier_id = serializers.UUIDField(required=False, allow_null=True)
    invoice_no = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    purchase_date = serializers.DateField(required=False)
    payment_type = serializers.ChoiceField(choices=["cash", "credit"], required=False, default="cash")
    gst_enabled = serializers.BooleanField(required=False, default=True)
    lines = PurchaseChallanLineSerializer(many=True)

    def validate(self, attrs):
        if not attrs.get("purchase_date"):
            attrs["purchase_date"] = timezone.now().date()
        attrs.setdefault("payment_type", "cash")
        attrs.setdefault("invoice_no", "")
        sid = attrs.get("supplier_id")
        if sid is not None:
            user = self.context["request"].user
            hid = getattr(user, "hospital_id", None)
            if hid and not PharmacySupplier.objects.filter(pk=sid, hospital_id=hid, is_active=True).exists():
                raise serializers.ValidationError({"supplier_id": ["Invalid supplier for this hospital."]})
        return attrs

    def validate_lines(self, lines):
        if not lines:
            raise serializers.ValidationError("At least one line is required.")
        return lines
