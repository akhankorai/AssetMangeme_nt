from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0007_servicetype"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicetype",
            name="interval_days",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
