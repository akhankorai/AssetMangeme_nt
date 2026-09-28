from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0014_fueldemand_workflow"),
    ]

    operations = [
        migrations.AlterField(
            model_name="fueldemand",
            name="status",
            field=models.CharField(
                choices=[
                    ("requested", "Requested"),
                    ("allocated", "Allocated"),
                    ("denied", "Denied"),
                ],
                default="requested",
                max_length=20,
            ),
        ),
    ]
