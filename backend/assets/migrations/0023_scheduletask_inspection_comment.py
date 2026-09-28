from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0022_fueldemand_approval_workflow"),
    ]

    operations = [
        migrations.AddField(
            model_name="scheduletask",
            name="inspection_comment",
            field=models.TextField(blank=True),
        ),
    ]
