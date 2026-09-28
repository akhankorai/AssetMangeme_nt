from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0011_module_scoping"),
    ]

    operations = [
        migrations.AddField(
            model_name="location",
            name="description",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
