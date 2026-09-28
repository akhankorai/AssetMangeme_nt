from assets.modules.types import ModuleDefinition
from decimal import Decimal


MODULE = ModuleDefinition(
    key="vehicle-assets",
    label="Vehicle Assets",
)

WORKSPACE_TEMPLATE = {
    "categories": [
        {"name": "Tractor", "description": "Heavy vehicle assets"},
        {"name": "Car", "description": "Passenger vehicles"},
        {"name": "Bike", "description": "Two-wheel vehicle assets"},
    ],
    "service_types": [
        {
            "name": "Inspection",
            "description": "General inspection",
            "interval_days": 30,
        },
        {
            "name": "Oil Change",
            "description": "Engine oil replacement",
            "interval_days": 90,
        },
        {
            "name": "Maintenance Intervention",
            "description": "Corrective maintenance",
            "interval_days": 0,
        },
        {
            "name": "Operational Check",
            "description": "Routine operational check",
            "interval_days": 14,
        },
    ],
    "items": [
        {
            "name": "Trackter Engine Oil",
            "price": Decimal("3500.00"),
            "inventory_quantity": 4,
        },
        {
            "name": "Tracter Engine Oil Filter",
            "price": Decimal("1200.00"),
            "inventory_quantity": 12,
        },
        {
            "name": "Car Engine Oil",
            "price": Decimal("2800.00"),
            "inventory_quantity": 6,
        },
    ],
    "employee_categories": [
        {
            "name": "Fleet Supervisor",
            "description": "Oversees vehicle assignment and compliance",
        },
        {
            "name": "Maintenance Technician",
            "description": "Handles workshop inspections and repairs",
        },
        {"name": "Vehicle Operator", "description": "Assigned driver or operator"},
    ],
    "team_members": [
        {
            "serial_number": "VA-EMP-001",
            "name": "Bilal Khan",
            "employee_category": "Fleet Supervisor",
            "designation": "Fleet Supervisor",
        },
        {
            "serial_number": "VA-EMP-002",
            "name": "Usman Ali",
            "employee_category": "Maintenance Technician",
            "designation": "Workshop Technician",
        },
        {
            "serial_number": "VA-EMP-003",
            "name": "Hassan Raza",
            "employee_category": "Vehicle Operator",
            "designation": "Senior Driver",
        },
    ],
    "default_location": {"site": "Fleet Yard", "name": "Unit 1", "room": ""},
}
