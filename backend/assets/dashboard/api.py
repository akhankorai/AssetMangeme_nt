from django.db import DatabaseError
from django.db.models import Count
from django.utils.timesince import timesince
from rest_framework.response import Response
from rest_framework.decorators import api_view
from ..modules import get_module_filter, module_from_request
from ..models import (
    Asset,
    Category,
    Location,
)


def _time_ago(value):
    if not value:
        return "just now"
    return f"{timesince(value).split(',')[0]} ago"


def _empty_dashboard_payload(
    error_message="Dashboard data is temporarily unavailable.",
):
    return {
        "overview": {
            "total_assets": 0,
            "available_assets": 0,
            "assigned_assets": 0,
            "maintenance_assets": 0,
            "retired_assets": 0,
            "categories": 0,
            "locations": 0,
        },
        "alerts": [],
        "recent_activity": [],
        "upcoming_maintenance": [],
        "distribution": [
            {"label": "Excellent", "value": 0, "tone": "excellent"},
            {"label": "Good", "value": 0, "tone": "good"},
            {"label": "Fair", "value": 0, "tone": "fair"},
            {"label": "Poor", "value": 0, "tone": "poor"},
        ],
        "location_feed": [],
        "error": error_message,
    }


@api_view(["GET"])
def dashboard_summary(request):
    try:
        module_key = module_from_request(request)
        assets = Asset.objects.select_related("category", "location").filter(
            get_module_filter(module_key)
        )
        total_assets = assets.count()
        status_counts = {
            item["status"]: item["total"]
            for item in assets.order_by().values("status").annotate(total=Count("id"))
        }
        maintenance_assets = list(
            assets.filter(status=Asset.Status.MAINTENANCE).order_by("-updated_at")[:5]
        )
        assigned_assets = list(
            assets.filter(status=Asset.Status.ASSIGNED).order_by("-updated_at")[:5]
        )
        recent_assets = list(assets.order_by("-updated_at")[:6])
        location_feed = list(
            Location.objects.filter(get_module_filter(module_key))
            .order_by()
            .annotate(asset_count=Count("assets"))
            .order_by("-asset_count", "site", "name")[:5]
        )

        alerts = [
            {
                "asset_id": asset.id,
                "tone": "critical",
                "title": f"{asset.name} requires maintenance",
                "age": _time_ago(asset.updated_at),
                "text": (
                    f"{asset.asset_tag} is currently in maintenance at "
                    f"{asset.location or 'an unassigned location'}."
                ),
                "status_filter": Asset.Status.MAINTENANCE,
                "location_name": asset.location.name if asset.location else "",
                "actions": ["View asset", "Filter maintenance"],
            }
            for asset in maintenance_assets[:3]
        ]

        if not alerts and assigned_assets:
            alerts = [
                {
                    "asset_id": asset.id,
                    "tone": "warning",
                    "title": f"{asset.name} is assigned",
                    "age": _time_ago(asset.updated_at),
                    "text": f"{asset.asset_tag} is assigned to {asset.assigned_to or 'an active team member'}.",
                    "status_filter": Asset.Status.ASSIGNED,
                    "location_name": asset.location.name if asset.location else "",
                    "actions": ["View asset", "Filter assigned"],
                }
                for asset in assigned_assets[:3]
            ]

        distribution = [
            {
                "label": "Excellent",
                "value": status_counts.get(Asset.Status.AVAILABLE, 0),
                "tone": "excellent",
            },
            {
                "label": "Good",
                "value": status_counts.get(Asset.Status.ASSIGNED, 0),
                "tone": "good",
            },
            {
                "label": "Fair",
                "value": status_counts.get(Asset.Status.MAINTENANCE, 0),
                "tone": "fair",
            },
            {
                "label": "Poor",
                "value": status_counts.get(Asset.Status.RETIRED, 0),
                "tone": "poor",
            },
        ]

        upcoming_maintenance = [
            {
                "id": asset.id,
                "asset": asset.name,
                "asset_tag": asset.asset_tag,
                "priority": "Critical"
                if asset.status == Asset.Status.MAINTENANCE
                else "Medium",
                "date": asset.purchase_date.isoformat() if asset.purchase_date else "",
                "tech": asset.assigned_to or "Unassigned",
                "status": asset.status,
                "location_name": asset.location.name if asset.location else "",
            }
            for asset in [*maintenance_assets, *assigned_assets][:6]
        ]

        recent_activity = [
            {
                "asset_id": asset.id,
                "person": asset.assigned_to or "System",
                "action": f"{asset.name} updated with status {asset.get_status_display().lower()}",
                "time": _time_ago(asset.updated_at),
            }
            for asset in recent_assets
        ]

        return Response(
            {
                "overview": {
                    "total_assets": total_assets,
                    "available_assets": status_counts.get(Asset.Status.AVAILABLE, 0),
                    "assigned_assets": status_counts.get(Asset.Status.ASSIGNED, 0),
                    "maintenance_assets": status_counts.get(
                        Asset.Status.MAINTENANCE, 0
                    ),
                    "retired_assets": status_counts.get(Asset.Status.RETIRED, 0),
                    "categories": Category.objects.filter(
                        get_module_filter(module_key)
                    ).count(),
                    "locations": Location.objects.filter(
                        get_module_filter(module_key)
                    ).count(),
                },
                "alerts": alerts,
                "recent_activity": recent_activity,
                "upcoming_maintenance": upcoming_maintenance,
                "distribution": distribution,
                "location_feed": [
                    {
                        "id": location.id,
                        "name": location.name,
                        "description": location.description,
                        "asset_count": location.asset_count,
                    }
                    for location in location_feed
                ],
            }
        )
    except DatabaseError:
        return Response(_empty_dashboard_payload())
