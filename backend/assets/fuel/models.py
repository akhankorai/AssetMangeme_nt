from django.db import models


from assets.core.models import ModuleScopedModel, Item


class FuelDemand(ModuleScopedModel):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        FULFILLED = "fulfilled", "Fulfilled"

    asset_tag = models.CharField(max_length=120)
    asset_name = models.CharField(max_length=160, blank=True)
    request_date = models.DateField()
    station = models.CharField(max_length=160, blank=True)
    fuel_item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        related_name="fuel_demands",
    )
    liters = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    meter_reading = models.DecimalField(max_digits=12, decimal_places=2)
    previous_meter_reading = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    distance_travelled = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    average_distance_per_liter = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.REQUESTED
    )
    inspection_completed = models.BooleanField(default=False)
    allocated_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True)

    class Meta:
        app_label = "assets"
        ordering = ["-request_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.asset_tag} fuel demand on {self.request_date}"

    @property
    def formatted_id(self) -> str:
        return f"FUEL-{self.id:04d}" if self.id else ""
