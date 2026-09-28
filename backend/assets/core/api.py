from django.db import DatabaseError
from django.db.models import ProtectedError
from rest_framework import filters, viewsets
from rest_framework.response import Response
from rest_framework import status
from assets.modules import get_module_filter, module_from_request
from .models import (
    Asset,
    AssetModule,
    Category,
    EmployeeCategory,
    Item,
    Location,
    RegularInspectionItem,
    ServiceType,
    TeamMember,
)
from ..services.vehicle_assets_sync import (
    VehicleAssetsSyncError,
    sync_vehicle_assets_to_db,
)
from assets.serializers import (
    AssetSerializer,
    CategorySerializer,
    EmployeeCategorySerializer,
    ItemSerializer,
    LocationSerializer,
    RegularInspectionItemSerializer,
    ServiceTypeSerializer,
    TeamMemberSerializer,
)


class ModuleScopedViewSetMixin:
    module_field = "module"
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        module_key = module_from_request(self.request)
        if module_key:
            queryset = queryset.filter(get_module_filter(module_key))
        return queryset


class CategoryViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "This category is in use by existing assets and cannot be deleted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class ItemViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = [
        "name",
        "price",
        "inventory_quantity",
        "created_at",
        "updated_at",
    ]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Items storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class LocationViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "site", "room"]
    ordering_fields = ["site", "name", "created_at"]


class AssetViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("category", "location")
    serializer_class = AssetSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset_tag", "name", "serial_number", "assigned_to"]
    ordering_fields = ["asset_tag", "name", "status", "created_at", "updated_at"]

    def list(self, request, *args, **kwargs):
        module_key = module_from_request(request)
        should_sync = str(
            request.query_params.get("sync", "1")
        ).strip().lower() not in {"0", "false", "no", "off"}

        if module_key == AssetModule.VEHICLE_ASSETS and should_sync:
            try:
                sync_vehicle_assets_to_db()
            except VehicleAssetsSyncError:
                # Fallback to cached DB data when upstream is unreachable.
                pass
            except Exception:
                pass

        return super().list(request, *args, **kwargs)


class EmployeeCategoryViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = EmployeeCategory.objects.all()
    serializer_class = EmployeeCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "This employee category is in use by existing team members and cannot be deleted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class TeamMemberViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = TeamMember.objects.select_related("employee_category")
    serializer_class = TeamMemberSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "serial_number", "designation", "employee_category__name"]
    ordering_fields = ["name", "serial_number", "created_at", "updated_at"]


class ServiceTypeViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "This service type is in use by existing schedule tasks and cannot be deleted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class RegularInspectionItemViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = RegularInspectionItem.objects.all()
    serializer_class = RegularInspectionItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["category", "check_item", "standard"]
    ordering_fields = [
        "sort_order",
        "category",
        "check_item",
        "created_at",
        "updated_at",
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        include_inactive = (
            str(self.request.query_params.get("include_inactive", "")).strip().lower()
        )
        if include_inactive not in {"1", "true", "yes"}:
            queryset = queryset.filter(is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Regular inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Regular inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            return super().partial_update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Regular inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Regular inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
