import json
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes

from ..models import UserAccessPolicy
from .services import _resolve_role_permissions, _derive_access_from_permissions


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return


def _safe_api_error(exc, fallback_message="Unexpected server error."):
    message = str(exc).strip() or fallback_message
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


def _build_access_policy_payload(user):
    policy, _ = UserAccessPolicy.objects.get_or_create(user=user)
    merged_permissions = _resolve_role_permissions(policy.assigned_role_ids or [])
    derived_modules, derived_actions = _derive_access_from_permissions(
        merged_permissions
    )
    return {
        "assigned_role_ids": policy.assigned_role_ids or [],
        "allowed_modules": derived_modules,
        "allowed_actions": derived_actions,
        "permissions": merged_permissions,
    }


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})


@csrf_exempt
@api_view(["POST"])
def auth_login(request):
    payload = request.data or {}

    try:
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()

        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if not user:
            # Fallback for environments where auth backend resolution can fail
            # despite valid credentials in the default user table.
            User = get_user_model()
            candidate = User.objects.filter(username=username).first()
            if candidate and candidate.is_active and candidate.check_password(password):
                user = candidate
        if not user:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, user)
        get_token(request)
        return Response(
            {
                "is_authenticated": True,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "is_staff": bool(user.is_staff),
                "is_superuser": bool(user.is_superuser),
                "access_policy": _build_access_policy_payload(user),
            }
        )
    except Exception as exc:
        return _safe_api_error(exc, "Login failed.")


@api_view(["GET", "POST"])
def auth_logout(request):
    logout(request)
    return Response({"is_authenticated": False})


@api_view(["GET"])
def auth_me(request):
    get_token(request)
    user = request.user
    if not user.is_authenticated:
        return Response({"is_authenticated": False})

    return Response(
        {
            "is_authenticated": True,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_staff": bool(user.is_staff),
            "is_superuser": bool(user.is_superuser),
            "access_policy": _build_access_policy_payload(user),
        }
    )


@csrf_exempt
@api_view(["PATCH"])
@authentication_classes([CsrfExemptSessionAuthentication])
def auth_profile(request):
    user = request.user
    if not user.is_authenticated:
        return Response(
            {"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED
        )

    payload = request.data or {}
    user.first_name = str(payload.get("first_name", user.first_name or "")).strip()
    user.last_name = str(payload.get("last_name", user.last_name or "")).strip()
    user.email = str(payload.get("email", user.email or "")).strip()
    user.save(update_fields=["first_name", "last_name", "email"])

    return Response(
        {
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        }
    )


@csrf_exempt
@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])
def auth_change_password(request):
    user = request.user
    if not user.is_authenticated:
        return Response(
            {"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED
        )

    current_password = str(request.data.get("current_password", "")).strip()
    new_password = str(request.data.get("new_password", "")).strip()
    if not current_password or not new_password:
        return Response(
            {"detail": "Current and new password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user.check_password(current_password):
        return Response(
            {"detail": "Current password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(new_password) < 8:
        return Response(
            {"detail": "New password must be at least 8 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"detail": "Password updated successfully."})
