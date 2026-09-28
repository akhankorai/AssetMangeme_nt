from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0019_roles_and_policy_assignments"),
    ]

    operations = [
        migrations.AddField(
            model_name="roledefinition",
            name="permissions",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
