# This file exposes all models to Django so migrations work flawlessly.

from .core.models import (
    AssetModule,
    TimeStampedModel,
    ModuleScopedModel,
    Category,
    Item,
    ServiceType,
    RegularInspectionItem,
    EmployeeCategory,
    TeamMember,
    Location,
    Asset,
)
from .maintenance.models import ExpenseRecord, ScheduleTask, DailyInspectionRecord
from .fuel.models import FuelDemand

# Any future models from reporting/dashboard domains should also be imported here if they have DB tables.
