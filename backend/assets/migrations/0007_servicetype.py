from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0006_scheduletask_inspection_required_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ServiceType",
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
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["name"],
                "verbose_name_plural": "service types",
            },
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: [
                apps.get_model("assets", "ServiceType").objects.get_or_create(
                    name=name,
                    defaults={"description": description, "is_active": True},
                )
                for name, description in [
                    ("Inspection", "Routine inspection"),
                    ("Oil Change", "Oil service"),
                    ("Maintenance Intervention", "Corrective maintenance"),
                    ("Operational Check", "Operational readiness check"),
                ]
            ],
            reverse_code=migrations.RunPython.noop,
        ),
    ]
