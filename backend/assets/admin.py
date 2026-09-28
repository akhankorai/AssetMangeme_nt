from django.contrib import admin

from .core.models import (
    Asset,
    Category,
    Item,
    Location,
    EmployeeCategory,
    TeamMember,
    ServiceType,
    RegularInspectionItem,
)
from .maintenance.models import ExpenseRecord, ScheduleTask, DailyInspectionRecord

admin.site.register(Asset)
admin.site.register(Category)
admin.site.register(Item)
admin.site.register(Location)
admin.site.register(EmployeeCategory)
admin.site.register(TeamMember)
admin.site.register(ServiceType)
admin.site.register(RegularInspectionItem)
admin.site.register(ExpenseRecord)
admin.site.register(ScheduleTask)
admin.site.register(DailyInspectionRecord)
