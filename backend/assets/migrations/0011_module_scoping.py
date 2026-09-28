from django.db import migrations, models


MODULE_CHOICES = [
    ("vehicle-assets", "Vehicle Assets"),
    ("information-technology", "Information Technology"),
    ("feeding", "Feeding"),
    ("cleaning", "Cleaning"),
    ("shed-fans", "Shed Fans"),
    ("electrical-tools", "Electrical Tools"),
    ("paint-tools", "Paint Tools"),
    ("plumbing-tools", "Plumbing Tools"),
    ("welding-tools", "Welding Tools"),
    ("furniture", "Furniture"),
]


def ensure_scheduletask_table_for_sql_server(apps, schema_editor):
    if schema_editor.connection.vendor != "microsoft":
        return

    schema_editor.execute(
        """
        IF OBJECT_ID(N'dbo.assets_scheduletask', N'U') IS NULL
        BEGIN
            CREATE TABLE dbo.assets_scheduletask (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                title NVARCHAR(220) NOT NULL DEFAULT '',
                service_type NVARCHAR(160) NOT NULL DEFAULT '',
                asset_tag NVARCHAR(120) NOT NULL DEFAULT '',
                asset_name NVARCHAR(160) NOT NULL DEFAULT '',
                category NVARCHAR(120) NOT NULL DEFAULT '',
                assignee NVARCHAR(160) NOT NULL DEFAULT '',
                assigned_at DATETIME2 NULL,
                due_date DATE NULL,
                risk NVARCHAR(20) NOT NULL DEFAULT 'Medium',
                stage NVARCHAR(20) NOT NULL DEFAULT 'planned',
                progress INT NOT NULL DEFAULT 0,
                inspection_required BIT NOT NULL DEFAULT 1,
                meter_reading NVARCHAR(80) NOT NULL DEFAULT '',
                last_service_date DATETIME2 NULL,
                consumed_item_id INT NULL,
                consumed_item_name NVARCHAR(160) NOT NULL DEFAULT '',
                consumed_quantity INT NOT NULL DEFAULT 1,
                inventory_applied BIT NOT NULL DEFAULT 0,
                completed_at DATETIME2 NULL
            );
        END
        """
    )


class Migration(migrations.Migration):
    dependencies = [
        ("assets", "0010_employeecategory_teammember"),
    ]

    operations = [
        migrations.RunPython(
            ensure_scheduletask_table_for_sql_server, migrations.RunPython.noop
        ),
        migrations.AddField(
            model_name="asset",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="category",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="employeecategory",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="expenserecord",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="item",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="location",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="scheduletask",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="servicetype",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="teammember",
            name="module",
            field=models.CharField(
                choices=MODULE_CHOICES,
                db_index=True,
                default="vehicle-assets",
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="asset",
            name="asset_tag",
            field=models.CharField(max_length=80),
        ),
        migrations.AlterField(
            model_name="category",
            name="name",
            field=models.CharField(max_length=120),
        ),
        migrations.AlterField(
            model_name="employeecategory",
            name="name",
            field=models.CharField(max_length=160),
        ),
        migrations.AlterField(
            model_name="expenserecord",
            name="task_reference",
            field=models.CharField(max_length=120),
        ),
        migrations.AlterField(
            model_name="item",
            name="name",
            field=models.CharField(max_length=160),
        ),
        migrations.AlterField(
            model_name="servicetype",
            name="name",
            field=models.CharField(max_length=160),
        ),
        migrations.AlterField(
            model_name="teammember",
            name="serial_number",
            field=models.CharField(max_length=120),
        ),
        migrations.AlterUniqueTogether(
            name="location",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="asset",
            constraint=models.UniqueConstraint(
                fields=("module", "asset_tag"), name="assets_asset_module_tag_uniq"
            ),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("module", "name"), name="assets_category_module_name_uniq"
            ),
        ),
        migrations.AddConstraint(
            model_name="employeecategory",
            constraint=models.UniqueConstraint(
                fields=("module", "name"),
                name="assets_employee_category_module_name_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="expenserecord",
            constraint=models.UniqueConstraint(
                fields=("module", "task_reference"),
                name="assets_expense_module_task_ref_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="item",
            constraint=models.UniqueConstraint(
                fields=("module", "name"), name="assets_item_module_name_uniq"
            ),
        ),
        migrations.AddConstraint(
            model_name="location",
            constraint=models.UniqueConstraint(
                fields=("module", "name", "site", "room"),
                name="assets_location_module_path_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="servicetype",
            constraint=models.UniqueConstraint(
                fields=("module", "name"), name="assets_service_type_module_name_uniq"
            ),
        ),
        migrations.AddConstraint(
            model_name="teammember",
            constraint=models.UniqueConstraint(
                fields=("module", "serial_number"),
                name="assets_team_member_module_serial_uniq",
            ),
        ),
    ]
