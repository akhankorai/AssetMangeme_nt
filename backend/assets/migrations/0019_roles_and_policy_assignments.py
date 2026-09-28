from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0018_useraccesspolicy"),
    ]

    operations = [
        migrations.AddField(
            model_name="useraccesspolicy",
            name="assigned_role_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name="RoleDefinition",
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
                ("name", models.CharField(max_length=120, unique=True)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("allowed_modules", models.JSONField(blank=True, default=list)),
                ("allowed_actions", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"]},
        ),
    ]
