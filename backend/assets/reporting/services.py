from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO


@dataclass(frozen=True)
class ReportPayload:
    title: str
    subtitle: str
    summary: list[tuple[str, str]]
    columns: list[str]
    rows: list[list[str]]


def _safe_text(value) -> str:
    if value is None or value == "":
        return "-"
    if isinstance(value, Decimal):
        return f"{value:,.2f}"
    return str(value)


def _money(value) -> str:
    amount = Decimal(value or 0)
    return f"PKR {amount:,.2f}"


def _quantity(value) -> str:
    amount = Decimal(value or 0)
    if amount == amount.to_integral_value():
        return f"{int(amount):,}"
    return f"{amount:,.2f}"


def _date_only(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def matches_period(value, date_from: date, date_to: date) -> bool:
    entry_date = _date_only(value)
    if not entry_date:
        return False
    return date_from <= entry_date <= date_to


def _subtitle(
    module_label: str, frequency: str, date_from: date, date_to: date, label: str
) -> str:
    return f"{module_label} | {frequency.title()} {label} | {date_from.isoformat()} to {date_to.isoformat()}"


def build_assets_payload(
    records, frequency: str, date_from: date, date_to: date, module_label: str
) -> ReportPayload:
    filtered = [
        asset
        for asset in records
        if matches_period(
            asset.created_at or asset.updated_at or asset.purchase_date,
            date_from,
            date_to,
        )
    ]
    rows = [
        [
            _safe_text(asset.asset_tag),
            _safe_text(asset.name),
            _safe_text(getattr(asset.category, "name", "")),
            _safe_text(asset.get_status_display()),
            _safe_text(str(asset.location) if asset.location else ""),
            _safe_text(asset.purchase_date),
        ]
        for asset in filtered
    ]
    return ReportPayload(
        title="Assets Report",
        subtitle=_subtitle(module_label, frequency, date_from, date_to, "window"),
        summary=[
            ("Assets in range", str(len(filtered))),
            (
                "Available",
                str(sum(1 for asset in filtered if asset.status == "available")),
            ),
            (
                "Maintenance",
                str(sum(1 for asset in filtered if asset.status == "maintenance")),
            ),
        ],
        columns=["Tag", "Asset", "Category", "Status", "Location", "Purchase date"],
        rows=rows,
    )


def build_inventory_payload(
    records, frequency: str, date_from: date, date_to: date, module_label: str
) -> ReportPayload:
    filtered = [
        item for item in records if matches_period(item.updated_at, date_from, date_to)
    ]
    total_units = sum(Decimal(item.inventory_quantity or 0) for item in filtered)
    total_value = sum(
        Decimal(item.price or 0) * Decimal(item.inventory_quantity or 0)
        for item in filtered
    )
    rows = [
        [
            _safe_text(item.name),
            _quantity(item.inventory_quantity),
            _money(item.price),
            _money(Decimal(item.price or 0) * Decimal(item.inventory_quantity or 0)),
            _safe_text(
                item.updated_at.date() if getattr(item, "updated_at", None) else None
            ),
        ]
        for item in filtered
    ]
    return ReportPayload(
        title="Inventory Items Report",
        subtitle=_subtitle(
            module_label, frequency, date_from, date_to, "inventory snapshot"
        ),
        summary=[
            ("Items in range", str(len(filtered))),
            ("Tracked units", _quantity(total_units)),
            ("Inventory value", _money(total_value)),
            (
                "Low stock items",
                str(
                    sum(
                        1
                        for item in filtered
                        if Decimal(item.inventory_quantity or 0) <= 5
                    )
                ),
            ),
        ],
        columns=["Item", "Qty", "Unit price", "Stock value", "Last updated"],
        rows=rows,
    )


def build_team_payload(
    records, frequency: str, date_from: date, date_to: date, module_label: str
) -> ReportPayload:
    filtered = [
        member
        for member in records
        if matches_period(member.created_at, date_from, date_to)
    ]
    rows = [
        [
            _safe_text(member.serial_number),
            _safe_text(member.name),
            _safe_text(getattr(member.employee_category, "name", "")),
            _safe_text(member.designation),
            "Active" if member.is_active else "Inactive",
        ]
        for member in filtered
    ]
    return ReportPayload(
        title="Team Report",
        subtitle=_subtitle(
            module_label, frequency, date_from, date_to, "member intake"
        ),
        summary=[
            ("Members in range", str(len(filtered))),
            ("Active", str(sum(1 for member in filtered if member.is_active))),
            ("Inactive", str(sum(1 for member in filtered if not member.is_active))),
            (
                "Categories",
                str(
                    len(
                        {
                            member.employee_category_id
                            for member in filtered
                            if member.employee_category_id
                        }
                    )
                ),
            ),
        ],
        columns=["Serial", "Name", "Category", "Designation", "Status"],
        rows=rows,
    )


def build_tasks_payload(
    records, frequency: str, date_from: date, date_to: date, module_label: str
) -> ReportPayload:
    filtered = [
        task
        for task in records
        if matches_period(
            task.assigned_at or task.due_date or task.created_at, date_from, date_to
        )
    ]
    rows = [
        [
            _safe_text(task.title),
            _safe_text(task.asset_tag),
            _safe_text(task.service_type),
            _safe_text(task.assignee),
            _safe_text(task.get_stage_display()),
            _safe_text(task.due_date),
        ]
        for task in filtered
    ]
    return ReportPayload(
        title="Tasks Report",
        subtitle=_subtitle(
            module_label, frequency, date_from, date_to, "task activity"
        ),
        summary=[
            ("Tasks in range", str(len(filtered))),
            (
                "Completed",
                str(sum(1 for task in filtered if task.stage == "completed")),
            ),
            (
                "In progress",
                str(sum(1 for task in filtered if task.stage == "in_progress")),
            ),
            ("High risk", str(sum(1 for task in filtered if task.risk == "High"))),
        ],
        columns=["Task", "Asset tag", "Service", "Assignee", "Stage", "Due date"],
        rows=rows,
    )


def build_expenses_payload(
    records, frequency: str, date_from: date, date_to: date, module_label: str
) -> ReportPayload:
    filtered = [
        expense
        for expense in records
        if matches_period(
            expense.completed_at or expense.assigned_at or expense.created_at,
            date_from,
            date_to,
        )
    ]
    total_cost = sum(Decimal(expense.total_cost or 0) for expense in filtered)
    rows = [
        [
            _safe_text(expense.task_title),
            _safe_text(expense.asset_tag),
            _safe_text(expense.item_name or getattr(expense.item, "name", "")),
            _quantity(expense.quantity),
            _money(expense.total_cost),
            _safe_text(
                _date_only(
                    expense.completed_at or expense.assigned_at or expense.created_at
                )
            ),
        ]
        for expense in filtered
    ]
    return ReportPayload(
        title="Expense Report",
        subtitle=_subtitle(
            module_label, frequency, date_from, date_to, "maintenance spending"
        ),
        summary=[
            ("Expense rows", str(len(filtered))),
            ("Total spend", _money(total_cost)),
            (
                "Unique assets",
                str(
                    len(
                        {expense.asset_tag for expense in filtered if expense.asset_tag}
                    )
                ),
            ),
            (
                "Unique items",
                str(
                    len(
                        {expense.item_name for expense in filtered if expense.item_name}
                    )
                ),
            ),
        ],
        columns=["Task", "Asset tag", "Item", "Qty", "Total cost", "Recorded on"],
        rows=rows,
    )


def build_fuel_payload(
    records,
    frequency: str,
    date_from: date,
    date_to: date,
    module_label: str,
    scope_label: str = "Overall Report",
) -> ReportPayload:
    filtered = [
        fuel
        for fuel in records
        if matches_period(fuel.request_date or fuel.created_at, date_from, date_to)
    ]
    total_liters = sum(Decimal(fuel.liters or 0) for fuel in filtered)
    total_cost = sum(Decimal(fuel.total_cost or 0) for fuel in filtered)
    total_distance = sum(Decimal(fuel.distance_travelled or 0) for fuel in filtered)
    average_efficiency = (
        (total_distance / total_liters) if total_liters else Decimal("0")
    )
    rows = [
        [
            _safe_text(fuel.asset_tag),
            _safe_text(fuel.asset_name),
            _safe_text(getattr(fuel.fuel_item, "name", "")),
            _quantity(fuel.liters),
            _safe_text(fuel.meter_reading),
            _safe_text(fuel.distance_travelled),
            _safe_text(fuel.average_distance_per_liter),
            _money(fuel.total_cost),
            _safe_text(fuel.request_date),
        ]
        for fuel in filtered
    ]
    return ReportPayload(
        title="Fuel Consumption Report",
        subtitle=_subtitle(
            module_label,
            frequency,
            date_from,
            date_to,
            f"fuel allocation | {scope_label}",
        ),
        summary=[
            ("Allocations", str(len(filtered))),
            ("Total liters", _quantity(total_liters)),
            ("Total fuel cost", _money(total_cost)),
            ("Avg mileage", _quantity(average_efficiency)),
        ],
        columns=[
            "Asset tag",
            "Vehicle",
            "Fuel item",
            "Liters",
            "Meter",
            "Distance",
            "Avg km/l",
            "Cost",
            "Date",
        ],
        rows=rows,
    )


def build_monthly_schedule_inventory_demand_payload(
    tasks,
    items,
    frequency: str,
    date_from: date,
    date_to: date,
    module_label: str,
) -> ReportPayload:
    # Include only open scheduled tasks in range that actually demand inventory.
    relevant_tasks = [
        task
        for task in tasks
        if task.stage not in {"completed", "declined"}
        and task.due_date
        and matches_period(task.due_date, date_from, date_to)
        and (task.consumed_item_id or task.consumed_item_name)
    ]

    item_lookup_by_id = {item.id: item for item in items}
    item_lookup_by_name = {str(item.name or "").strip().lower(): item for item in items}
    demand_map: dict[str, dict] = {}

    for task in relevant_tasks:
        quantity = max(1, int(task.consumed_quantity or 1))
        item = (
            item_lookup_by_id.get(task.consumed_item_id)
            if task.consumed_item_id
            else None
        )
        if not item and task.consumed_item_name:
            item = item_lookup_by_name.get(str(task.consumed_item_name).strip().lower())
        if not item:
            continue

        key = str(item.id)
        if key not in demand_map:
            demand_map[key] = {
                "name": str(item.name or ""),
                "current_stock": Decimal(item.inventory_quantity or 0),
                "new_demand": Decimal("0"),
                "required_before": task.due_date,
                "unit_price": Decimal(item.price or 0),
            }
        demand_map[key]["new_demand"] += Decimal(quantity)
        if task.due_date and task.due_date < demand_map[key]["required_before"]:
            demand_map[key]["required_before"] = task.due_date

    rows = []
    total_demand = Decimal("0")
    total_purchase_units = Decimal("0")
    total_purchase_cost = Decimal("0")

    for entry in demand_map.values():
        remaining = entry["current_stock"] - entry["new_demand"]
        purchase_required = abs(remaining) if remaining < 0 else Decimal("0")
        if purchase_required <= 0:
            continue
        total_demand += entry["new_demand"]
        total_purchase_units += purchase_required
        total_purchase_cost += purchase_required * entry["unit_price"]
        rows.append(
            [
                _safe_text(entry["name"]),
                _quantity(entry["current_stock"]),
                _quantity(entry["new_demand"]),
                _quantity(remaining),
                _quantity(purchase_required),
                _safe_text(entry["required_before"]),
            ]
        )

    rows.sort(key=lambda row: Decimal(str(row[4]).replace(",", "")), reverse=True)

    return ReportPayload(
        title="Monthly Schedule Inventory Demand Report",
        subtitle=_subtitle(
            module_label, frequency, date_from, date_to, "inventory shortage forecast"
        ),
        summary=[
            ("Items with shortage", str(len(rows))),
            ("Total demand units", _quantity(total_demand)),
            ("Units to purchase", _quantity(total_purchase_units)),
            ("Estimated purchase cost", _money(total_purchase_cost)),
        ],
        columns=[
            "Item",
            "Current stock",
            "New demand",
            "Remaining",
            "Purchase required",
            "Required before",
        ],
        rows=rows,
    )


def render_report_pdf(payload: ReportPayload) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1f3652"),
        alignment=TA_LEFT,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#607086"),
        alignment=TA_LEFT,
    )
    label_style = ParagraphStyle(
        "SummaryLabel",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=10,
        textColor=colors.HexColor("#6a7c92"),
        alignment=TA_LEFT,
    )
    value_style = ParagraphStyle(
        "SummaryValue",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#1e334d"),
        alignment=TA_LEFT,
    )

    story = []

    heading_table = Table(
        [
            [Paragraph(payload.title, title_style)],
            [Paragraph(payload.subtitle, subtitle_style)],
        ],
        colWidths=[document.width],
    )
    heading_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f5f8fc")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#d8e2ec")),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, 0), 16),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
                ("TOPPADDING", (0, 1), (-1, 1), 0),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 14),
            ]
        )
    )
    story = [
        heading_table,
        Spacer(1, 10),
    ]

    if payload.summary:
        card_count = len(payload.summary)
        col_width = document.width / max(card_count, 1)
        summary_table = Table(
            [
                [Paragraph(label, label_style) for label, _ in payload.summary],
                [Paragraph(value, value_style) for _, value in payload.summary],
            ],
            colWidths=[col_width] * card_count,
        )
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#dde5ef")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.75, colors.HexColor("#dde5ef")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
                    ("TOPPADDING", (0, 1), (-1, 1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 1), (-1, 1), 12),
                ]
            )
        )
        story.extend([summary_table, Spacer(1, 12)])

    table_rows = [payload.columns]
    if payload.rows:
        table_rows.extend(payload.rows)
    else:
        table_rows.append(
            ["No records found for the selected period."]
            + [""] * (len(payload.columns) - 1)
        )

    content_table = Table(table_rows, repeatRows=1)
    content_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2f4a67")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("TOPPADDING", (0, 0), (-1, 0), 10),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#d8e1eb")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f6f9fc")],
                ),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#314559")),
                ("PADDING", (0, 1), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#27425e")),
            ]
        )
    )
    story.append(content_table)
    document.build(story)
    return buffer.getvalue()
