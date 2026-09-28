from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations


TWO_PLACES = Decimal("0.01")


def normalize(value):
    if value is None:
        return None
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def normalize_decimal_history_values(apps, schema_editor):
    Item = apps.get_model("assets", "Item")
    ExpenseRecord = apps.get_model("assets", "ExpenseRecord")
    FuelDemand = apps.get_model("assets", "FuelDemand")

    for item in Item.objects.all().iterator():
        item.price = normalize(item.price)
        item.inventory_quantity = normalize(item.inventory_quantity)
        item.save(update_fields=["price", "inventory_quantity"])

    for expense in ExpenseRecord.objects.all().iterator():
        expense.quantity = normalize(expense.quantity)
        expense.unit_price = normalize(expense.unit_price)
        expense.total_cost = normalize(expense.total_cost)
        expense.save(update_fields=["quantity", "unit_price", "total_cost"])

    for fuel in FuelDemand.objects.all().iterator():
        fuel.liters = normalize(fuel.liters)
        fuel.unit_price = normalize(fuel.unit_price)
        fuel.total_cost = normalize(fuel.total_cost)
        fuel.meter_reading = normalize(fuel.meter_reading)
        fuel.previous_meter_reading = normalize(fuel.previous_meter_reading)
        fuel.distance_travelled = normalize(fuel.distance_travelled)
        fuel.average_distance_per_liter = normalize(fuel.average_distance_per_liter)
        fuel.save(
            update_fields=[
                "liters",
                "unit_price",
                "total_cost",
                "meter_reading",
                "previous_meter_reading",
                "distance_travelled",
                "average_distance_per_liter",
            ]
        )


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0016_backfill_fuel_expense_records"),
    ]

    operations = [
        migrations.RunPython(
            normalize_decimal_history_values, migrations.RunPython.noop
        ),
    ]
