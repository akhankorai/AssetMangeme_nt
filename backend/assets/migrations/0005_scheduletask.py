from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0004_expenserecord"),
    ]

    operations = [
        migrations.CreateModel(
            name="ScheduleTask",
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
                ("title", models.CharField(max_length=220)),
                ("service_type", models.CharField(max_length=160)),
                ("asset_tag", models.CharField(max_length=120)),
                ("asset_name", models.CharField(blank=True, max_length=160)),
                ("category", models.CharField(blank=True, max_length=120)),
                ("assignee", models.CharField(blank=True, max_length=160)),
                ("assigned_at", models.DateTimeField(blank=True, null=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                (
                    "risk",
                    models.CharField(
                        choices=[
                            ("Low", "Low"),
                            ("Medium", "Medium"),
                            ("High", "High"),
                        ],
                        default="Medium",
                        max_length=20,
                    ),
                ),
                (
                    "stage",
                    models.CharField(
                        choices=[
                            ("planned", "Planned"),
                            ("inspection", "Inspection"),
                            ("awaiting_parts", "Awaiting Parts"),
                            ("in_progress", "In Progress"),
                            ("completed", "Completed"),
                        ],
                        default="planned",
                        max_length=20,
                    ),
                ),
                ("progress", models.PositiveIntegerField(default=0)),
                ("last_service_date", models.DateTimeField(blank=True, null=True)),
                ("consumed_item_name", models.CharField(blank=True, max_length=160)),
                ("consumed_quantity", models.PositiveIntegerField(default=1)),
                ("inventory_applied", models.BooleanField(default=False)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "consumed_item_id",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
            ],
            options={
                "ordering": ["-assigned_at", "-updated_at"],
            },
        ),
    ]
