from django.urls import path

from .api import (
    auth_login,
    auth_profile,
    auth_change_password,
    auth_logout,
    auth_me,
    health_check,
    admin_users,
    admin_user_detail,
    admin_roles,
    admin_role_detail,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("auth/login/", auth_login, name="auth-login"),
    path("auth/logout/", auth_logout, name="auth-logout"),
    path("auth/me/", auth_me, name="auth-me"),
    path("auth/profile/", auth_profile, name="auth-profile"),
    path("auth/change-password/", auth_change_password, name="auth-change-password"),
    path("admin/users/", admin_users, name="admin-users"),
    path("admin/users/<int:user_id>/", admin_user_detail, name="admin-user-detail"),
    path("admin/roles/", admin_roles, name="admin-roles"),
    path("admin/roles/<int:role_id>/", admin_role_detail, name="admin-role-detail"),
]
