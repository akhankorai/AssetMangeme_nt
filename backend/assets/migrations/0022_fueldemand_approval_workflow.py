from django.db import migrations, models


def migrate_fuel_demand_statuses(apps, schema_editor):
    FuelDemand = apps.get_model("assets", "FuelDemand")
    FuelDemand.objects.filter(status="allocated").update(
        status="fulfilled", inspection_completed=True
    )
    FuelDemand.objects.filter(status="denied").update(
        status="rejected", inspection_completed=False
    )


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0021_alter_fueldemand_module_alter_scheduletask_stage"),
    ]

    operations = [
        migrations.AlterField(
            model_name="fueldemand",
            name="status",
            field=models.CharField(
                choices=[
                    ("requested", "Requested"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("fulfilled", "Fulfilled"),
                ],
                default="requested",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_fuel_demand_statuses, migrations.RunPython.noop),
    ]
