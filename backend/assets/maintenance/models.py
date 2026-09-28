from django.db import models


from assets.core.models import ModuleScopedModel, Item


class ExpenseRecord(ModuleScopedModel):
    task_reference = models.CharField(max_length=120)
    task_title = models.CharField(max_length=220)
    service_type = models.CharField(max_length=160, blank=True)
    asset_tag = models.CharField(max_length=120)
    assignee = models.CharField(max_length=160, blank=True)
    assigned_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    item = models.ForeignKey(
        Item,
        on_delete=models.SET_NULL,
        related_name="expense_records",
        blank=True,
        null=True,
    )
    item_name = models.CharField(max_length=160, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        app_label = "assets"
        ordering = ["-completed_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "task_reference"],
                name="assets_expense_module_task_ref_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.task_title} ({self.asset_tag})"

    @property
    def formatted_id(self) -> str:
        return f"EXP-{self.id:04d}" if self.id else ""


class ScheduleTask(ModuleScopedModel):
    class Risk(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"

    class Stage(models.TextChoices):
        PLANNED = "planned", "Planned"
        INSPECTION = "inspection", "Inspection"
        AWAITING_PARTS = "awaiting_parts", "Awaiting Parts"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        DECLINED = "declined", "Declined"

    class ApprovalStatus(models.TextChoices):
        NOT_REQUIRED = "not_required", "Not Required"
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    title = models.CharField(max_length=220)
    service_type = models.CharField(max_length=160, blank=True, default="Emergency Repair")
    process_type = models.CharField(max_length=40, default="maintenance")
    asset_tag = models.CharField(max_length=120)
    asset_name = models.CharField(max_length=160, blank=True)
    category = models.CharField(max_length=120, blank=True)
    assignee = models.CharField(max_length=160, blank=True)
    assigned_at = models.DateTimeField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    risk = models.CharField(max_length=20, choices=Risk.choices, default=Risk.MEDIUM)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.PLANNED)
    progress = models.PositiveIntegerField(default=0)
    inspection_required = models.BooleanField(default=True)
    inspection_comment = models.TextField(blank=True)
    meter_reading = models.CharField(max_length=80, blank=True)
    last_service_date = models.DateTimeField(blank=True, null=True)
    consumed_item_id = models.PositiveIntegerField(blank=True, null=True)
    consumed_item_name = models.CharField(max_length=160, blank=True)
    consumed_quantity = models.PositiveIntegerField(default=1)
    inventory_applied = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    approval_status = models.CharField(max_length=30, choices=ApprovalStatus.choices, default=ApprovalStatus.NOT_REQUIRED)
    approval_remarks = models.TextField(blank=True)
    approved_by = models.CharField(max_length=160, blank=True)
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        app_label = "assets"
        ordering = ["-assigned_at", "-updated_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.asset_tag})"

    @property
    def formatted_id(self) -> str:
        return f"SCH-{self.id:04d}" if self.id else ""


class DailyInspectionRecord(ModuleScopedModel):
    inspection_date = models.DateField(db_index=True)
    asset_tag = models.CharField(max_length=120, db_index=True)
    asset_name = models.CharField(max_length=160, blank=True)
    category = models.CharField(max_length=120, blank=True)
    station = models.CharField(max_length=160, blank=True)
    checkpoints = models.JSONField(default=dict, blank=True)
    needs_maintenance = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        app_label = "assets"
        ordering = ["-inspection_date", "asset_tag"]
        constraints = [
            models.UniqueConstraint(
                fields=["module", "inspection_date", "asset_tag"],
                name="assets_daily_inspection_module_date_tag_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.asset_tag} - {self.inspection_date}"

    @property
    def formatted_id(self) -> str:
        return f"INSP-{self.id:04d}" if self.id else ""


class OutsideMaintenanceRecord(ModuleScopedModel):
    class Status(models.TextChoices):
        OUTSIDE_GATE = "outside_gate", "Outside Gate"
        INSIDE_GATE = "inside_gate", "Inside Gate"

    task = models.ForeignKey(
        ScheduleTask,
        on_delete=models.CASCADE,
        related_name="outside_maintenance_records",
        blank=True,
        null=True,
        help_text="Link to the emergency task if applicable.",
    )
    asset_name = models.CharField(max_length=160)
    asset_tag = models.CharField(max_length=120, blank=True)
    category = models.CharField(max_length=120, blank=True)
    meter_reading = models.CharField(max_length=80, blank=True)
    vendor = models.CharField(max_length=220, blank=True)
    service_type = models.CharField(max_length=160, blank=True)
    assignee = models.CharField(max_length=160, blank=True)
    notes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OUTSIDE_GATE
    )

    out_time = models.DateTimeField(auto_now_add=True)
    in_time = models.DateTimeField(blank=True, null=True)

    # Payment info (filled when marked inward)
    payment_amount = models.CharField(max_length=40, blank=True)
    payment_method = models.CharField(max_length=80, blank=True)
    payment_notes = models.TextField(blank=True)

    class Meta:
        app_label = "assets"
        ordering = ["-out_time"]

    def __str__(self) -> str:
        return f"Outside Maintenance for {self.asset_name} ({self.status})"

    @property
    def formatted_id(self) -> str:
        return f"OUTM-{self.id:04d}" if self.id else ""
