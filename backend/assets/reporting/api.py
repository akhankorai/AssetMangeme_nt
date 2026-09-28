from datetime import date
from calendar import monthrange
from django.http import HttpResponse
from django.db import DatabaseError
from rest_framework.response import Response
from rest_framework import status
from ..modules import get_module_filter, get_module_label, module_from_request
from ..models import (
    Asset,
    ExpenseRecord,
    FuelDemand,
    Item,
    ScheduleTask,
    TeamMember,
)
from ..fuel.services import sync_fuel_history
from .services import (
    build_assets_payload,
    build_expenses_payload,
    build_fuel_payload,
    build_inventory_payload,
    build_monthly_schedule_inventory_demand_payload,
    build_tasks_payload,
    build_team_payload,
    render_report_pdf,
)


def export_report(request):
    report_type = (request.query_params.get("type") or "assets").strip().lower()
    frequency = (request.query_params.get("frequency") or "monthly").strip().lower()
    date_from_raw = request.query_params.get("date_from")
    date_to_raw = request.query_params.get("date_to")
    report_scope = (request.query_params.get("scope") or "overall").strip().lower()
    asset_tag_filter = (request.query_params.get("asset_tag") or "").strip()
    station_filter = (request.query_params.get("station") or "").strip()
    module_key = module_from_request(request)
    module_label = get_module_label(module_key)

    if frequency not in {"daily", "monthly"}:
        return Response(
            {"detail": "Frequency must be daily or monthly."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        today = date.today()
        if frequency == "monthly":
            if date_from_raw and date_to_raw:
                date_from = date.fromisoformat(date_from_raw)
                date_to = date.fromisoformat(date_to_raw)
            elif date_from_raw:
                anchor = date.fromisoformat(date_from_raw)
                date_from = anchor
                date_to = anchor.replace(day=monthrange(anchor.year, anchor.month)[1])
            elif date_to_raw:
                anchor = date.fromisoformat(date_to_raw)
                date_from = anchor.replace(day=1)
                date_to = anchor
            else:
                anchor = today
                date_from = anchor.replace(day=1)
                date_to = anchor.replace(day=monthrange(anchor.year, anchor.month)[1])
        else:
            date_from = date.fromisoformat(date_from_raw) if date_from_raw else today
            date_to = date.fromisoformat(date_to_raw) if date_to_raw else date_from
    except ValueError:
        return Response(
            {"detail": "Date range must use YYYY-MM-DD format."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if date_from > date_to:
        return Response(
            {"detail": "From date cannot be after To date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        fuel_scope_label = "Overall Report"
        station_asset_tags = []
        if station_filter:
            station_asset_tags = list(
                Asset.objects.filter(
                    get_module_filter(module_key), location__name=station_filter
                ).values_list("asset_tag", flat=True)
            )
        if report_type == "fuel-consumption":
            sync_tags = None
            if report_scope == "asset" and asset_tag_filter:
                sync_tags = [asset_tag_filter]
            elif report_scope == "station" and station_asset_tags:
                sync_tags = station_asset_tags
            sync_fuel_history(module_key=module_key, asset_tags=sync_tags)
        fuel_queryset = FuelDemand.objects.select_related("fuel_item").filter(
            get_module_filter(module_key),
            status=FuelDemand.Status.FULFILLED,
        )
        assets_queryset = Asset.objects.select_related("category", "location").filter(
            get_module_filter(module_key)
        )
        tasks_queryset = ScheduleTask.objects.filter(get_module_filter(module_key))
        expenses_queryset = ExpenseRecord.objects.select_related("item").filter(
            get_module_filter(module_key)
        )
        if report_type == "fuel-consumption":
            if report_scope == "asset":
                if not asset_tag_filter:
                    return Response(
                        {
                            "detail": "Choose a vehicle asset for the single asset report."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                fuel_queryset = fuel_queryset.filter(asset_tag=asset_tag_filter)
                fuel_scope_label = f"Report By Single Asset ({asset_tag_filter})"
            elif report_scope == "station":
                if not station_filter:
                    return Response(
                        {"detail": "Choose a station for the station report."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                fuel_queryset = fuel_queryset.filter(station=station_filter)
                fuel_scope_label = f"Report By Station ({station_filter})"
            else:
                fuel_scope_label = "Overall Report"
        elif report_scope == "asset" and asset_tag_filter:
            assets_queryset = assets_queryset.filter(asset_tag=asset_tag_filter)
            tasks_queryset = tasks_queryset.filter(asset_tag=asset_tag_filter)
            expenses_queryset = expenses_queryset.filter(asset_tag=asset_tag_filter)
        elif report_scope == "station" and station_filter:
            assets_queryset = assets_queryset.filter(location__name=station_filter)
            if station_asset_tags:
                tasks_queryset = tasks_queryset.filter(asset_tag__in=station_asset_tags)
                expenses_queryset = expenses_queryset.filter(
                    asset_tag__in=station_asset_tags
                )
            else:
                tasks_queryset = tasks_queryset.none()
                expenses_queryset = expenses_queryset.none()

        report_builders = {
            "assets": lambda: build_assets_payload(
                assets_queryset.order_by("asset_tag"),
                frequency,
                date_from,
                date_to,
                module_label,
            ),
            "inventory-items": lambda: build_inventory_payload(
                Item.objects.filter(get_module_filter(module_key)).order_by("name"),
                frequency,
                date_from,
                date_to,
                module_label,
            ),
            "team": lambda: build_team_payload(
                TeamMember.objects.select_related("employee_category")
                .filter(get_module_filter(module_key))
                .order_by("name"),
                frequency,
                date_from,
                date_to,
                module_label,
            ),
            "tasks": lambda: build_tasks_payload(
                tasks_queryset.order_by("-assigned_at", "-created_at"),
                frequency,
                date_from,
                date_to,
                module_label,
            ),
            "expenses": lambda: build_expenses_payload(
                expenses_queryset.order_by("-completed_at", "-created_at"),
                frequency,
                date_from,
                date_to,
                module_label,
            ),
            "fuel-consumption": lambda: build_fuel_payload(
                fuel_queryset.order_by("-request_date", "-created_at"),
                frequency,
                date_from,
                date_to,
                module_label,
                fuel_scope_label,
            ),
            "monthly-schedule-inventory-demand": lambda: (
                build_monthly_schedule_inventory_demand_payload(
                    tasks_queryset.order_by("due_date", "created_at"),
                    Item.objects.filter(get_module_filter(module_key)).order_by("name"),
                    frequency,
                    date_from,
                    date_to,
                    module_label,
                )
            ),
        }

        if report_type not in report_builders:
            return Response(
                {"detail": "Unknown report type."}, status=status.HTTP_400_BAD_REQUEST
            )

        payload = report_builders[report_type]()
        pdf_bytes = render_report_pdf(payload)
        filename = f"{module_key}-{report_type}-{frequency}-{date_from.isoformat()}-to-{date_to.isoformat()}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
    except DatabaseError:
        return Response(
            {
                "detail": "Report data is unavailable until backend migrations are applied."
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except ModuleNotFoundError as exc:
        if exc.name == "reportlab":
            return Response(
                {
                    "detail": "PDF export requires the reportlab package to be installed."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        raise
