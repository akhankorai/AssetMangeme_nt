from rest_framework import serializers

from .models import (
    DailyInspectionRecord,
    ExpenseRecord,
    ScheduleTask,
)
from ..serializers_shared import ModuleScopedValidationMixin


from .models import *


class ExpenseRecordSerializer(ModuleScopedValidationMixin, serializers.ModelSerializer):
    formatted_id = serializers.CharField(read_only=True)
    item_name_display = serializers.CharField(source="item.name", read_only=True)
    quantity = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    total_cost = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    module_scoped_foreign_keys = ("item",)

    class Meta:
        model = ExpenseRecord
        fields = "__all__"


class ScheduleTaskSerializer(serializers.ModelSerializer):
    formatted_id = serializers.CharField(read_only=True)
    service_type = serializers.CharField(required=False, allow_blank=True, default="Emergency Repair")

    class Meta:
        model = ScheduleTask
        fields = "__all__"

    def validate(self, attrs):
        stage = attrs.get("stage", getattr(self.instance, "stage", None))
        meter_reading = attrs.get(
            "meter_reading", getattr(self.instance, "meter_reading", "")
        )
        if meter_reading is not None:
            meter_reading = str(meter_reading).strip()
        else:
            meter_reading = ""
        attrs["meter_reading"] = meter_reading

        if stage == ScheduleTask.Stage.DECLINED and attrs.get("inspection_required", True):
            attrs["inspection_required"] = False

        return attrs


class DailyInspectionRecordSerializer(serializers.ModelSerializer):
    formatted_id = serializers.CharField(read_only=True)

    class Meta:
        model = DailyInspectionRecord
        fields = "__all__"

class OutsideMaintenanceRecordSerializer(ModuleScopedValidationMixin, serializers.ModelSerializer):
    formatted_id = serializers.CharField(read_only=True)
    module_scoped_foreign_keys = ("task",)

    class Meta:
        model = OutsideMaintenanceRecord
        fields = "__all__"

