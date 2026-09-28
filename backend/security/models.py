from django.conf import settings
from django.db import models
from assets.core.models import TimeStampedModel

class UserAccessPolicy(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="access_policy"
    )
    allowed_modules = models.JSONField(default=list, blank=True)
    allowed_actions = models.JSONField(default=list, blank=True)
    assigned_role_ids = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "assets_useraccesspolicy"
        ordering = ["user__username"]

    def __str__(self) -> str:
        return f"Access policy for {self.user.username}"


class RoleDefinition(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    description = models.CharField(max_length=255, blank=True)
    permissions = models.JSONField(default=dict, blank=True)
    allowed_modules = models.JSONField(default=list, blank=True)
    allowed_actions = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "assets_roledefinition"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
