from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from assets.modules import DEFAULT_MODULE_KEY, MODULE_CHOICES, get_workspace_template
from assets.models import (
    Asset,
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
    help = "Create or backfill DB-driven workspace data for a module."

    def add_arguments(self, parser):
        parser.add_argument(
            "--module",
            default=DEFAULT_MODULE_KEY,
            choices=[choice[0] for choice in MODULE_CHOICES],
            help="Module key to provision.",
        )

    def handle(self, *args, **options):
        module_key = options["module"]
        template = get_workspace_template(module_key)

        with transaction.atomic():
            location = self._ensure_location(
                module_key, template.get("default_location")
            )
            self._ensure_categories(module_key, template.get("categories", []))
            self._ensure_service_types(module_key, template.get("service_types", []))
            self._ensure_items(module_key, template.get("items", []))
            category_lookup = self._ensure_employee_categories(
                module_key, template.get("employee_categories", [])
            )
            member_lookup = self._ensure_team_members(
                module_key, template.get("team_members", []), category_lookup
            )
            self._backfill_assets(module_key, location, member_lookup)
            self._ensure_schedule_tasks(module_key, member_lookup)

        self.stdout.write(
            self.style.SUCCESS(
                "Provisioned workspace "
                f"{module_key}: assets={Asset.objects.filter(module=module_key).count()}, "
                f"employee_categories={EmployeeCategory.objects.filter(module=module_key).count()}, "
                f"team_members={TeamMember.objects.filter(module=module_key).count()}, "
                f"schedule_tasks={ScheduleTask.objects.filter(module=module_key).count()}, "
                f"expenses={ExpenseRecord.objects.filter(module=module_key).count()}",
            )
        )

    def _ensure_location(
        self, module_key: str, payload: dict | None
    ) -> Location | None:
        if not payload:
            return None

        location, defaults = self._upsert_lookup(
            Location,
            module_key,
            lookup={
                "name": payload["name"],
                "site": payload.get("site", ""),
                "room": payload.get("room", ""),
            },
            defaults={},
        )
        if defaults:
            location.save(update_fields=defaults)
        return location

    def _ensure_categories(self, module_key: str, payloads: list[dict]):
        for payload in payloads:
            category, changed = self._upsert_lookup(
                Category,
                module_key,
                lookup={"name": payload["name"]},
                defaults={
                    "description": payload.get("description", ""),
                    "is_active": True,
                },
            )
            if changed:
                category.save(update_fields=changed)

    def _ensure_service_types(self, module_key: str, payloads: list[dict]):
        for payload in payloads:
            service_type, changed = self._upsert_lookup(
                ServiceType,
                module_key,
                lookup={"name": payload["name"]},
                defaults={
                    "description": payload.get("description", ""),
                    "interval_days": payload.get("interval_days", 0),
                    "is_active": True,
                },
            )
            if changed:
                service_type.save(update_fields=changed)

    def _ensure_items(self, module_key: str, payloads: list[dict]):
        for payload in payloads:
            item, changed = self._upsert_lookup(
                Item,
                module_key,
                lookup={"name": payload["name"]},
                defaults={
                    "price": payload.get("price", Decimal("0")),
                    "inventory_quantity": payload.get("inventory_quantity", 0),
                },
            )
            if changed:
                item.save(update_fields=changed)

    def _ensure_employee_categories(
        self, module_key: str, payloads: list[dict]
    ) -> dict[str, EmployeeCategory]:
        category_lookup: dict[str, EmployeeCategory] = {}
        for payload in payloads:
            category, changed = self._upsert_lookup(
                EmployeeCategory,
                module_key,
                lookup={"name": payload["name"]},
                defaults={
                    "description": payload.get("description", ""),
                    "is_active": True,
                },
            )
            if changed:
                category.save(update_fields=changed)
            category_lookup[category.name] = category
        return category_lookup

    def _ensure_team_members(
        self,
        module_key: str,
        payloads: list[dict],
        category_lookup: dict[str, EmployeeCategory],
    ) -> dict[str, TeamMember]:
        member_lookup: dict[str, TeamMember] = {}
        for payload in payloads:
            employee_category = category_lookup[payload["employee_category"]]
            member, changed = self._upsert_lookup(
                TeamMember,
                module_key,
                lookup={"serial_number": payload["serial_number"]},
                defaults={
                    "name": payload["name"],
                    "employee_category": employee_category,
                    "designation": payload.get("designation", ""),
                    "is_active": True,
                },
            )
            if changed:
                member.save(update_fields=changed)
            member_lookup[member.serial_number] = member
        return member_lookup

    def _backfill_assets(
        self,
        module_key: str,
        location: Location | None,
        member_lookup: dict[str, TeamMember],
    ):
        assets = list(Asset.objects.filter(module=module_key).order_by("id"))
        if not assets:
            return

        assignees = [member.name for member in member_lookup.values()]
        asset_updates = []
        for index, asset in enumerate(assets):
            changed = []
            if location and asset.location_id is None:
                asset.location = location
                changed.append("location")
            if not asset.assigned_to and assignees:
                asset.assigned_to = assignees[index % len(assignees)]
                changed.append("assigned_to")
            if asset.status == Asset.Status.AVAILABLE and index == 0:
                asset.status = Asset.Status.ASSIGNED
                changed.append("status")
            elif asset.status == Asset.Status.AVAILABLE and index == 1:
                asset.status = Asset.Status.MAINTENANCE
                changed.append("status")
            if changed:
                asset_updates.append((asset, changed))

        for asset, fields in asset_updates:
            asset.save(update_fields=fields)

    def _ensure_schedule_tasks(
        self, module_key: str, member_lookup: dict[str, TeamMember]
    ):
        assets = list(Asset.objects.filter(module=module_key).order_by("id"))
        if not assets:
            return

        service_types = {
            service.name: service
            for service in ServiceType.objects.filter(module=module_key)
        }
        items = {item.name: item for item in Item.objects.filter(module=module_key)}
        assignees = [member.name for member in member_lookup.values()] or ["Unassigned"]
        now = timezone.now()

        task_blueprints = [
            {
                "title": f"Operational Check of {assets[0].asset_tag}",
                "service_type": "Operational Check",
                "asset": assets[0],
                "assignee": assignees[0],
                "risk": ScheduleTask.Risk.MEDIUM,
                "stage": ScheduleTask.Stage.PLANNED,
                "due_date": (now + timedelta(days=2)).date(),
                "progress": 0,
                "inspection_required": True,
                "meter_reading": "",
                "completed_at": None,
                "item_name": "",
                "expense": None,
            },
            {
                "title": f"Maintenance Intervention of {assets[min(1, len(assets) - 1)].asset_tag}",
                "service_type": "Maintenance Intervention",
                "asset": assets[min(1, len(assets) - 1)],
                "assignee": assignees[min(1, len(assignees) - 1)],
                "risk": ScheduleTask.Risk.HIGH,
                "stage": ScheduleTask.Stage.IN_PROGRESS,
                "due_date": (now + timedelta(days=1)).date(),
                "progress": 55,
                "inspection_required": True,
                "meter_reading": "1250",
                "completed_at": None,
                "item_name": "Tracter Engine Oil Filter",
                "expense": None,
            },
            {
                "title": f"Oil Change of {assets[min(2, len(assets) - 1)].asset_tag}",
                "service_type": "Oil Change",
                "asset": assets[min(2, len(assets) - 1)],
                "assignee": assignees[0],
                "risk": ScheduleTask.Risk.MEDIUM,
                "stage": ScheduleTask.Stage.COMPLETED,
                "due_date": now.date(),
                "progress": 100,
                "inspection_required": True,
                "meter_reading": "980",
                "completed_at": now - timedelta(days=1),
                "item_name": "Trackter Engine Oil",
                "expense": {
                    "item_name": "Trackter Engine Oil",
                    "quantity": 1,
                    "unit_price": Decimal("3500.00"),
                },
            },
        ]

        for blueprint in task_blueprints:
            asset = blueprint["asset"]
            item = items.get(blueprint["item_name"])
            task, changed = self._upsert_lookup(
                ScheduleTask,
                module_key,
                lookup={
                    "title": blueprint["title"],
                    "asset_tag": asset.asset_tag,
                    "service_type": blueprint["service_type"],
                },
                defaults={
                    "asset_name": asset.name,
                    "category": asset.category.name,
                    "assignee": blueprint["assignee"],
                    "assigned_at": now - timedelta(days=3),
                    "due_date": blueprint["due_date"],
                    "risk": blueprint["risk"],
                    "stage": blueprint["stage"],
                    "progress": blueprint["progress"],
                    "inspection_required": blueprint["inspection_required"],
                    "meter_reading": blueprint["meter_reading"],
                    "last_service_date": now - timedelta(days=30),
                    "consumed_item_id": item.id if item else None,
                    "consumed_item_name": blueprint["item_name"],
                    "consumed_quantity": 1,
                    "inventory_applied": blueprint["stage"]
                    == ScheduleTask.Stage.COMPLETED,
                    "completed_at": blueprint["completed_at"],
                },
            )
            if changed:
                task.save(update_fields=changed)
            if blueprint["expense"]:
                self._ensure_expense_record(
                    module_key, task, blueprint["expense"], item
                )

    def _ensure_expense_record(
        self, module_key: str, task: ScheduleTask, payload: dict, item: Item | None
    ):
        quantity = payload["quantity"]
        unit_price = payload["unit_price"]
        record, changed = self._upsert_lookup(
            ExpenseRecord,
            module_key,
            lookup={"task_reference": str(task.id)},
            defaults={
                "task_title": task.title,
                "service_type": task.service_type,
                "asset_tag": task.asset_tag,
                "assignee": task.assignee,
                "assigned_at": task.assigned_at,
                "completed_at": task.completed_at,
                "item": item,
                "item_name": payload["item_name"],
                "quantity": quantity,
                "unit_price": unit_price,
                "total_cost": unit_price * quantity,
            },
        )
        if changed:
            record.save(update_fields=changed)

    def _upsert_lookup(self, model, module_key: str, lookup: dict, defaults: dict):
        instance, created = model.objects.get_or_create(
            module=module_key, defaults=defaults, **lookup
        )
        changed_fields = []
        if created:
            return instance, []

        for field_name, field_value in defaults.items():
            if getattr(instance, field_name) != field_value:
                setattr(instance, field_name, field_value)
                changed_fields.append(field_name)
        return instance, changed_fields
