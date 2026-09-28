from datetime import datetime, time
from decimal import Decimal

from django.db import migrations
from django.utils import timezone


def backfill_fuel_expense_records(apps, schema_editor):
    FuelDemand = apps.get_model("assets", "FuelDemand")
    ExpenseRecord = apps.get_model("assets", "ExpenseRecord")
    Item = apps.get_model("assets", "Item")

    allocated_demands = FuelDemand.objects.filter(status="allocated")
    for fuel_demand in allocated_demands.iterator():
        task_reference = f"fuel-demand-{fuel_demand.id}"
        if ExpenseRecord.objects.filter(
            module=fuel_demand.module, task_reference=task_reference
        ).exists():
            continue

        fuel_item = Item.objects.filter(pk=fuel_demand.fuel_item_id).first()

        recorded_at = timezone.make_aware(
            datetime.combine(fuel_demand.request_date, time.min)
        )
        ExpenseRecord.objects.create(
            module=fuel_demand.module,
            task_reference=task_reference,
            task_title="Fuel Demand",
            service_type="Fuel Allocation",
            asset_tag=fuel_demand.asset_tag,
            assignee=fuel_demand.station,
            assigned_at=recorded_at,
            completed_at=recorded_at,
            item_id=fuel_demand.fuel_item_id,
            item_name=fuel_item.name if fuel_item else "",
            quantity=fuel_demand.liters or Decimal("0"),
            unit_price=fuel_demand.unit_price or Decimal("0"),
            total_cost=fuel_demand.total_cost or Decimal("0"),
        )


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0015_fueldemand_denied_status"),
    ]

    operations = [
        migrations.RunPython(backfill_fuel_expense_records, migrations.RunPython.noop),
    ]
