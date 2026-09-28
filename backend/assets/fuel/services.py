from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db import transaction

from ..models import ExpenseRecord, FuelDemand


def _fuel_sort_key(entry: FuelDemand):
    return (
        entry.request_date,
        Decimal(entry.meter_reading or 0),
        entry.allocated_at or entry.created_at,
        entry.created_at,
        entry.pk,
    )


@transaction.atomic
def sync_fuel_history(
    module_key: str | None = None, asset_tags: list[str] | None = None
) -> None:
    queryset = FuelDemand.objects.select_related("fuel_item").filter(
        status=FuelDemand.Status.FULFILLED
    )
    if module_key:
        queryset = queryset.filter(module=module_key)
    if asset_tags:
        queryset = queryset.filter(
            asset_tag__in=[tag for tag in asset_tags if str(tag or "").strip()]
        )

    allocated_rows = list(
        queryset.order_by(
            "module", "asset_tag", "request_date", "meter_reading", "created_at", "pk"
        )
    )
    grouped_rows: dict[tuple[str, str], list[FuelDemand]] = defaultdict(list)
    for row in allocated_rows:
        grouped_rows[(row.module, row.asset_tag)].append(row)

    updated_fuel_ids: list[int] = []
    fuel_by_id = {row.id: row for row in allocated_rows}

    for rows in grouped_rows.values():
        ordered_rows = sorted(rows, key=_fuel_sort_key)
        previous_meter = None
        previous_row = None
        for row in ordered_rows:
            liters = Decimal(row.liters or 0)
            unit_price = Decimal(
                row.unit_price or getattr(row.fuel_item, "price", 0) or 0
            )
            current_meter = Decimal(row.meter_reading or 0)

            distance_travelled = None
            average_distance = None
            if previous_meter is not None and current_meter >= previous_meter:
                distance_travelled = current_meter - previous_meter
                if liters > 0:
                    average_distance = distance_travelled / liters

            total_cost = unit_price * liters

            changes = []
            if row.unit_price != unit_price:
                row.unit_price = unit_price
                changes.append("unit_price")
            if row.total_cost != total_cost:
                row.total_cost = total_cost
                changes.append("total_cost")
            if row.previous_meter_reading != previous_meter:
                row.previous_meter_reading = previous_meter
                changes.append("previous_meter_reading")
            if row.distance_travelled != distance_travelled:
                row.distance_travelled = distance_travelled
                changes.append("distance_travelled")
            if row.average_distance_per_liter != average_distance:
                row.average_distance_per_liter = average_distance
                changes.append("average_distance_per_liter")

            if changes:
                row.save(update_fields=[*changes, "updated_at"])
            updated_fuel_ids.append(row.id)

            # Backfill older empty rows once the next meter gap is known.
            if (
                previous_row is not None
                and distance_travelled is not None
                and previous_row.distance_travelled is None
                and previous_row.average_distance_per_liter is None
            ):
                previous_liters = Decimal(previous_row.liters or 0)
                previous_average = (
                    (distance_travelled / previous_liters)
                    if previous_liters > 0
                    else None
                )
                previous_row.distance_travelled = distance_travelled
                previous_row.average_distance_per_liter = previous_average
                previous_row.save(
                    update_fields=[
                        "distance_travelled",
                        "average_distance_per_liter",
                        "updated_at",
                    ]
                )

            previous_row = row
            previous_meter = current_meter

    if not updated_fuel_ids:
        return

    for expense in ExpenseRecord.objects.filter(
        module__in={module for module, _ in grouped_rows.keys()},
        task_reference__startswith="fuel-demand-",
    ).iterator():
        try:
            fuel_demand_id = int(expense.task_reference.removeprefix("fuel-demand-"))
        except ValueError:
            continue
        if fuel_demand_id not in updated_fuel_ids:
            continue

        fuel = fuel_by_id.get(fuel_demand_id)
        if fuel is None:
            continue

        expense_changed = []
        if expense.asset_tag != fuel.asset_tag:
            expense.asset_tag = fuel.asset_tag
            expense_changed.append("asset_tag")
        if expense.assignee != fuel.station:
            expense.assignee = fuel.station
            expense_changed.append("assignee")
        if expense.item_id != fuel.fuel_item_id:
            expense.item_id = fuel.fuel_item_id
            expense_changed.append("item")
        if expense.item_name != getattr(fuel.fuel_item, "name", ""):
            expense.item_name = getattr(fuel.fuel_item, "name", "")
            expense_changed.append("item_name")
        if expense.quantity != fuel.liters:
            expense.quantity = fuel.liters
            expense_changed.append("quantity")
        if expense.unit_price != fuel.unit_price:
            expense.unit_price = fuel.unit_price
            expense_changed.append("unit_price")
        if expense.total_cost != fuel.total_cost:
            expense.total_cost = fuel.total_cost
            expense_changed.append("total_cost")

        if expense_changed:
            expense.save(update_fields=[*expense_changed, "updated_at"])
