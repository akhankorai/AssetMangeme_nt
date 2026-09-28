from django.db import DatabaseError
from django.utils import timezone
from datetime import timedelta
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from assets.modules import get_module_filter, module_from_request
from .models import (
    DailyInspectionRecord,
    ExpenseRecord,
    ScheduleTask,
    OutsideMaintenanceRecord,
)
from assets.serializers import (
    ExpenseRecordSerializer,
    ScheduleTaskSerializer,
    DailyInspectionRecordSerializer,
    OutsideMaintenanceRecordSerializer,
)


class ModuleScopedViewSetMixin:
    module_field = "module"
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        module_key = module_from_request(self.request)
        if module_key:
            queryset = queryset.filter(get_module_filter(module_key))
        return queryset


class ExpenseRecordViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ExpenseRecord.objects.select_related("item")
    serializer_class = ExpenseRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["task_title", "service_type", "asset_tag", "assignee", "item_name"]
    ordering_fields = [
        "completed_at",
        "assigned_at",
        "total_cost",
        "created_at",
        "updated_at",
    ]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Expense storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Expense storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            return super().partial_update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Expense storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Expense storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ScheduleTaskViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ScheduleTask.objects.all()
    serializer_class = ScheduleTaskSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "title",
        "service_type",
        "asset_tag",
        "asset_name",
        "assignee",
        "category",
        "stage",
        "consumed_item_name",
    ]
    ordering_fields = [
        "assigned_at",
        "due_date",
        "completed_at",
        "progress",
        "created_at",
        "updated_at",
    ]

    @action(detail=False, methods=["post", "delete"], url_path="clear-planned")
    def clear_planned(self, request):
        try:
            queryset = self.get_queryset().filter(stage=ScheduleTask.Stage.PLANNED)
            count, details = queryset.delete()
            return Response({"message": f"Successfully deleted {count} planned tasks.", "count": count, "details": details})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Schedule storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Schedule storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            return super().partial_update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Schedule storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def destroy(self, request, *args, **kwargs):
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated and user.is_superuser):
            return Response(
                {"detail": "Only superusers can delete schedule tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        task = self.get_object()
        if task.stage != ScheduleTask.Stage.PLANNED:
            return Response(
                {"detail": "Only planned schedule tasks can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            return super().destroy(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Schedule storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class DailyInspectionRecordViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = DailyInspectionRecord.objects.all()
    serializer_class = DailyInspectionRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset_tag", "asset_name", "category", "station", "notes"]
    ordering_fields = ["inspection_date", "completed_at", "created_at", "updated_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inspection_date = self.request.query_params.get("inspection_date")
        if inspection_date:
            queryset = queryset.filter(inspection_date=inspection_date)
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Daily inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Daily inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def partial_update(self, request, *args, **kwargs):
        try:
            return super().partial_update(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Daily inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Daily inspection storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class OutsideMaintenanceRecordViewSet(ModuleScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = OutsideMaintenanceRecord.objects.all()
    serializer_class = OutsideMaintenanceRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset_name", "asset_tag", "vendor", "status"]
    ordering_fields = ["out_time", "in_time"]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response([])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DatabaseError:
            return Response(
                {
                    "detail": "Outside Maintenance storage is unavailable until backend migrations are applied."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def partial_update(self, request, *args, **kwargs):
        """When a gate pass is marked inward, auto-update/create emergency inspection task."""
        instance = self.get_object()
        old_status = instance.status
        response = super().partial_update(request, *args, **kwargs)

        # Only trigger when status transitions to inside_gate
        new_status = request.data.get("status", old_status)
        if old_status != "inside_gate" and new_status == "inside_gate":
            try:
                from django.utils import timezone as tz
                today = tz.localdate()
                if instance.task:
                    instance.task.title = f"[Gate Pass Return] {instance.asset_name}"
                    instance.task.stage = ScheduleTask.Stage.INSPECTION
                    instance.task.inspection_comment = (
                        f"Returned from outside vendor: {instance.vendor or 'N/A'}. "
                        f"Gate Pass: {instance.formatted_id}"
                    )
                    if getattr(instance, "service_type", ""):
                        instance.task.service_type = instance.service_type
                    instance.task.save()
                else:
                    task_kwargs = dict(
                        module=instance.module,
                        title=f"[Gate Pass Return] {instance.asset_name}",
                        service_type=getattr(instance, "service_type", "") or "Gate Pass Emergency Return",
                        asset_tag=instance.asset_tag or "",
                        asset_name=instance.asset_name or "",
                        category=instance.category or "",
                        assignee=getattr(instance, "assignee", "") or "",
                        stage=ScheduleTask.Stage.INSPECTION,
                        risk=ScheduleTask.Risk.HIGH,
                        due_date=today,
                        inspection_required=True,
                        inspection_comment=(
                            f"Returned from outside vendor: {instance.vendor or 'N/A'}. "
                            f"Gate Pass: {instance.formatted_id}"
                        ),
                        meter_reading=instance.meter_reading or "",
                    )
                    try:
                        ScheduleTask._meta.get_field("process_type")
                        task_kwargs["process_type"] = "emergency"
                    except Exception:
                        pass
                    task = ScheduleTask.objects.create(**task_kwargs)
                    instance.task = task
                    instance.save(update_fields=["task"])
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning(
                    "Could not create/update emergency task for gate pass %s: %s",
                    instance.formatted_id, exc
                )

        return response

