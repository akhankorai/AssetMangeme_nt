from django.db import models

from ..modules import DEFAULT_MODULE_KEY, MODULE_CHOICES
from ..modules.registry import MODULE_DEFINITIONS


class AssetModule(models.TextChoices):
    VEHICLE_ASSETS = MODULE_DEFINITIONS[0].key, MODULE_DEFINITIONS[0].label
    INFORMATION_TECHNOLOGY = MODULE_DEFINITIONS[1].key, MODULE_DEFINITIONS[1].label
    FEEDING = MODULE_DEFINITIONS[2].key, MODULE_DEFINITIONS[2].label
    CLEANING = MODULE_DEFINITIONS[3].key, MODULE_DEFINITIONS[3].label
    SHED_FANS = MODULE_DEFINITIONS[4].key, MODULE_DEFINITIONS[4].label
    ELECTRICAL_TOOLS = MODULE_DEFINITIONS[5].key, MODULE_DEFINITIONS[5].label
    PAINT_TOOLS = MODULE_DEFINITIONS[6].key, MODULE_DEFINITIONS[6].label
    PLUMBING_TOOLS = MODULE_DEFINITIONS[7].key, MODULE_DEFINITIONS[7].label
    WELDING_TOOLS = MODULE_DEFINITIONS[8].key, MODULE_DEFINITIONS[8].label
    FURNITURE = MODULE_DEFINITIONS[9].key, MODULE_DEFINITIONS[9].label


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "assets"
        abstract = True


class ModuleScopedModel(TimeStampedModel):
    module = models.CharField(
        max_length=64,
        choices=MODULE_CHOICES,
        default=DEFAULT_MODULE_KEY,
        db_index=True,
    )

    class Meta:
        app_label = "assets"
        abstract = True


class Category(ModuleScopedModel):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "assets"
        ordering = ["name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                fields=["module", "name"], name="assets_category_module_name_uniq"
            ),
        ]

    def __str__(self) -> str:
        return self.name


class Item(ModuleScopedModel):
    name = models.CharField(max_length=160)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    inventory_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        app_label = "assets"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "name"], name="assets_item_module_name_uniq"
            ),
        ]

    def __str__(self) -> str:
        return self.name


class ServiceType(ModuleScopedModel):
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    interval_days = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "assets"
        ordering = ["name"]
        verbose_name_plural = "service types"
        constraints = [
            models.UniqueConstraint(
                fields=["module", "name"], name="assets_service_type_module_name_uniq"
            ),
        ]

    def __str__(self) -> str:
        return self.name


class RegularInspectionItem(ModuleScopedModel):
    category = models.CharField(max_length=120)
    check_item = models.CharField(max_length=220)
    standard = models.CharField(max_length=220, blank=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "assets"
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "category", "check_item"],
                name="assets_regular_inspection_module_category_item_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.category}: {self.check_item}"


class EmployeeCategory(ModuleScopedModel):
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "assets"
        ordering = ["name"]
        verbose_name_plural = "employee categories"
        constraints = [
            models.UniqueConstraint(
                fields=["module", "name"],
                name="assets_employee_category_module_name_uniq",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class TeamMember(ModuleScopedModel):
    name = models.CharField(max_length=160)
    serial_number = models.CharField(max_length=120)
    employee_category = models.ForeignKey(
        EmployeeCategory,
        on_delete=models.PROTECT,
        related_name="members",
    )
    designation = models.CharField(max_length=160, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "assets"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "serial_number"],
                name="assets_team_member_module_serial_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.serial_number} - {self.name}"


class Location(ModuleScopedModel):
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    site = models.CharField(max_length=120, blank=True)
    room = models.CharField(max_length=120, blank=True)

    class Meta:
        app_label = "assets"
        ordering = ["site", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "name", "site", "room"],
                name="assets_location_module_path_uniq",
            ),
        ]

    def __str__(self) -> str:
        parts = [self.site, self.name, self.room]
        return " / ".join(part for part in parts if part)


class Asset(ModuleScopedModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        ASSIGNED = "assigned", "Assigned"
        MAINTENANCE = "maintenance", "Maintenance"
        RETIRED = "retired", "Retired"

    asset_tag = models.CharField(max_length=80)
    name = models.CharField(max_length=160)
    serial_number = models.CharField(max_length=120, blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="assets"
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        related_name="assets",
        blank=True,
        null=True,
    )
    assigned_to = models.CharField(max_length=160, blank=True)
    purchase_date = models.DateField(blank=True, null=True)
    purchase_cost = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    notes = models.TextField(blank=True)

    class Meta:
        app_label = "assets"
        ordering = ["asset_tag"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "asset_tag"], name="assets_asset_module_tag_uniq"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.asset_tag} - {self.name}"

    @property
    def formatted_id(self) -> str:
        return f"AST-{self.id:04d}" if self.id else ""
