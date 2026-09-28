from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0002_category_is_active"),
    ]

    operations = [
        migrations.CreateModel(
            name="Item",
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
                ("name", models.CharField(max_length=160, unique=True)),
                (
                    "price",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                ("inventory_quantity", models.PositiveIntegerField(default=0)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
    ]
