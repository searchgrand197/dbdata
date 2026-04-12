from django.contrib import admin
from apps.beds.models import Bed, BedRoom, Floor


class BedRoomInline(admin.TabularInline):
    model = BedRoom
    extra = 0
    fields = ["name", "room_number", "room_type", "is_ac", "daily_charge", "max_beds", "is_active"]
    show_change_link = True


class BedInline(admin.TabularInline):
    model = Bed
    extra = 0
    fields = ["bed_code", "bed_number", "status", "notes"]


@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ["name", "floor_number", "hospital", "is_active"]
    list_filter = ["hospital", "is_active"]
    search_fields = ["name"]
    ordering = ["hospital", "floor_number"]
    inlines = [BedRoomInline]


@admin.register(BedRoom)
class BedRoomAdmin(admin.ModelAdmin):
    list_display = ["name", "room_number", "room_type", "floor", "is_ac", "daily_charge", "available_bed_count", "total_bed_count", "is_active"]
    list_filter = ["hospital", "floor", "room_type", "is_ac", "is_active"]
    search_fields = ["name", "room_number"]
    ordering = ["floor", "name"]
    inlines = [BedInline]

    def available_bed_count(self, obj):
        return obj.available_bed_count
    available_bed_count.short_description = "Available Beds"

    def total_bed_count(self, obj):
        return obj.total_bed_count
    total_bed_count.short_description = "Total Beds"


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ["bed_code", "bed_number", "room", "status", "hospital"]
    list_filter = ["hospital", "room__floor", "room__room_type", "status"]
    search_fields = ["bed_code", "bed_number"]
    list_editable = ["status"]
    ordering = ["room", "bed_number"]
