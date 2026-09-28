from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0023_scheduletask_inspection_comment"),
    ]

    operations = [
        migrations.CreateModel(
            name="DailyInspectionRecord",
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
                            ("vehicle-assets", "Vehicle Assets"),
                            ("information-technology", "Information Technology"),
                            ("feeding", "Feeding"),
                            ("cleaning", "Cleaning"),
                            ("shed-fans", "Shed Fans"),
                            ("electrical-tools", "Electrical Tools"),
                            ("paint-tools", "Paint Tools"),
                            ("plumbing-tools", "Plumbing Tools"),
                            ("welding-tools", "Welding Tools"),
                            ("furniture", "Furniture"),
                        ],
                        db_index=True,
                        default="vehicle-assets",
                        max_length=64,
                    ),
                ),
                ("inspection_date", models.DateField(db_index=True)),
                ("asset_tag", models.CharField(db_index=True, max_length=120)),
                ("asset_name", models.CharField(blank=True, max_length=160)),
                ("category", models.CharField(blank=True, max_length=120)),
                ("station", models.CharField(blank=True, max_length=160)),
                ("checkpoints", models.JSONField(blank=True, default=dict)),
                ("needs_maintenance", models.BooleanField(default=False)),
                ("notes", models.TextField(blank=True)),
                ("completed", models.BooleanField(default=False)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["-inspection_date", "asset_tag"],
            },
        ),
        migrations.AddConstraint(
            model_name="dailyinspectionrecord",
            constraint=models.UniqueConstraint(
                fields=("module", "inspection_date", "asset_tag"),
                name="assets_daily_inspection_module_date_tag_uniq",
            ),
        ),
    ]
