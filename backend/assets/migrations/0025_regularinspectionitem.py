from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0024_dailyinspectionrecord"),
    ]

    operations = [
        migrations.CreateModel(
            name="RegularInspectionItem",
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
                        choices=[
                            ("vehicle_assets", "Vehicle Assets"),
                            ("information_technology", "Information Technology"),
                            ("feeding", "Feeding"),
                            ("cleaning", "Cleaning"),
                            ("shed_fans", "Shed Fans"),
                            ("electrical_tools", "Electrical Tools"),
                            ("paint_tools", "Paint Tools"),
                            ("plumbing_tools", "Plumbing Tools"),
                            ("welding_tools", "Welding Tools"),
                            ("furniture", "Furniture"),
                        ],
                        db_index=True,
                        default="vehicle_assets",
                        max_length=64,
                    ),
                ),
                ("category", models.CharField(max_length=120)),
                ("check_item", models.CharField(max_length=220)),
                ("standard", models.CharField(blank=True, max_length=220)),
                ("sort_order", models.PositiveIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["sort_order", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="regularinspectionitem",
            constraint=models.UniqueConstraint(
                fields=("module", "category", "check_item"),
                name="assets_regular_inspection_module_category_item_uniq",
            ),
        ),
    ]
