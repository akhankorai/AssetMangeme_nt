import sqlite3
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone

from assets.models import (
    Asset,
    AssetModule,
    Category,
    EmployeeCategory,
    ExpenseRecord,
    Item,
    Location,
    ScheduleTask,
    ServiceType,
    TeamMember,
)


class Command(BaseCommand):
    help = "Populate the local SQLite database with working sample data and import schedule records."

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[4]
        schedule_db_path = base_dir / "schedule.sqlite3"

        workshop, _ = Location.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            site="Main Workshop",
            name="Vehicle Bay",
            room="Inspection Line",
        )

        category_names = ["Car", "Bike", "Truck"]
        categories = {
            name: Category.objects.get_or_create(
                module=AssetModule.VEHICLE_ASSETS,
                name=name,
                defaults={"description": f"{name} assets", "is_active": True},
            )[0]
            for name in category_names
        }

        seeded_items = [
            ("Car Engine Oil", 4500, 18),
            ("Steering Oil", 2300, 12),
            ("Brake Oil", 1800, 14),
            ("Oil Filter", 1200, 9),
        ]
        items = {}
        for name, price, quantity in seeded_items:
            items[name], _ = Item.objects.get_or_create(
                module=AssetModule.VEHICLE_ASSETS,
                name=name,
                defaults={"price": price, "inventory_quantity": quantity},
            )

        mechanic_category, _ = EmployeeCategory.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            name="Mechanic",
            defaults={"description": "Vehicle mechanic", "is_active": True},
        )
        inspector_category, _ = EmployeeCategory.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            name="Vehicle Inspector",
            defaults={
                "description": "Vehicle inspection specialist",
                "is_active": True,
            },
        )

        if schedule_db_path.exists():
            conn = sqlite3.connect(schedule_db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            for row in cur.execute("SELECT * FROM assets_employeecategory").fetchall():
                EmployeeCategory.objects.get_or_create(
                    module=row["module"] or AssetModule.VEHICLE_ASSETS,
                    name=row["name"],
                    defaults={
                        "description": row["description"] or "",
                        "is_active": bool(row["is_active"]),
                    },
                )

            employee_categories = {
                category.id: category
                for category in EmployeeCategory.objects.filter(
                    module=AssetModule.VEHICLE_ASSETS
                )
            }

            for row in cur.execute("SELECT * FROM assets_teammember").fetchall():
                TeamMember.objects.get_or_create(
                    module=row["module"] or AssetModule.VEHICLE_ASSETS,
                    serial_number=row["serial_number"],
                    defaults={
                        "name": row["name"],
                        "designation": row["designation"] or "",
                        "is_active": bool(row["is_active"]),
                        "employee_category": employee_categories.get(
                            row["employee_category_id"]
                        ),
                    },
                )

            for row in cur.execute("SELECT * FROM assets_servicetype").fetchall():
                ServiceType.objects.get_or_create(
                    module=row["module"] or AssetModule.VEHICLE_ASSETS,
                    name=row["name"],
                    defaults={
                        "description": row["description"] or "",
                        "is_active": bool(row["is_active"]),
                        "interval_days": row["interval_days"] or 0,
                    },
                )

            for row in cur.execute("SELECT * FROM assets_scheduletask").fetchall():
                asset_name = row["asset_name"] or row["title"]
                category_name = row["category"] or "Car"
                category = categories.get(category_name) or categories["Car"]
                asset, _ = Asset.objects.get_or_create(
                    module=row["module"] or AssetModule.VEHICLE_ASSETS,
                    asset_tag=row["asset_tag"],
                    defaults={
                        "name": asset_name,
                        "serial_number": row["meter_reading"] or "",
                        "category": category,
                        "location": workshop,
                        "assigned_to": row["assignee"] or "",
                        "purchase_date": row["due_date"] or timezone.localdate(),
                        "purchase_cost": None,
                        "status": Asset.Status.ASSIGNED
                        if row["stage"] != "completed"
                        else Asset.Status.AVAILABLE,
                        "notes": f"Imported from schedule DB. Meter reading: {row['meter_reading'] or 'n/a'}",
                    },
                )

                ScheduleTask.objects.get_or_create(
                    module=row["module"] or AssetModule.VEHICLE_ASSETS,
                    title=row["title"],
                    asset_tag=row["asset_tag"],
                    service_type=row["service_type"] or "",
                    defaults={
                        "asset_name": row["asset_name"] or "",
                        "category": category_name,
                        "assignee": row["assignee"] or "",
                        "assigned_at": row["assigned_at"],
                        "due_date": row["due_date"],
                        "risk": row["risk"] or "Medium",
                        "stage": row["stage"] or "planned",
                        "progress": row["progress"] or 0,
                        "inspection_required": bool(row["inspection_required"]),
                        "meter_reading": row["meter_reading"] or "",
                        "last_service_date": row["last_service_date"],
                        "consumed_item_id": row["consumed_item_id"],
                        "consumed_item_name": row["consumed_item_name"] or "",
                        "consumed_quantity": row["consumed_quantity"] or 1,
                        "inventory_applied": bool(row["inventory_applied"]),
                        "completed_at": row["completed_at"],
                    },
                )

                if row["completed_at"]:
                    matched_item = (
                        items.get(row["consumed_item_name"]) or items["Car Engine Oil"]
                    )
                    ExpenseRecord.objects.get_or_create(
                        module=row["module"] or AssetModule.VEHICLE_ASSETS,
                        task_reference=f"schedule-task-{row['id']}",
                        defaults={
                            "task_title": row["title"],
                            "service_type": row["service_type"] or "",
                            "asset_tag": row["asset_tag"],
                            "assignee": row["assignee"] or "",
                            "assigned_at": row["assigned_at"],
                            "completed_at": row["completed_at"],
                            "item": matched_item,
                            "item_name": matched_item.name,
                            "quantity": row["consumed_quantity"] or 1,
                            "unit_price": matched_item.price,
                            "total_cost": matched_item.price
                            * (row["consumed_quantity"] or 1),
                        },
                    )

            conn.close()

        TeamMember.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            serial_number="EMP-00001",
            defaults={
                "name": "Ali",
                "designation": "Vehicle Mechanic",
                "is_active": True,
                "employee_category": mechanic_category,
            },
        )
        TeamMember.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            serial_number="EMP-00002",
            defaults={
                "name": "Umer",
                "designation": "Vehicle Inspector",
                "is_active": True,
                "employee_category": inspector_category,
            },
        )

        seeded_services = [
            ("Engine Oil Change", 15),
            ("Steering Oil Change", 30),
            ("Brake Oil Change", 30),
            ("Oil Filter Replacement", 15),
        ]
        for service_name, interval_days in seeded_services:
            ServiceType.objects.get_or_create(
                module=AssetModule.VEHICLE_ASSETS,
                name=service_name,
                defaults={
                    "description": "",
                    "is_active": True,
                    "interval_days": interval_days,
                },
            )

        fallback_assets = [
            (
                "VH-2022-001",
                "Toyota Corolla GLI",
                "Car",
                "Adeel",
                Asset.Status.ASSIGNED,
            ),
            ("VH-2023-014", "Honda CG 125", "Bike", "", Asset.Status.AVAILABLE),
            ("VH-2021-007", "Mazda BT-50", "Truck", "Umer", Asset.Status.MAINTENANCE),
        ]
        for tag, name, category_name, assigned_to, status in fallback_assets:
            Asset.objects.get_or_create(
                module=AssetModule.VEHICLE_ASSETS,
                asset_tag=tag,
                defaults={
                    "name": name,
                    "serial_number": tag.replace("-", ""),
                    "category": categories[category_name],
                    "location": workshop,
                    "assigned_to": assigned_to,
                    "purchase_date": timezone.localdate(),
                    "purchase_cost": None,
                    "status": status,
                    "notes": "Seeded local development asset",
                },
            )

        ScheduleTask.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            title="Engine Oil Change for Toyota Corolla GLI",
            asset_tag="VH-2022-001",
            service_type="Engine Oil Change",
            defaults={
                "asset_name": "Toyota Corolla GLI",
                "category": "Car",
                "assignee": "Ali",
                "assigned_at": timezone.now(),
                "due_date": timezone.localdate(),
                "risk": "Medium",
                "stage": "in_progress",
                "progress": 65,
                "inspection_required": True,
                "meter_reading": "125430",
                "consumed_item_name": "Car Engine Oil",
                "consumed_quantity": 1,
                "inventory_applied": False,
            },
        )
        ScheduleTask.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            title="Brake Oil Review for Mazda BT-50",
            asset_tag="VH-2021-007",
            service_type="Brake Oil Change",
            defaults={
                "asset_name": "Mazda BT-50",
                "category": "Truck",
                "assignee": "Umer",
                "assigned_at": timezone.now(),
                "due_date": timezone.localdate(),
                "risk": "High",
                "stage": "planned",
                "progress": 15,
                "inspection_required": True,
                "meter_reading": "88210",
                "consumed_item_name": "Brake Oil",
                "consumed_quantity": 2,
                "inventory_applied": False,
            },
        )

        expense_item = items["Car Engine Oil"]
        ExpenseRecord.objects.get_or_create(
            module=AssetModule.VEHICLE_ASSETS,
            task_reference="seed-expense-001",
            defaults={
                "task_title": "Completed engine oil change",
                "service_type": "Engine Oil Change",
                "asset_tag": "VH-2022-001",
                "assignee": "Ali",
                "assigned_at": timezone.now(),
                "completed_at": timezone.now(),
                "item": expense_item,
                "item_name": expense_item.name,
                "quantity": 1,
                "unit_price": expense_item.price,
                "total_cost": expense_item.price,
            },
        )

        self.stdout.write(self.style.SUCCESS("Local development data is ready."))
