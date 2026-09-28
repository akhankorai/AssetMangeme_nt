from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0003_item"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExpenseRecord",
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
                ("task_reference", models.CharField(max_length=120, unique=True)),
                ("task_title", models.CharField(max_length=220)),
                ("service_type", models.CharField(blank=True, max_length=160)),
                ("asset_tag", models.CharField(max_length=120)),
                ("assignee", models.CharField(blank=True, max_length=160)),
                ("assigned_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("item_name", models.CharField(blank=True, max_length=160)),
                ("quantity", models.PositiveIntegerField(default=1)),
                (
                    "unit_price",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "total_cost",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "item",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="expense_records",
                        to="assets.item",
                    ),
                ),
            ],
            options={
                "ordering": ["-completed_at", "-created_at"],
            },
        ),
    ]
