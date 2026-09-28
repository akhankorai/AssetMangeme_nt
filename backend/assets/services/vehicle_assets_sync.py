import json
import os
from dataclasses import dataclass
from datetime import date
from typing import Any
from urllib import error, parse, request

from django.db import transaction

from assets.models import Asset, AssetModule, Category, Location


VEHICLE_ASSETS_DEPARTMENT = os.getenv("VEHICLE_ASSETS_DEPARTMENT", "Vehicle Assets")
VEHICLE_ASSETS_API_BASE_URL = (
    os.getenv("VEHICLE_ASSETS_API_BASE_URL")
    or os.getenv("VITE_VEHICLE_ASSETS_API_BASE_URL")
    or os.getenv("VITE_VEHICLE_ASSETS_API_TARGET")
    or ""
).rstrip("/")
VEHICLE_ASSETS_AUTH_ENDPOINT = os.getenv(
    "VEHICLE_ASSETS_AUTH_ENDPOINT",
    os.getenv("VITE_VEHICLE_ASSETS_AUTH_ENDPOINT", "/api/TokenAuth/Authenticate"),
)
VEHICLE_ASSETS_LIST_ENDPOINT = os.getenv(
    "VEHICLE_ASSETS_LIST_ENDPOINT",
    "/api/services/app/AssetRegistrations/GetAll",
)
VEHICLE_ASSETS_API_BEARER_TOKEN = (
    os.getenv("VEHICLE_ASSETS_API_BEARER_TOKEN")
    or os.getenv("VITE_VEHICLE_ASSETS_API_BEARER_TOKEN")
    or ""
).strip()
VEHICLE_ASSETS_API_USERNAME = (
    os.getenv("VEHICLE_ASSETS_API_USERNAME")
    or os.getenv("VITE_VEHICLE_ASSETS_API_USERNAME")
    or ""
).strip()
VEHICLE_ASSETS_API_PASSWORD = (
    os.getenv("VEHICLE_ASSETS_API_PASSWORD")
    or os.getenv("VITE_VEHICLE_ASSETS_API_PASSWORD")
    or ""
).strip()
VEHICLE_ASSETS_TIMEOUT_SECONDS = int(os.getenv("VEHICLE_ASSETS_TIMEOUT_SECONDS", "15"))

_cached_token = ""


class VehicleAssetsSyncError(Exception):
    pass


@dataclass
class SyncResult:
    fetched: int
    created: int
    updated: int
    deleted: int


def _pick_value(source: dict[str, Any], keys: list[str], fallback: Any = "") -> Any:
    for key in keys:
        value = source.get(key)
        if value is None:
            continue
        if str(value).strip() == "":
            continue
        return value
    return fallback


def _normalize_status(raw_status: Any) -> str:
    status = str(raw_status or "").strip().lower()
    if status in {
        Asset.Status.AVAILABLE,
        Asset.Status.ASSIGNED,
        Asset.Status.MAINTENANCE,
        Asset.Status.RETIRED,
    }:
        return status
    return Asset.Status.AVAILABLE


def _normalize_purchase_date(raw_value: Any) -> date | None:
    text = str(raw_value or "").strip()
    if not text:
        return None
    date_text = text[:10]
    try:
        return date.fromisoformat(date_text)
    except ValueError:
        return None


def _is_vehicle_assets_department(item: dict[str, Any]) -> bool | None:
    department_keys = [
        "itemDepartmentName",
        "ItemDepartmentName",
        "item_department_name",
        "department",
        "Department",
        "departmentName",
        "DepartmentName",
        "dept",
        "Dept",
    ]
    raw_department = _pick_value(item, department_keys, "")
    if not str(raw_department).strip():
        return None
    return (
        str(raw_department).strip().lower() == VEHICLE_ASSETS_DEPARTMENT.strip().lower()
    )


def _extract_items(payload: Any) -> list[dict[str, Any]]:
    def unwrap_values(value: Any) -> list[Any] | None:
        if isinstance(value, list):
            return value
        if isinstance(value, dict) and isinstance(value.get("$values"), list):
            return value["$values"]
        return None

    direct = unwrap_values(payload)
    if direct is not None:
        return [entry for entry in direct if isinstance(entry, dict)]

    if isinstance(payload, dict):
        error_obj = payload.get("error")
        if isinstance(error_obj, dict) and error_obj.get("message"):
            raise VehicleAssetsSyncError(str(error_obj["message"]))

        result_text = payload.get("result")
        if isinstance(result_text, str):
            try:
                parsed = json.loads(result_text)
                return _extract_items(parsed)
            except json.JSONDecodeError:
                pass

        known_candidates = [
            payload.get("result", {}).get("items")
            if isinstance(payload.get("result"), dict)
            else None,
            payload.get("result", {}).get("Items")
            if isinstance(payload.get("result"), dict)
            else None,
            payload.get("result", {}).get("assetRegistrations")
            if isinstance(payload.get("result"), dict)
            else None,
            payload.get("result", {}).get("AssetRegistrations")
            if isinstance(payload.get("result"), dict)
            else None,
            payload.get("items"),
            payload.get("Items"),
            payload.get("data"),
            payload.get("Data"),
            payload.get("result"),
            payload.get("Result"),
        ]
        for candidate in known_candidates:
            values = unwrap_values(candidate)
            if values is not None:
                return [entry for entry in values if isinstance(entry, dict)]

    return []


def _normalize_vehicle_asset(item: dict[str, Any], index: int) -> dict[str, Any]:
    upstream_id = _pick_value(item, ["id", "Id", "assetId", "asset_id"], index + 1)
    asset_tag = str(
        _pick_value(
            item,
            [
                "asset_tag",
                "assetTag",
                "assetNo",
                "assetNoo",
                "assetCode",
                "AssetCode",
                "asset_code",
                "code",
                "Code",
                "AssetNo",
            ],
            "",
        )
        or upstream_id
        or ""
    ).strip()
    name = str(
        _pick_value(
            item,
            [
                "name",
                "Name",
                "assetName",
                "asset_name",
                "item",
                "Item",
                "itemName",
                "item_name",
            ],
            "",
        )
        or asset_tag
        or f"Asset {index + 1}"
    ).strip()

    condition = _pick_value(
        item, ["condition", "Condition", "assetCondition", "asset_condition"], ""
    )
    company = _pick_value(
        item, ["company", "Company", "companyName", "company_name"], ""
    )
    station = _pick_value(
        item, ["station", "Station", "stationName", "station_name"], ""
    )
    vendor = _pick_value(item, ["vendor", "Vendor", "vendorName", "vendor_name"], "")
    depreciation = _pick_value(
        item,
        ["depreciation", "Depreciation", "depreciationType", "depreciation_type"],
        "",
    )
    serial_no = _pick_value(
        item, ["serialNo", "SerialNo", "serial_no", "serialNumber", "serial_number"], ""
    )

    return {
        "asset_tag": asset_tag,
        "name": name,
        "status": _normalize_status(
            _pick_value(item, ["status", "Status"], condition or Asset.Status.AVAILABLE)
        ),
        "category_name": str(
            _pick_value(
                item,
                ["category_name", "categoryName", "category", "Category"],
                company or "Asset Registration",
            )
        ).strip(),
        "location_name": str(
            _pick_value(
                item, ["location_name", "locationName", "location", "Location"], station
            )
        ).strip(),
        "assigned_to": str(
            _pick_value(item, ["assigned_to", "assignedTo", "assignee", "Assignee"], "")
        ).strip(),
        "serial_number": str(serial_no or "").strip(),
        "purchase_date": _normalize_purchase_date(
            _pick_value(
                item,
                ["purchase_date", "purchaseDate", "purchaseOn", "PurchaseDate"],
                "",
            )
        ),
        "notes": " | ".join(
            [part for part in [str(vendor).strip(), str(depreciation).strip()] if part]
        ),
    }


def _http_request(
    url: str,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    token: str = "",
) -> Any:
    body = None
    headers = {"Accept": "application/json, text/plain, */*"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(url=url, method=method, headers=headers, data=body)
    try:
        with request.urlopen(req, timeout=VEHICLE_ASSETS_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        raw = (
            exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else ""
        )
        if exc.code == 401:
            raise VehicleAssetsSyncError(
                "Vehicle API returned 401 Unauthorized."
            ) from exc
        raise VehicleAssetsSyncError(
            raw or f"Vehicle API request failed with {exc.code}."
        ) from exc
    except error.URLError as exc:
        raise VehicleAssetsSyncError(f"Vehicle API unavailable: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise VehicleAssetsSyncError("Vehicle API returned invalid JSON.") from exc


def _get_auth_token() -> str:
    global _cached_token
    if VEHICLE_ASSETS_API_BEARER_TOKEN:
        return VEHICLE_ASSETS_API_BEARER_TOKEN
    if _cached_token:
        return _cached_token
    if not VEHICLE_ASSETS_API_USERNAME or not VEHICLE_ASSETS_API_PASSWORD:
        return ""

    auth_url = f"{VEHICLE_ASSETS_API_BASE_URL}{VEHICLE_ASSETS_AUTH_ENDPOINT}"
    payload = _http_request(
        auth_url,
        method="POST",
        payload={
            "userNameOrEmailAddress": VEHICLE_ASSETS_API_USERNAME,
            "password": VEHICLE_ASSETS_API_PASSWORD,
        },
    )
    token = str(
        payload.get("result", {}).get("accessToken")
        or payload.get("result", {}).get("access_token")
        or payload.get("accessToken")
        or payload.get("access_token")
        or ""
    ).strip()
    if not token:
        raise VehicleAssetsSyncError(
            "Vehicle API auth succeeded but no access token was returned."
        )
    _cached_token = token
    return token


def fetch_vehicle_assets_from_upstream() -> tuple[list[dict[str, Any]], int | None]:
    if not VEHICLE_ASSETS_API_BASE_URL:
        raise VehicleAssetsSyncError("VEHICLE_ASSETS_API_BASE_URL is not configured.")

    token = _get_auth_token()
    query = parse.urlencode(
        {
            "SkipCount": "0",
            "MaxResultCount": "1000",
            "Department": VEHICLE_ASSETS_DEPARTMENT,
            "department": VEHICLE_ASSETS_DEPARTMENT,
        }
    )
    url = f"{VEHICLE_ASSETS_API_BASE_URL}{VEHICLE_ASSETS_LIST_ENDPOINT}?{query}"
    payload = _http_request(url, method="GET", token=token)
    items = _extract_items(payload)
    total_count: int | None = None
    if isinstance(payload, dict):
        total_count = (
            payload.get("result", {}).get("totalCount")
            if isinstance(payload.get("result"), dict)
            else None
        )
        if total_count is None and isinstance(payload.get("result"), dict):
            total_count = payload.get("result", {}).get("TotalCount")
        if total_count is None:
            total_count = payload.get("totalCount", payload.get("TotalCount"))
    try:
        total_count = int(total_count) if total_count is not None else None
    except (TypeError, ValueError):
        total_count = None

    department_filtered = [
        item for item in items if _is_vehicle_assets_department(item) is True
    ]
    has_department = any(
        _is_vehicle_assets_department(item) is not None for item in items
    )
    final_items = department_filtered if has_department else items
    if has_department and not final_items and items:
        # Upstream department text can drift slightly; avoid false-empty imports.
        final_items = items

    normalized = [
        _normalize_vehicle_asset(item, index) for index, item in enumerate(final_items)
    ]
    normalized = [item for item in normalized if item["asset_tag"]]
    if total_count is not None and total_count > 0 and not normalized:
        raise VehicleAssetsSyncError(
            "Vehicle API reports records, but no valid assets were parsed from the response."
        )
    return normalized, total_count


def sync_vehicle_assets_to_db() -> SyncResult:
    upstream_assets, total_count = fetch_vehicle_assets_from_upstream()

    module_key = AssetModule.VEHICLE_ASSETS
    existing_assets = {
        asset.asset_tag: asset
        for asset in Asset.objects.select_related("category", "location").filter(
            module=module_key
        )
    }
    incoming_tags = {entry["asset_tag"] for entry in upstream_assets}

    created = 0
    updated = 0

    with transaction.atomic():
        for entry in upstream_assets:
            category, _ = Category.objects.get_or_create(
                module=module_key,
                name=entry["category_name"] or "Asset Registration",
                defaults={"description": "", "is_active": True},
            )
            location = None
            if entry["location_name"]:
                location, _ = Location.objects.get_or_create(
                    module=module_key,
                    name=entry["location_name"],
                    defaults={"site": "", "room": "", "description": ""},
                )

            existing = existing_assets.get(entry["asset_tag"])
            if existing is None:
                Asset.objects.create(
                    module=module_key,
                    asset_tag=entry["asset_tag"],
                    name=entry["name"],
                    serial_number=entry["serial_number"],
                    category=category,
                    location=location,
                    assigned_to=entry["assigned_to"],
                    purchase_date=entry["purchase_date"],
                    status=entry["status"],
                    notes=entry["notes"],
                )
                created += 1
                continue

            fields_to_update = []
            for field_name in [
                "name",
                "serial_number",
                "assigned_to",
                "purchase_date",
                "status",
                "notes",
            ]:
                if getattr(existing, field_name) != entry[field_name]:
                    setattr(existing, field_name, entry[field_name])
                    fields_to_update.append(field_name)
            if existing.category_id != category.id:
                existing.category = category
                fields_to_update.append("category")
            if (existing.location_id or None) != (location.id if location else None):
                existing.location = location
                fields_to_update.append("location")
            if fields_to_update:
                existing.save(update_fields=fields_to_update)
                updated += 1

        allow_delete = bool(incoming_tags) or total_count == 0
        deleted = 0
        if allow_delete:
            deleted, _ = (
                Asset.objects.filter(module=module_key)
                .exclude(asset_tag__in=incoming_tags)
                .delete()
            )

    return SyncResult(
        fetched=len(upstream_assets),
        created=created,
        updated=updated,
        deleted=deleted,
    )
