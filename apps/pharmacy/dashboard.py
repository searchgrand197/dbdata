"""
Pharmacy dashboard aggregation API.

GET /api/v1/pharmacy/dashboard/?gst=1&date_from=2026-04-01&date_to=2026-04-13

Returns:
  { sales, purchase, stock, customers, cash }
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import MedicineBatch, StockLedger
from apps.pharmacy.models import PharmacyInvoice, PharmacyPurchaseChallan
from apps.shared.response import success_response

ZERO = Decimal("0")


def _parse_dates(params):
    raw_from = (params.get("date_from") or "").strip()
    raw_to = (params.get("date_to") or "").strip()
    date_to = parse_date(raw_to) if raw_to else timezone.now().date()
    date_from = parse_date(raw_from) if raw_from else date_to - timedelta(days=29)
    return date_from, date_to


def _prev_range(date_from, date_to):
    span = (date_to - date_from).days + 1
    return date_from - timedelta(days=span), date_from - timedelta(days=1)


def _sales_block(hospital_id, date_from, date_to, gst):
    qs = PharmacyInvoice.objects.filter(
        hospital_id=hospital_id,
        status=PharmacyInvoice.Status.FINALIZED,
    )
    current_qs = qs.filter(date__gte=date_from, date__lte=date_to)

    if gst:
        total = current_qs.aggregate(s=Sum("grand_total"))["s"] or ZERO
    else:
        total = current_qs.aggregate(s=Sum("subtotal"))["s"] or ZERO

    prev_from, prev_to = _prev_range(date_from, date_to)
    prev_qs = qs.filter(date__gte=prev_from, date__lte=prev_to)
    if gst:
        prev_total = prev_qs.aggregate(s=Sum("grand_total"))["s"] or ZERO
    else:
        prev_total = prev_qs.aggregate(s=Sum("subtotal"))["s"] or ZERO

    growth = None
    if prev_total:
        growth = float(((total - prev_total) / prev_total) * 100)

    trend_field = "grand_total" if gst else "subtotal"
    day_agg = (
        current_qs.values("date")
        .annotate(amount=Sum(trend_field))
        .order_by("date")
    )
    trend = [{"date": str(r["date"]), "amount": float(r["amount"])} for r in day_agg]

    return {"total": float(total), "growth": growth, "trend": trend}


def _purchase_block(hospital_id, date_from, date_to):
    qs = PharmacyPurchaseChallan.objects.filter(hospital_id=hospital_id)
    current_qs = qs.filter(purchase_date__gte=date_from, purchase_date__lte=date_to)
    total = current_qs.aggregate(s=Sum("total_amount"))["s"] or ZERO

    prev_from, prev_to = _prev_range(date_from, date_to)
    prev_total = qs.filter(
        purchase_date__gte=prev_from, purchase_date__lte=prev_to,
    ).aggregate(s=Sum("total_amount"))["s"] or ZERO

    growth = None
    if prev_total:
        growth = float(((total - prev_total) / prev_total) * 100)

    day_agg = (
        current_qs.values("purchase_date")
        .annotate(amount=Sum("total_amount"))
        .order_by("purchase_date")
    )
    trend = [{"date": str(r["purchase_date"]), "amount": float(r["amount"])} for r in day_agg]

    return {"total": float(total), "growth": growth, "trend": trend}


def _stock_block(hospital_id):
    batches = MedicineBatch.objects.filter(hospital_id=hospital_id)
    ledger = (
        StockLedger.objects.filter(hospital_id=hospital_id)
        .values("batch_id")
        .annotate(qty=Sum("qty_change"))
    )
    qty_map = {str(r["batch_id"]): r["qty"] or ZERO for r in ledger}

    purchase_value = ZERO
    mrp_value = ZERO
    sale_value = ZERO

    for b in batches.only("id", "unit_cost", "mrp", "sale_rate"):
        qty = qty_map.get(str(b.id), ZERO)
        if qty <= 0:
            continue
        purchase_value += qty * b.unit_cost
        mrp_value += qty * b.mrp
        sale_value += qty * b.sale_rate

    return {
        "purchase_value": float(purchase_value),
        "mrp_value": float(mrp_value),
        "sale_value": float(sale_value),
    }


def _customers_block(hospital_id, date_from, date_to, gst):
    qs = PharmacyInvoice.objects.filter(
        hospital_id=hospital_id,
        status=PharmacyInvoice.Status.FINALIZED,
        date__gte=date_from,
        date__lte=date_to,
    )
    patient_ids = set(qs.values_list("patient_id", flat=True))
    total = len(patient_ids)
    if not total:
        return {"total": 0, "new": 0, "repeat": 0, "avg_order_value": 0}

    returning = PharmacyInvoice.objects.filter(
        hospital_id=hospital_id,
        status=PharmacyInvoice.Status.FINALIZED,
        date__lt=date_from,
        patient_id__in=patient_ids,
    ).values_list("patient_id", flat=True).distinct()
    repeat_ids = set(returning)
    repeat_count = len(repeat_ids & patient_ids)
    new_count = total - repeat_count

    total_field = "grand_total" if gst else "subtotal"
    total_rev = qs.aggregate(s=Sum(total_field))["s"] or ZERO
    inv_count = qs.count() or 1
    avg_order = float(total_rev / inv_count)

    return {
        "total": total,
        "new": new_count,
        "repeat": repeat_count,
        "avg_order_value": round(avg_order, 2),
    }


def _cash_block(hospital_id, date_from, date_to):
    """Approximate cash breakdown from invoices (placeholder for real payment method tracking)."""
    qs = PharmacyInvoice.objects.filter(
        hospital_id=hospital_id,
        status=PharmacyInvoice.Status.FINALIZED,
        date__gte=date_from,
        date__lte=date_to,
    )
    total = float(qs.aggregate(s=Sum("grand_total"))["s"] or ZERO)
    return {
        "total": total,
        "cash": total,
        "online": 0,
        "cheque": 0,
    }


class PharmacyDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        hospital = getattr(request.user, "hospital", None)
        if hospital is None:
            return Response(
                {"success": False, "detail": "Hospital context required."},
                status=400,
            )
        hospital_id = hospital.id
        date_from, date_to = _parse_dates(request.query_params)
        gst = request.query_params.get("gst", "1") == "1"

        data = {
            "sales": _sales_block(hospital_id, date_from, date_to, gst),
            "purchase": _purchase_block(hospital_id, date_from, date_to),
            "stock": _stock_block(hospital_id),
            "customers": _customers_block(hospital_id, date_from, date_to, gst),
            "cash": _cash_block(hospital_id, date_from, date_to),
        }
        return success_response(data)
