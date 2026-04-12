from __future__ import annotations

from rest_framework import serializers

from apps.inventory.models import Medicine, MedicineBatch, MedicineReorderRule, StockLedger, Unit


class UnitSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Unit
        fields = ["id", "hospital_id", "code", "name", "is_active", "created_at", "updated_at"]


class UnitCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ["code", "name", "is_active"]


class MedicineSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)

    class Meta:
        model = Medicine
        fields = ["id", "hospital_id", "sku", "name", "form", "strength", "unit", "unit_name", "hsn_code", "pack_info", "is_active", "created_at", "updated_at"]


class MedicineCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = ["sku", "name", "form", "strength", "unit", "hsn_code", "pack_info", "is_active"]


class MedicineBatchSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)

    class Meta:
        model = MedicineBatch
        fields = [
            "id",
            "hospital_id",
            "medicine",
            "medicine_name",
            "batch_no",
            "expiry_date",
            "mfg_date",
            "unit_cost",
            "mrp",
            "sale_rate",
            "created_at",
            "updated_at",
        ]


class MedicineBatchCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineBatch
        fields = ["medicine", "batch_no", "expiry_date", "mfg_date", "unit_cost", "mrp", "sale_rate"]


class StockLedgerSerializer(serializers.ModelSerializer):
    hospital_id = serializers.UUIDField(read_only=True)
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    batch_no = serializers.CharField(source="batch.batch_no", read_only=True)

    class Meta:
        model = StockLedger
        fields = [
            "id",
            "hospital_id",
            "medicine",
            "medicine_name",
            "batch",
            "batch_no",
            "qty_change",
            "reason",
            "reference_type",
            "reference_id",
            "created_by",
            "created_at",
        ]


class StockLedgerCreateSerializer(serializers.Serializer):
    medicine = serializers.UUIDField()
    batch = serializers.UUIDField()
    reason = serializers.ChoiceField(choices=[c[0] for c in StockLedger.Reason.choices])
    qty_change = serializers.DecimalField(max_digits=12, decimal_places=3)
    reference_type = serializers.CharField(required=False, allow_blank=True, default="")
    reference_id = serializers.CharField(required=False, allow_blank=True, default="")

