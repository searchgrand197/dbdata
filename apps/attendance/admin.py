from django.contrib import admin
from django import forms
from django.http import HttpResponseRedirect
from django.urls import path
from django.utils import timezone

from apps.attendance.models import (
    AttendanceRegularization,
    LeaveApplication,
    MonthlyEarnedLeaveAllocation,
    StaffDailyAttendance,
    StaffLeaveBalance,
)
from apps.attendance.services import auto_mark_unmarked_as_pending_regularization


@admin.register(StaffDailyAttendance)
class StaffDailyAttendanceAdmin(admin.ModelAdmin):
    list_display = ("staff", "attendance_date", "status", "check_in_at", "check_out_at", "hospital")
    list_filter = ("hospital", "status", "attendance_date")
    search_fields = ("staff__employee_code", "staff__first_name", "staff__last_name")
    actions: list[str] = []
    change_list_template = "admin/attendance/staffdailyattendance/change_list.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "run-auto-pending-regularization/",
                self.admin_site.admin_view(self.run_auto_job_view),
                name="attendance_staffdailyattendance_run_job",
            ),
        ]
        return custom_urls + urls

    def run_auto_job_view(self, request):
        processed = auto_mark_unmarked_as_pending_regularization()
        yesterday = timezone.localdate() - timezone.timedelta(days=1)
        self.message_user(
            request,
            f"Auto-marked {processed} staff as pending regularization for {yesterday}.",
        )
        # Redirect back to the changelist.
        return HttpResponseRedirect("../")


@admin.register(AttendanceRegularization)
class AttendanceRegularizationAdmin(admin.ModelAdmin):
    list_display = ("staff", "attendance_date", "status", "created_at")
    list_filter = ("hospital", "status")


@admin.register(LeaveApplication)
class LeaveApplicationAdmin(admin.ModelAdmin):
    list_display = ("staff", "leave_type", "start_date", "end_date", "total_days", "status")
    list_filter = ("hospital", "leave_type", "status")


@admin.register(MonthlyEarnedLeaveAllocation)
class MonthlyEarnedLeaveAllocationAdmin(admin.ModelAdmin):
    list_display = ("hospital", "year", "month", "designation", "earned_days", "is_applied")
    list_filter = ("hospital", "year", "month", "is_applied")
    change_list_template = "admin/attendance/monthlyearnedleaveallocation/change_list.html"

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "yearly-planner/",
                self.admin_site.admin_view(self.yearly_planner_view),
                name="attendance_yearly_earned_leave_planner",
            ),
        ]
        return custom + urls

    def yearly_planner_view(self, request):
        """
        Render a simple grid: designations x 12 months for a given year.
        Admin can quickly set earned_days per month for each designation.
        """
        from datetime import date as dt_date
        from apps.staff.models import Designation

        today = dt_date.today()
        year = int(request.GET.get("year") or request.POST.get("year") or today.year)

        # For now, show all designations across hospitals; filtering by hospital can be added later.
        designations = Designation.objects.all().order_by("hospital__name", "name")

        # Build current values matrix: {(designation_id, month): earned_days}
        existing = {
            (alloc.designation_id, alloc.month): alloc
            for alloc in MonthlyEarnedLeaveAllocation.objects.filter(year=year)
        }

        if request.method == "POST":
            # Save all posted values
            for d in designations:
                for month in range(1, 13):
                    field_name = f"earned_{d.id}_{month}"
                    raw = request.POST.get(field_name, "").strip()
                    if raw == "":
                        continue
                    try:
                        value = float(raw)
                    except ValueError:
                        continue
                    alloc = existing.get((d.id, month))
                    if not alloc:
                        alloc = MonthlyEarnedLeaveAllocation.objects.create(
                            hospital=d.hospital,
                            year=year,
                            month=month,
                            designation=d,
                            earned_days=value,
                        )
                        existing[(d.id, month)] = alloc
                    else:
                        alloc.earned_days = value
                        alloc.save(update_fields=["earned_days", "updated_at"])

            # After saving the plan, immediately apply allocations so balances
            # are updated for all existing staff in one go.
            from apps.attendance.services import apply_monthly_earned_allocation

            applied = 0
            for key, alloc in existing.items():
                if alloc.year != year:
                    continue
                if alloc.is_applied:
                    continue
                try:
                    apply_monthly_earned_allocation(allocation=alloc)
                    applied += 1
                except Exception:
                    # If an allocation was already applied or invalid, skip it.
                    continue

            msg = f"Saved yearly planner for {year}."
            if applied:
                msg += f" Applied {applied} monthly earned allocations to staff balances."
            self.message_user(request, msg)

            # Redirect back to same planner URL (GET) to avoid resubmission
            return HttpResponseRedirect(f"../yearly-planner/?year={year}")

        # Build matrix for template
        rows = []
        for d in designations:
            per_month = []
            for month in range(1, 13):
                alloc = existing.get((d.id, month))
                per_month.append(
                    {
                        "month": month,
                        "value": "" if alloc is None else alloc.earned_days,
                        "field_name": f"earned_{d.id}_{month}",
                    }
                )
            rows.append({"designation": d, "months": per_month})

        context = {
            **self.admin_site.each_context(request),
            "title": f"Yearly earned leave planner – {year}",
            "year": year,
            "rows": rows,
            "months": range(1, 13),
        }
        from django.shortcuts import render

        return render(request, "admin/attendance/yearly_planner.html", context)


class StaffLeaveBalanceForm(forms.ModelForm):
    """
    Custom form for StaffLeaveBalance admin change page.
    For earned-leave records, shows 12 editable month fields populated from
    MonthlyEarnedLeaveAllocation for the staff's designation and current year.
    Fields are declared at class level so Django's admin validation passes;
    values are populated at runtime in __init__.
    """

    # Declared at class level so fieldsets validation sees them.
    from calendar import month_name as _month_name

    month_01_days = forms.DecimalField(label=_month_name[1], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_02_days = forms.DecimalField(label=_month_name[2], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_03_days = forms.DecimalField(label=_month_name[3], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_04_days = forms.DecimalField(label=_month_name[4], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_05_days = forms.DecimalField(label=_month_name[5], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_06_days = forms.DecimalField(label=_month_name[6], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_07_days = forms.DecimalField(label=_month_name[7], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_08_days = forms.DecimalField(label=_month_name[8], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_09_days = forms.DecimalField(label=_month_name[9], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_10_days = forms.DecimalField(label=_month_name[10], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_11_days = forms.DecimalField(label=_month_name[11], required=False, min_value=0, max_digits=5, decimal_places=2)
    month_12_days = forms.DecimalField(label=_month_name[12], required=False, min_value=0, max_digits=5, decimal_places=2)

    class Meta:
        model = StaffLeaveBalance
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        from datetime import date as dt_date

        super().__init__(*args, **kwargs)

        obj: StaffLeaveBalance | None = getattr(self, "instance", None)

        # Only populate/show month fields for existing earned-leave records
        # that belong to a staff with a designation.
        if (
            not obj
            or not obj.pk
            or obj.leave_type != LeaveApplication.LeaveType.EARNED
            or not obj.staff
            or not getattr(obj.staff, "designation_id", None)
        ):
            return

        staff = obj.staff
        year = dt_date.today().year

        allocs = {
            a.month: a
            for a in MonthlyEarnedLeaveAllocation.objects.filter(
                hospital_id=staff.hospital_id,
                designation_id=staff.designation_id,
                year=year,
            )
        }

        # Pre-fill initial values for each month field.
        for month in range(1, 13):
            field_name = f"month_{month:02d}_days"
            alloc = allocs.get(month)
            if alloc is not None:
                self.initial[field_name] = alloc.earned_days

        self._staff_for_allocs = staff
        self._year_for_allocs = year
        self._monthly_allocs = allocs

    def save(self, commit=True):
        obj = super().save(commit=commit)

        if not hasattr(self, "_monthly_allocs") or obj.leave_type != LeaveApplication.LeaveType.EARNED:
            return obj

        staff = self._staff_for_allocs
        year = self._year_for_allocs
        allocs = dict(self._monthly_allocs)

        for month in range(1, 13):
            field_name = f"month_{month:02d}_days"
            value = self.cleaned_data.get(field_name)
            if value is None:
                continue

            alloc = allocs.get(month)
            if not alloc:
                MonthlyEarnedLeaveAllocation.objects.create(
                    hospital=staff.hospital,
                    year=year,
                    month=month,
                    designation=staff.designation,
                    earned_days=value,
                )
            else:
                alloc.earned_days = value
                alloc.save(update_fields=["earned_days", "updated_at"])

        return obj


@admin.register(StaffLeaveBalance)
class StaffLeaveBalanceAdmin(admin.ModelAdmin):
    form = StaffLeaveBalanceForm
    list_display = ("staff", "leave_type", "balance_days")
    list_filter = ("leave_type",)

    def get_fieldsets(self, request, obj=None):
        base_fields = ["staff", "leave_type", "balance_days"]

        # For existing earned-leave records belonging to a staff with a designation,
        # inject the 12 month fields as a separate collapsible section.
        if (
            obj
            and obj.pk
            and obj.leave_type == LeaveApplication.LeaveType.EARNED
            and obj.staff
            and getattr(obj.staff, "designation_id", None)
        ):
            from calendar import month_name

            month_fields = [f"month_{m:02d}_days" for m in range(1, 13)]
            return [
                ("Staff leave balance", {"fields": base_fields}),
                (
                    "Earned leave by month (current year) – editable",
                    {
                        "fields": month_fields,
                        "description": (
                            "These values are the monthly earned-leave plan "
                            "for this staff's designation. Editing and saving "
                            "here updates the plan for all staff with the same "
                            "designation."
                        ),
                    },
                ),
            ]

        return [("Staff leave balance", {"fields": base_fields})]
