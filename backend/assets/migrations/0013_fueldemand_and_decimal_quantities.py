from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0012_location_description"),
    ]

    operations = [
        migrations.AlterField(
            model_name="expenserecord",
            name="quantity",
            field=models.DecimalField(decimal_places=2, default=1, max_digits=12),
        ),
        migrations.AlterField(
            model_name="item",
            name="inventory_quantity",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.CreateModel(
            name="FuelDemand",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "module",
                    models.CharField(
                        db_index=True, default="vehicle-assets", max_length=64
                    ),
                ),
                ("asset_tag", models.CharField(max_length=120)),
                ("asset_name", models.CharField(blank=True, max_length=160)),
                ("request_date", models.DateField()),
                ("station", models.CharField(blank=True, max_length=160)),
                ("liters", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "unit_price",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "total_cost",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                ("meter_reading", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "previous_meter_reading",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                (
                    "distance_travelled",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                (
                    "average_distance_per_liter",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "fuel_item",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="fuel_demands",
                        to="assets.item",
                    ),
                ),
            ],
            options={
                "ordering": ["-request_date", "-created_at"],
            },
        ),
    ]
