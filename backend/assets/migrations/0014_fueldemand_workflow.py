from django.db import migrations, models


def mark_existing_demands_allocated(apps, schema_editor):
    FuelDemand = apps.get_model("assets", "FuelDemand")
    FuelDemand.objects.filter(status="requested").update(
        status="allocated",
        inspection_completed=True,
        allocated_at=models.F("created_at"),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0013_fueldemand_and_decimal_quantities"),
    ]

    operations = [
        migrations.AddField(
            model_name="fueldemand",
            name="allocated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="fueldemand",
            name="inspection_completed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="fueldemand",
            name="status",
            field=models.CharField(
                choices=[("requested", "Requested"), ("allocated", "Allocated")],
                default="requested",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            mark_existing_demands_allocated, migrations.RunPython.noop
        ),
    ]
