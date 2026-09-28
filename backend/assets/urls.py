from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .core.api import (
    AssetViewSet,
    CategoryViewSet,
    EmployeeCategoryViewSet,
    ItemViewSet,
    LocationViewSet,
    RegularInspectionItemViewSet,
    ServiceTypeViewSet,
    TeamMemberViewSet,
)
from .maintenance.api import (
    DailyInspectionRecordViewSet,
    ExpenseRecordViewSet,
    ScheduleTaskViewSet,
    OutsideMaintenanceRecordViewSet,
)
from .modules.vehicle_assets.api.fuel_demand_viewset import FuelDemandViewSet
from .dashboard.api import dashboard_summary
from .reporting.api import export_report

router = DefaultRouter()
router.register("assets", AssetViewSet)
router.register("categories", CategoryViewSet)
router.register("daily-inspections", DailyInspectionRecordViewSet)
router.register("expenses", ExpenseRecordViewSet)
router.register("employee-categories", EmployeeCategoryViewSet)
router.register("fuel-demands", FuelDemandViewSet)
router.register("items", ItemViewSet)
router.register("locations", LocationViewSet)
router.register("regular-inspection-items", RegularInspectionItemViewSet)
router.register("schedule-tasks", ScheduleTaskViewSet)
router.register("outside-maintenance", OutsideMaintenanceRecordViewSet)
router.register("service-types", ServiceTypeViewSet)
router.register("team-members", TeamMemberViewSet)

urlpatterns = [
    path("dashboard/", dashboard_summary, name="dashboard-summary"),
    path("reports/export/", export_report, name="export-report"),
    path("", include(router.urls)),
]
