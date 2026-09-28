import logging
from rest_framework.response import Response
from .models import RoleDefinition

logger = logging.getLogger(__name__)


def _safe_api_error(exc, fallback_message="Unexpected server error."):
    logger.exception("API Error:")
    msg = str(exc) if hasattr(exc, "detail") else fallback_message
    return Response({"error": msg}, status=500)


def _resolve_role_permissions(role_ids):
    merged = []
    for rid in role_ids:
        try:
            r = RoleDefinition.objects.get(id=rid)
            merged.extend(r.permissions.get("actions", []))
        except RoleDefinition.DoesNotExist:
            continue
    return list(set(merged))


def _derive_access_from_permissions(permissions):
    modules = set()
    for p in permissions:
        if ":" in p:
            modules.add(p.split(":")[0])
    return list(modules), permissions
