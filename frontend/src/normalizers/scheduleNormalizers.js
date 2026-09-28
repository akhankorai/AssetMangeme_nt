export function normalizeServiceTypeName(name) {
  const text = String(name || "").trim();
  if (text.toLowerCase() === "oil change") {
    return "Engine Oil Change";
  }
  return text;
}

export function serviceTypeMatchKey(name) {
  return normalizeServiceTypeName(name).toLowerCase();
}

export function getServiceTypeIntervalDays(serviceTypes, serviceTypeName) {
  const match = serviceTypeMatchKey(serviceTypeName);
  const serviceType = serviceTypes.find((entry) => serviceTypeMatchKey(entry.name) === match);
  return Number(serviceType?.interval_days || 0);
}

export function buildTaskIdentity(task) {
  const serviceKey = serviceTypeMatchKey(task.serviceType || task.service_type || task.title || "");
  const processType = String(task.processType || task.process_type || "maintenance").trim().toLowerCase();
  const assetTagKey = String(task.assetTag || task.asset_tag || "").trim().toLowerCase();
  const dateKey = String(task.dueDate || task.due_date || "").slice(0, 10);
  return `${processType}|${serviceKey}|${assetTagKey}${dateKey ? `|${dateKey}` : ""}`;
}

export function normalizeScheduleTask(task) {
  return {
    id: task.id,
    formatted_id: task.formatted_id || "",
    title: task.title || "",
    assetId: task.asset_id ?? null,
    assetTag: task.assetTag || task.asset_tag || "",
    assetName: task.assetName || task.asset_name || "",
    category: task.category || "",
    serviceType: task.serviceType || task.service_type || "",
    assignee: task.assignee || "",
    assignedAt: task.assignedAt || task.assigned_at || "",
    dueDate: task.dueDate || task.due_date || "",
    risk: task.risk || "Medium",
    stage: task.stage || "planned",
    processType: task.processType || task.process_type || "maintenance",
    progress: Number(task.progress ?? 0),
    inspectionRequired: Boolean(task.inspectionRequired ?? task.inspection_required ?? true),
    inspectionComment: task.inspectionComment || task.inspection_comment || "",
    meterReading: task.meterReading || task.meter_reading || "",
    lastServiceDate: task.lastServiceDate || task.last_service_date || "",
    consumedItemId: task.consumedItemId ?? task.consumed_item_id ?? null,
    consumedItemName: task.consumedItemName || task.consumed_item_name || "",
    consumedQuantity: Number(task.consumedQuantity ?? task.consumed_quantity ?? 1),
    inventoryApplied: Boolean(task.inventoryApplied ?? task.inventory_applied ?? false),
    completedAt: task.completedAt || task.completed_at || "",
    approvalStatus: task.approvalStatus || task.approval_status || (task.stage === "awaiting_parts" ? "pending" : "not_required"),
    approvalRemarks: task.approvalRemarks || task.approval_remarks || "",
    approvedBy: task.approvedBy || task.approved_by || "",
    approvedAt: task.approvedAt || task.approved_at || "",
    createdAt: task.createdAt || task.created_at || "",
    updatedAt: task.updatedAt || task.updated_at || "",
  };
}

export function serializeScheduleTask(task) {
  return {
    title: task.title || "",
    service_type: task.serviceType || task.service_type || "",
    asset_tag: task.assetTag || task.asset_tag || "",
    asset_name: task.assetName || task.asset_name || "",
    category: task.category || "",
    assignee: task.assignee || "",
    assigned_at: task.assignedAt || task.assigned_at || null,
    due_date: task.dueDate || task.due_date || null,
    risk: task.risk || "Medium",
    stage: task.stage || "planned",
    process_type: task.processType || task.process_type || "maintenance",
    progress: Number(task.progress) || 0,
    inspection_required: Boolean(task.inspectionRequired ?? task.inspection_required ?? true),
    inspection_comment: String(task.inspectionComment || task.inspection_comment || "").trim(),
    meter_reading: task.meterReading || task.meter_reading || "",
    last_service_date: task.lastServiceDate || task.last_service_date || null,
    consumed_item_id: task.consumedItemId ?? task.consumed_item_id ?? null,
    consumed_item_name: task.consumedItemName || task.consumed_item_name || "",
    consumed_quantity: Math.max(1, Number(task.consumedQuantity ?? task.consumed_quantity) || 1),
    inventory_applied: Boolean(task.inventoryApplied ?? task.inventory_applied),
    completed_at: task.completedAt || task.completed_at || null,
    approval_status: task.approvalStatus || task.approval_status || (task.stage === "awaiting_parts" && (task.consumedItemId || task.consumedItemName) ? "pending" : "not_required"),
    approval_remarks: String(task.approvalRemarks || task.approval_remarks || "").trim(),
    approved_by: task.approvedBy || task.approved_by || "",
    approved_at: task.approvedAt || task.approved_at || null,
  };
}

export function splitScheduleTasks(tasks) {
  const normalized = tasks.map(normalizeScheduleTask);
  return {
    active: normalized.filter((task) => !["completed", "declined"].includes(task.stage)),
    completed: normalized.filter((task) => ["completed", "declined"].includes(task.stage)),
  };
}

export function stageProgress(stage) {
  if (stage === "completed") {
    return 100;
  }

  if (stage === "in_progress") {
    return 75;
  }

  if (stage === "awaiting_parts") {
    return 50;
  }

  if (stage === "inspection") {
    return 25;
  }

  return 0;
}

export function resolveTaskAssetDetails(assets, assetTag, fallback = {}) {
  const matchedAsset = assets.find(
    (asset) => String(asset.asset_tag || "").trim().toLowerCase() === String(assetTag || "").trim().toLowerCase(),
  );

  return {
    assetName: matchedAsset?.name || fallback.assetName || "",
    category: matchedAsset?.category_name || fallback.category || "",
  };
}

export function dedupeTasks(tasks) {
  const taskMap = new Map();

  tasks.forEach((task) => {
    const persistedId = task?.id;
    if (persistedId !== null && persistedId !== undefined && String(persistedId).trim() !== "") {
      taskMap.set(`id:${persistedId}`, task);
      return;
    }

    const identity = buildTaskIdentity(task);
    if (!identity || identity === "|") {
      taskMap.set(task.id, task);
      return;
    }

    const existing = taskMap.get(identity);
    if (!existing) {
      taskMap.set(identity, task);
      return;
    }

    const existingDate = new Date(existing.assignedAt || existing.dueDate || 0).getTime();
    const nextDate = new Date(task.assignedAt || task.dueDate || 0).getTime();
    if (Number.isNaN(existingDate) || nextDate >= existingDate) {
      taskMap.set(identity, task);
    }
  });

  return [...taskMap.values()];
}

export function findLatestCompletedServiceDate(expenses, completedTasks, assetTag, serviceType, ignoreTaskId = "", assetName = "") {
  if (!assetTag && !assetName) {
    return "";
  }

  const assetTagMatch = String(assetTag).trim().toLowerCase();
  const assetNameMatch = String(assetName).trim().toLowerCase();
  const serviceMatch = serviceTypeMatchKey(serviceType);
  const hasServiceFilter = Boolean(serviceMatch);

  const matchingExpenses = expenses
    .filter((expense) => {
      const expenseAssetTag = String(expense.asset_tag || "").trim().toLowerCase();
      const expenseAssetName = String(expense.asset_name || "").trim().toLowerCase();
      const expenseService = serviceTypeMatchKey(expense.service_type || expense.task_title || "");
      const matchesAsset = expenseAssetTag === assetTagMatch || (assetNameMatch && expenseAssetName === assetNameMatch);
      const matchesService = !hasServiceFilter || expenseService === serviceMatch;
      return matchesAsset && matchesService;
    })
    .sort(
      (left, right) =>
        new Date(right.completed_at || right.assigned_at || right.created_at || 0).getTime() -
        new Date(left.completed_at || left.assigned_at || left.created_at || 0).getTime(),
    );

  if (matchingExpenses.length > 0) {
    return matchingExpenses[0].completed_at || matchingExpenses[0].assigned_at || matchingExpenses[0].created_at || "";
  }

  const matchingTasks = completedTasks
    .filter((task) => {
      const taskAssetTag = String(task.assetTag || "").trim().toLowerCase();
      const taskAssetName = String(task.assetName || "").trim().toLowerCase();
      const taskService = serviceTypeMatchKey(task.serviceType || task.title || "");
      const matchesAsset = taskAssetTag === assetTagMatch || (assetNameMatch && taskAssetName === assetNameMatch);
      const matchesService = !hasServiceFilter || taskService === serviceMatch;
      return task.id !== ignoreTaskId && matchesAsset && matchesService;
    })
    .sort(
      (left, right) =>
        new Date(right.completedAt || right.assignedAt || right.dueDate || 0).getTime() -
        new Date(left.completedAt || left.assignedAt || left.dueDate || 0).getTime(),
    );

  return matchingTasks[0]?.completedAt || matchingTasks[0]?.dueDate || "";
}

export function hasConsumedItem(task) {
  return Boolean(task.consumedItemId || String(task.consumedItemName || "").trim());
}

export function normalizeNoConsumptionTask(task) {
  if (hasConsumedItem(task)) {
    return task;
  }

  return {
    ...task,
    serviceType: "Operational Check",
    consumedItemId: null,
    consumedItemName: "",
  };
}

export function markTaskAsJustCreated(task) {
  return {
    ...task,
    justCreated: true,
  };
}

export function getScheduleRiskTone(risk) {
  if (risk === "High") {
    return "critical";
  }

  if (risk === "Medium") {
    return "medium";
  }

  return "low";
}
