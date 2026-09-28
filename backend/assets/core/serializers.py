from rest_framework import serializers

from .models import (
    Asset,
    Category,
    EmployeeCategory,
    Item,
    Location,
    RegularInspectionItem,
    ServiceType,
    TeamMember,
)
from ..serializers_shared import ModuleScopedValidationMixin


from .models import *


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ItemSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    inventory_quantity = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )

    class Meta:
        model = Item
        fields = "__all__"


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = "__all__"


class AssetSerializer(ModuleScopedValidationMixin, serializers.ModelSerializer):
    formatted_id = serializers.CharField(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    location_name = serializers.SerializerMethodField()
    module_scoped_foreign_keys = ("category", "location")

    class Meta:
        model = Asset
        fields = "__all__"

    def get_location_name(self, obj):
        return obj.location.name if obj.location else ""


class EmployeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeCategory
        fields = "__all__"


class TeamMemberSerializer(ModuleScopedValidationMixin, serializers.ModelSerializer):
    employee_category_name = serializers.CharField(
        source="employee_category.name", read_only=True
    )
    module_scoped_foreign_keys = ("employee_category",)

    class Meta:
        model = TeamMember
        fields = "__all__"


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = "__all__"


class RegularInspectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegularInspectionItem
        fields = "__all__"
