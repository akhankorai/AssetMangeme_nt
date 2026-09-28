from datetime import datetime, time
from decimal import Decimal

from django.db import DatabaseError, transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from assets.fuel.services import sync_fuel_history
from assets.models import ExpenseRecord, FuelDemand
from assets.modules import get_module_filter, module_from_request
from assets.modules.vehicle_assets.serializers.fuel_demand import FuelDemandSerializer


class FuelDemandViewSet(viewsets.ModelViewSet):
    pagination_class = None
    queryset = FuelDemand.objects.select_related("fuel_item")
    serializer_class = FuelDemandSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset_tag", "asset_name", "station", "fuel_item__name", "notes"]
    ordering_fields = [
        "request_date",
        "liters",
        "total_cost",
        "meter_reading",
        "created_at",
        "updated_at",
        "allocated_at",
        "status",
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        module_key = module_from_request(self.request)
        if module_key:
            queryset = queryset.filter(get_module_filter(module_key))
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            module_key = module_from_request(request)
            sync_fuel_history(module_key=module_key)
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                validated = serializer.validated_data
                fuel_item = validated["fuel_item"]
                module_key = (
                    validated.get("module")
                    or module_from_request(request)
                    or fuel_item.module
                )
                unit_price = Decimal(fuel_item.price or 0)
                fuel_demand = serializer.save(
                    module=module_key,
                    unit_price=unit_price,
                    total_cost=Decimal("0"),
                    status=FuelDemand.Status.REQUESTED,
                    inspection_completed=False,
                    allocated_at=None,
                    previous_meter_reading=None,
                    distance_travelled=None,
                    average_distance_per_liter=None,
                    asset_name=validated.get("asset_name", ""),
                )

                response_serializer = self.get_serializer(fuel_demand)
                headers = self.get_success_headers(response_serializer.data)
                return Response(
                    response_serializer.data,
                    status=status.HTTP_201_CREATED,
                    headers=headers,
                )
        except DatabaseError:
            return Response(
                {
                    "detail": "Fuel demand storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        try:
            with transaction.atomic():
                fuel_demand = self.get_object()
                if fuel_demand.status != FuelDemand.Status.REQUESTED:
                    serializer = self.get_serializer(fuel_demand)
                    return Response(serializer.data)

                fuel_demand.status = FuelDemand.Status.APPROVED
                fuel_demand.inspection_completed = True
                fuel_demand.save(
                    update_fields=[
                        "status",
                        "inspection_completed",
                        "updated_at",
                    ]
                )
                serializer = self.get_serializer(fuel_demand)
                return Response(serializer.data)
        except DatabaseError:
            return Response(
                {
                    "detail": "Fuel approval is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @action(detail=True, methods=["post"])
    def allocate(self, request, pk=None):
        try:
            with transaction.atomic():
                fuel_demand = self.get_object()
                if fuel_demand.status == FuelDemand.Status.FULFILLED:
                    serializer = self.get_serializer(fuel_demand)
                    return Response(serializer.data)

                if fuel_demand.status != FuelDemand.Status.APPROVED:
                    return Response(
                        {
                            "detail": "Fuel demand must be approved before it can be fulfilled."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                liters = Decimal(fuel_demand.liters or 0)
                fuel_item = fuel_demand.fuel_item
                available_quantity = Decimal(fuel_item.inventory_quantity or 0)
                if available_quantity < liters:
                    return Response(
                        {
                            "detail": f"Only {available_quantity} liters of {fuel_item.name} are available in inventory."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                module_key = fuel_demand.module
                previous_demand = (
                    FuelDemand.objects.filter(
                        get_module_filter(module_key),
                        asset_tag=fuel_demand.asset_tag,
                        status=FuelDemand.Status.FULFILLED,
                    )
                    .exclude(pk=fuel_demand.pk)
                    .exclude(request_date__gt=fuel_demand.request_date)
                    .order_by("-request_date", "-allocated_at", "-created_at")
                    .first()
                )
                current_meter = Decimal(fuel_demand.meter_reading or 0)
                previous_meter = (
                    Decimal(previous_demand.meter_reading) if previous_demand else None
                )
                distance_travelled = None
                average_distance = None
                if previous_meter is not None and current_meter >= previous_meter:
                    distance_travelled = current_meter - previous_meter
                    if liters > 0:
                        average_distance = distance_travelled / liters

                unit_price = Decimal(fuel_item.price or 0)
                total_cost = unit_price * liters
                fuel_item.inventory_quantity = available_quantity - liters
                fuel_item.save(update_fields=["inventory_quantity", "updated_at"])

                recorded_at = timezone.make_aware(
                    datetime.combine(fuel_demand.request_date, time.min)
                )
                fuel_demand.unit_price = unit_price
                fuel_demand.total_cost = total_cost
                fuel_demand.previous_meter_reading = previous_meter
                fuel_demand.distance_travelled = distance_travelled
                fuel_demand.average_distance_per_liter = average_distance
                fuel_demand.status = FuelDemand.Status.FULFILLED
                fuel_demand.inspection_completed = True
                fuel_demand.allocated_at = recorded_at
                fuel_demand.save(
                    update_fields=[
                        "unit_price",
                        "total_cost",
                        "previous_meter_reading",
                        "distance_travelled",
                        "average_distance_per_liter",
                        "status",
                        "inspection_completed",
                        "allocated_at",
                        "updated_at",
                    ]
                )

                ExpenseRecord.objects.update_or_create(
                    module=module_key,
                    task_reference=f"fuel-demand-{fuel_demand.id}",
                    defaults={
                        "task_title": "Fuel Demand",
                        "service_type": "Fuel Allocation",
                        "asset_tag": fuel_demand.asset_tag,
                        "assignee": fuel_demand.station,
                        "assigned_at": recorded_at,
                        "completed_at": recorded_at,
                        "item": fuel_item,
                        "item_name": fuel_item.name,
                        "quantity": liters,
                        "unit_price": unit_price,
                        "total_cost": total_cost,
                    },
                )

                sync_fuel_history(
                    module_key=module_key, asset_tags=[fuel_demand.asset_tag]
                )
                serializer = self.get_serializer(fuel_demand)
                return Response(serializer.data)
        except DatabaseError:
            return Response(
                {
                    "detail": "Fuel allocation is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        try:
            with transaction.atomic():
                fuel_demand = self.get_object()
                if fuel_demand.status not in [
                    FuelDemand.Status.REQUESTED,
                    FuelDemand.Status.APPROVED,
                ]:
                    serializer = self.get_serializer(fuel_demand)
                    return Response(serializer.data)

                recorded_at = timezone.make_aware(
                    datetime.combine(fuel_demand.request_date, time.min)
                )
                fuel_demand.status = FuelDemand.Status.REJECTED
                fuel_demand.inspection_completed = False
                fuel_demand.allocated_at = recorded_at
                fuel_demand.total_cost = Decimal("0")
                fuel_demand.distance_travelled = None
                fuel_demand.average_distance_per_liter = None
                fuel_demand.save(
                    update_fields=[
                        "status",
                        "inspection_completed",
                        "allocated_at",
                        "total_cost",
                        "distance_travelled",
                        "average_distance_per_liter",
                        "updated_at",
                    ]
                )

                serializer = self.get_serializer(fuel_demand)
                return Response(serializer.data)
        except DatabaseError:
            return Response(
                {
                    "detail": "Fuel review is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def update(self, request, *args, **kwargs):
        try:
            fuel_demand = self.get_object()
            sync_tags = [fuel_demand.asset_tag]
            response = super().update(request, *args, **kwargs)
            updated_tag = response.data.get("asset_tag")
            if updated_tag:
                sync_tags.append(updated_tag)
            sync_fuel_history(module_key=fuel_demand.module, asset_tags=sync_tags)
            refreshed = self.get_serializer(self.get_object())
            return Response(
                refreshed.data, status=response.status_code, headers=response.headers
            )
        except DatabaseError:
            return Response(
                {
                    "detail": "Fuel demand storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            fuel_demand = self.get_object()
            sync_tags = [fuel_demand.asset_tag]
            response = super().partial_update(request, *args, **kwargs)
            updated_tag = response.data.get("asset_tag")
            if updated_tag:
                sync_tags.append(updated_tag)
            sync_fuel_history(module_key=fuel_demand.module, asset_tags=sync_tags)
            refreshed = self.get_serializer(self.get_object())
            return Response(
                refreshed.data, status=response.status_code, headers=response.headers
            )
        except DatabaseError:
            return Response(
                {
                    "detail": "Fuel demand storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
