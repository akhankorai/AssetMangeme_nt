import os

from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate


def _env_flag(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def ensure_default_admin(sender, **kwargs):
    if not _env_flag("BOOTSTRAP_ADMIN_ON_MIGRATE", True):
        return

    username = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin").strip() or "admin"
    email = (
        os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com").strip()
        or "admin@example.com"
    )
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin@12345")
    force_password_reset = _env_flag("BOOTSTRAP_ADMIN_FORCE_PASSWORD_RESET", False)

    user_model = get_user_model()
    user, created = user_model.objects.get_or_create(
        username=username,
        defaults={
            "email": email,
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        },
    )

    changed_fields = []
    if user.email != email:
        user.email = email
        changed_fields.append("email")
    if not user.is_staff:
        user.is_staff = True
        changed_fields.append("is_staff")
    if not user.is_superuser:
        user.is_superuser = True
        changed_fields.append("is_superuser")
    if not user.is_active:
        user.is_active = True
        changed_fields.append("is_active")
    if created or force_password_reset:
        user.set_password(password)
        changed_fields.append("password")

    if changed_fields:
        user.save(update_fields=changed_fields)


def register_auth_bootstrap():
    post_migrate.connect(
        ensure_default_admin,
        dispatch_uid="assets.ensure_default_admin",
    )
