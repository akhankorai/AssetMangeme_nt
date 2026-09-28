from rest_framework import serializers

from assets.models import FuelDemand
from assets.serializers_shared import ModuleScopedValidationMixin


class FuelDemandSerializer(ModuleScopedValidationMixin, serializers.ModelSerializer):
    formatted_id = serializers.CharField(read_only=True)
    fuel_item_name = serializers.CharField(source="fuel_item.name", read_only=True)
    liters = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True, required=False
    )
    total_cost = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True, required=False
    )
    meter_reading = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    previous_meter_reading = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        allow_null=True,
        required=False,
    )
    distance_travelled = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        allow_null=True,
        required=False,
    )
    average_distance_per_liter = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=True,
        allow_null=True,
        required=False,
    )
    module_scoped_foreign_keys = ("fuel_item",)

    class Meta:
        model = FuelDemand
        fields = "__all__"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        liters = attrs.get("liters", getattr(self.instance, "liters", None))
        meter_reading = attrs.get(
            "meter_reading", getattr(self.instance, "meter_reading", None)
        )
        asset_tag = attrs.get("asset_tag", getattr(self.instance, "asset_tag", ""))

        if liters is None or liters <= 0:
            raise serializers.ValidationError(
                {"liters": "Liters must be greater than zero."}
            )

        if meter_reading is None or meter_reading < 0:
            raise serializers.ValidationError(
                {"meter_reading": "Meter reading must be zero or greater."}
            )

        if not str(asset_tag or "").strip():
            raise serializers.ValidationError({"asset_tag": "Asset tag is required."})

        return attrs
