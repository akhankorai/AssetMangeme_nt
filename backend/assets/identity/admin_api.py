from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from ..models import (
    RoleDefinition,
    UserAccessPolicy,
)
from .services import _safe_api_error
from .auth_api import CsrfExemptSessionAuthentication


def _admin_only(request):
    return bool(
        request.user.is_authenticated
        and (request.user.is_superuser or request.user.is_staff)
    )


def _resolve_role_access(role_ids):
    roles = RoleDefinition.objects.filter(id__in=role_ids, is_active=True)
    allowed_modules = sorted(
        {module for role in roles for module in (role.allowed_modules or [])}
    )
    allowed_actions = sorted(
        {action for role in roles for action in (role.allowed_actions or [])}
    )
    return allowed_modules, allowed_actions


def _resolve_role_permissions(role_ids):
    roles = RoleDefinition.objects.filter(id__in=role_ids, is_active=True)
    merged = {}
    for role in roles:
        permissions = role.permissions or {}
        if not isinstance(permissions, dict):
            continue
        for module_key, subtypes in permissions.items():
            if not isinstance(subtypes, dict):
                continue
            module_merged = merged.setdefault(module_key, {})
            for subtype_key, action_map in subtypes.items():
                if not isinstance(action_map, dict):
                    continue
                subtype_merged = module_merged.setdefault(subtype_key, {})
                for action_key, enabled in action_map.items():
                    if bool(enabled):
                        subtype_merged[action_key] = True
                if not subtype_merged:
                    module_merged.pop(subtype_key, None)
            if not module_merged:
                merged.pop(module_key, None)
    return merged


def _derive_access_from_permissions(permissions):
    if not isinstance(permissions, dict):
        return [], []

    modules = set()
    actions = set()
    for module_key, subtypes in permissions.items():
        if not isinstance(subtypes, dict):
            continue
        module_has_any = False
        for _, action_map in subtypes.items():
            if not isinstance(action_map, dict):
                continue
            for action_key, enabled in action_map.items():
                if bool(enabled):
                    module_has_any = True
                    actions.add(str(action_key))
        if module_has_any:
            modules.add(str(module_key))
    return sorted(modules), sorted(actions)


@api_view(["GET", "POST"])
@csrf_exempt
@authentication_classes([CsrfExemptSessionAuthentication])
def admin_users(request):

    if not _admin_only(request):
        return Response(
            {"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN
        )

    User = get_user_model()

    try:
        if request.method == "GET":
            users = User.objects.all().order_by("username")
            rows = []
            for user in users:
                policy, _ = UserAccessPolicy.objects.get_or_create(user=user)
                role_permissions = _resolve_role_permissions(
                    policy.assigned_role_ids or []
                )
                role_modules, role_actions = _derive_access_from_permissions(
                    role_permissions
                )
                rows.append(
                    {
                        "id": user.id,
                        "username": user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "email": user.email,
                        "is_active": bool(user.is_active),
                        "is_staff": bool(user.is_staff),
                        "is_superuser": bool(user.is_superuser),
                        "allowed_modules": role_modules,
                        "allowed_actions": role_actions,
                        "assigned_role_ids": policy.assigned_role_ids or [],
                    }
                )
            return Response(rows)

        payload = request.data or {}
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()
        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=str(payload.get("first_name", "")).strip(),
            last_name=str(payload.get("last_name", "")).strip(),
            email=str(payload.get("email", "")).strip(),
        )
        user.is_active = bool(payload.get("is_active", True))
        user.is_staff = bool(payload.get("is_staff", True))
        user.is_superuser = bool(payload.get("is_superuser", False))
        user.save(update_fields=["is_active", "is_staff", "is_superuser"])

        policy, _ = UserAccessPolicy.objects.get_or_create(user=user)
        assigned_role_ids = payload.get("assigned_role_ids") or []
        role_modules, role_actions = _resolve_role_access(assigned_role_ids)
        policy.assigned_role_ids = assigned_role_ids
        policy.allowed_modules = role_modules
        policy.allowed_actions = role_actions
        policy.save(
            update_fields=["assigned_role_ids", "allowed_modules", "allowed_actions"]
        )

        return Response(
            {"id": user.id, "detail": "User created."}, status=status.HTTP_201_CREATED
        )
    except Exception as exc:
        return _safe_api_error(exc, "User operation failed.")


@api_view(["PATCH", "DELETE"])
@csrf_exempt
@authentication_classes([CsrfExemptSessionAuthentication])
def admin_user_detail(request, user_id: int):
    if not _admin_only(request):
        return Response(
            {"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN
        )

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        if request.method == "DELETE":
            if request.user.id == user.id:
                return Response(
                    {"detail": "You cannot delete your own account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            UserAccessPolicy.objects.filter(user=user).delete()
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        payload = request.data or {}
        for field in ["first_name", "last_name", "email"]:
            if field in payload:
                setattr(user, field, str(payload.get(field) or "").strip())
        for flag in ["is_active", "is_staff", "is_superuser"]:
            if flag in payload:
                setattr(user, flag, bool(payload.get(flag)))
        if payload.get("new_password"):
            user.set_password(str(payload.get("new_password")))
        user.save()

        policy, _ = UserAccessPolicy.objects.get_or_create(user=user)
        if "assigned_role_ids" in payload:
            policy.assigned_role_ids = payload.get("assigned_role_ids") or []
        if "assigned_role_ids" in payload:
            role_modules, role_actions = _resolve_role_access(policy.assigned_role_ids)
            policy.allowed_modules = role_modules
            policy.allowed_actions = role_actions
        policy.save()

        return Response({"detail": "User updated."})
    except Exception as exc:
        return _safe_api_error(exc, "User update/delete failed.")


@api_view(["GET", "POST"])
@csrf_exempt
@authentication_classes([CsrfExemptSessionAuthentication])
def admin_roles(request):
    if not _admin_only(request):
        return Response(
            {"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN
        )

    try:
        if request.method == "GET":
            roles = RoleDefinition.objects.all().order_by("name")
            return Response(
                [
                    {
                        "id": role.id,
                        "name": role.name,
                        "description": role.description,
                        "permissions": role.permissions or {},
                        "allowed_modules": role.allowed_modules or [],
                        "allowed_actions": role.allowed_actions or [],
                        "is_active": bool(role.is_active),
                    }
                    for role in roles
                ]
            )

        payload = request.data or {}
        name = str(payload.get("name", "")).strip()
        if not name:
            return Response(
                {"detail": "Role name is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if RoleDefinition.objects.filter(name__iexact=name).exists():
            return Response(
                {"detail": "Role already exists."}, status=status.HTTP_400_BAD_REQUEST
            )

        permissions = payload.get("permissions") or {}
        derived_modules, derived_actions = _derive_access_from_permissions(permissions)
        explicit_modules = payload.get("allowed_modules") or []
        explicit_actions = payload.get("allowed_actions") or []
        role = RoleDefinition.objects.create(
            name=name,
            description=str(payload.get("description", "")).strip(),
            permissions=permissions,
            allowed_modules=sorted(set([*derived_modules, *explicit_modules])),
            allowed_actions=sorted(set([*derived_actions, *explicit_actions])),
            is_active=bool(payload.get("is_active", True)),
        )
        return Response(
            {"id": role.id, "detail": "Role created."}, status=status.HTTP_201_CREATED
        )
    except Exception as exc:
        return _safe_api_error(exc, "Role operation failed.")


@api_view(["PATCH", "DELETE"])
@csrf_exempt
@authentication_classes([CsrfExemptSessionAuthentication])
def admin_role_detail(request, role_id: int):
    if not _admin_only(request):
        return Response(
            {"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN
        )

    try:
        role = RoleDefinition.objects.get(id=role_id)
    except RoleDefinition.DoesNotExist:
        return Response({"detail": "Role not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        if request.method == "DELETE":
            role.delete()
            policies = UserAccessPolicy.objects.exclude(assigned_role_ids=None)
            for policy in policies:
                existing_ids = policy.assigned_role_ids or []
                if role_id not in existing_ids:
                    continue
                next_ids = [
                    assigned_id
                    for assigned_id in existing_ids
                    if assigned_id != role_id
                ]
                role_modules, role_actions = _resolve_role_access(next_ids)
                policy.assigned_role_ids = next_ids
                policy.allowed_modules = role_modules
                policy.allowed_actions = role_actions
                policy.save(
                    update_fields=[
                        "assigned_role_ids",
                        "allowed_modules",
                        "allowed_actions",
                    ]
                )
            return Response(status=status.HTTP_204_NO_CONTENT)

        payload = request.data or {}
        if "name" in payload:
            next_name = str(payload.get("name") or "").strip()
            if not next_name:
                return Response(
                    {"detail": "Role name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            role.name = next_name
        if "description" in payload:
            role.description = str(payload.get("description") or "").strip()
        if "permissions" in payload:
            role.permissions = payload.get("permissions") or {}
            derived_modules, derived_actions = _derive_access_from_permissions(
                role.permissions
            )
            role.allowed_modules = derived_modules
            role.allowed_actions = derived_actions
        if "allowed_modules" in payload:
            role.allowed_modules = payload.get("allowed_modules") or []
        if "allowed_actions" in payload:
            role.allowed_actions = payload.get("allowed_actions") or []
        if "is_active" in payload:
            role.is_active = bool(payload.get("is_active"))
        role.save()
        return Response({"detail": "Role updated."})
    except Exception as exc:
        return _safe_api_error(exc, "Role update/delete failed.")
