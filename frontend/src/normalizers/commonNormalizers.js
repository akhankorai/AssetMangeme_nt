import { dateToInputValue, monthRange } from "../utils/dateHelpers";

export function normalizeList(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export function emptyDashboardSummaryFallback() {
  return {
    overview: {
      total_assets: 0,
      available_assets: 0,
      assigned_assets: 0,
      maintenance_assets: 0,
      retired_assets: 0,
      categories: 0,
      locations: 0,
    },
    alerts: [],
    recent_activity: [],
    upcoming_maintenance: [],
    distribution: [
      { label: "Excellent", value: 0, tone: "excellent" },
      { label: "Good", value: 0, tone: "good" },
      { label: "Fair", value: 0, tone: "fair" },
      { label: "Poor", value: 0, tone: "poor" },
    ],
    location_feed: [],
    error: "Dashboard data is temporarily unavailable.",
  };
}

export function buildNotificationTaskEntry(task, windowKey = "today") {
  const dueDateKey = String(task?.dueDate || "").slice(0, 10);
  const id = `${String(task?.id || task?.title || "task")}::${dueDateKey}`;
  return {
    id,
    taskId: task?.id,
    title: task?.title || "Untitled Task",
    assetTag: task?.assetTag || "",
    serviceType: task?.serviceType || "",
    assignee: task?.assignee || "",
    dueDate: dueDateKey,
    stage: task?.stage || "",
    risk: task?.risk || "",
    windowKey,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function getMonthlyMaintenanceDefaultServiceType(serviceTypes) {
  const inspectionType = serviceTypes.find((entry) => String(entry.name || "").trim().toLowerCase().includes("inspection"));
  if (inspectionType?.name) {
    return inspectionType.name;
  }

  return serviceTypes.find((entry) => entry.is_active !== false)?.name || "";
}

export function createMonthlyMaintenanceDraft(asset, monthValue, serviceTypes) {
  const { start } = monthRange(monthValue);
  return {
    enabled: true,
    title: `Monthly Maintenance Check - ${asset.asset_tag || asset.name || "Vehicle"}`,
    dueDate: start,
    serviceType: getMonthlyMaintenanceDefaultServiceType(serviceTypes),
    assignee: "",
    risk: "Medium",
    consumedItemId: "",
    consumedItemName: "",
    consumedQuantity: "1",
  };
}
