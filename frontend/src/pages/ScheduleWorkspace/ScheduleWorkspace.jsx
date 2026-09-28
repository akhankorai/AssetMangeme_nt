import { useState, useMemo } from "react";
import { CalendarRange, ClipboardList, Plus, Edit2, Trash2, Printer } from "lucide-react";
import { formatDate, formatQuantity } from "../../utils/formatting";
import { printEntry } from "../../utils/printUtils";
import { todayInputValue, addDaysToDate } from "../../utils/dateHelpers";
import { findLatestCompletedServiceDate, getScheduleRiskTone } from "../../normalizers/scheduleNormalizers";
import { scheduleStages } from "../../constants";
import SearchableDropdown from "../../components/SearchableDropdown";
import { createOutsideMaintenanceRecord } from "../../api";

export default function ScheduleWorkspace({
  activeModuleKey,
  assets,
  locations,
  assetTagOptions,
  assetCategories,
  expenses,
  completedTasks,
  filters,
  globalSearch,
  itemOptions,
  onChangeFilter,
  onClearFilters,
  onCloseModal,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onOpenModal,
  onSaveTask,
  onUpdateTask,
  scheduleDraft,
  scheduleModalOpen,
  setScheduleDraft,
  teamMembers,
  serviceTypes,
  serviceTypeOptions,
  tasks,
  allInspectionRecords,
  onCreateTaskFromInspection,
  resolvedInspectionRecordIds,
  onResolveInspectionRecord,
  canCreateTask,
  canInspectTask,
  canPerformTask,
  canViewSchedule,
  isSuperuser,
  gatePassRecords = [],
  inwardGatePassRecords = [],
  onRefreshGatePasses,
}) {
  const assigneeOptions = teamMembers
    .filter((member) => member.is_active !== false)
    .map((member) => ({
      value: member.name,
      label: `${member.name} (${member.serial_number})${member.employee_category_name ? ` • ${member.employee_category_name}` : ""}`,
    }));
  const lastServiceDate = findLatestCompletedServiceDate(
    expenses,
    completedTasks,
    scheduleDraft.assetTag,
    scheduleDraft.serviceType,
    scheduleDraft.id,
    scheduleDraft.assetName,
  );
  const selectedServiceType = serviceTypes.find((serviceType) => serviceType.name === scheduleDraft.serviceType);
  const serviceIntervalDays = Number(selectedServiceType?.interval_days || 0);
  const nextAllowedServiceDate = lastServiceDate && serviceIntervalDays > 0 ? addDaysToDate(lastServiceDate, serviceIntervalDays) : "";
  const serviceCooldownActive = Boolean(nextAllowedServiceDate && !scheduleDraft.id);
  const today = new Date();
  const todayDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isTaskDueToday = (task) => String(task?.dueDate || "").slice(0, 10) === todayDateKey;
  const canEditTaskForUser = () => true;
  const canInspectTaskForUser = () => true;
  const canPerformTaskForUser = () => true;
  const canAdvanceTaskStageForUser = () => true;
  const stationByAssetTag = new Map(
    (assets || [])
      .filter((asset) => Boolean(asset?.asset_tag))
      .map((asset) => [String(asset.asset_tag), String(asset.location_name || "").trim()]),
  );
  const assetNameByTag = new Map(
    (assets || [])
      .filter((asset) => Boolean(asset?.asset_tag))
      .map((asset) => [String(asset.asset_tag), String(asset.name || "").trim()]),
  );

  const filteredTasks = tasks.filter((task) => {

    const matchesCategory = filters.category === "All Assets" || task.category === filters.category;
    const taskStation = String(stationByAssetTag.get(String(task.assetTag || "")) || "").trim();
    const matchesStation = filters.station === "All Stations" || taskStation === filters.station;
    const taskDate = task.dueDate ? new Date(task.dueDate) : null;
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
    const matchesFrom = !fromDate || !taskDate || taskDate >= fromDate;
    const matchesTo = !toDate || !taskDate || taskDate <= toDate;
    const searchTerm = globalSearch.trim().toLowerCase();
    const matchesSearch =
      !searchTerm ||
      [task.title, task.assetTag, task.category, task.assignee, task.risk, task.stage, taskStation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm));
    return matchesCategory && matchesStation && matchesFrom && matchesTo && matchesSearch;
  });
  const stationOptions = [
    ...new Set(
      [
        ...(locations || []).map((location) => String(location?.name || "").trim()),
        ...stationByAssetTag.values(),
      ].filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const maintenanceTasks = filteredTasks.filter((task) => {
    const pt = (task.processType || task.process_type || "maintenance");
    const st = (task.serviceType || task.service_type || "");
    return pt !== "emergency" && st !== "Gate Pass Emergency Return";
  });

  // Convert inward (returned) gate pass records ONLY to virtual emergency inspection tasks
  const virtualGatePassTasks = (inwardGatePassRecords || []).map((record) => {
    return {
      id: `gp-${record.id}`,
      formatted_id: record.formatted_id || `OUTM-${record.id}`,
      title: `[Gate Pass Return] ${record.asset_name || "Asset"}`,
      assetTag: record.asset_tag || "",
      assetName: record.asset_name || "",
      category: record.category || "",
      serviceType: record.service_type || "Gate Pass Emergency Return",
      service_type: record.service_type || "Gate Pass Emergency Return",
      stage: "inspection",
      processType: "emergency",
      process_type: "emergency",
      risk: "High",
      dueDate: record.in_time ? String(record.in_time).slice(0, 10) : todayDateKey,
      meterReading: record.meter_reading || "",
      inspectionRequired: true,
      inspectionComment: `Returned from outside vendor: ${record.vendor || "N/A"} | Payment: Rs. ${record.payment_amount || "0"}`,
      assignee: record.assignee || "",
      progress: 0,
      isGatePassReturn: true,
      gatePassStatus: record.status,
      vendor: record.vendor || "",
      paymentAmount: record.payment_amount || "",
      inTime: record.in_time || "",
    };
  });

  const dbEmergencyTasks = filteredTasks.filter((task) => {
    const pt = (task.processType || task.process_type || "maintenance");
    const st = (task.serviceType || task.service_type || "");
    return pt === "emergency" || st === "Gate Pass Emergency Return" || st === "Outside Maintenance";
  });

  const allCompletedEmergencyTasks = (completedTasks || []).filter((task) => {
    const pt = (task.processType || task.process_type || "maintenance");
    const st = (task.serviceType || task.service_type || "");
    return pt === "emergency" || st === "Gate Pass Emergency Return" || st === "Outside Maintenance";
  });

  const existingAssetTags = new Set([
    ...dbEmergencyTasks.map((t) => t.assetTag),
    ...allCompletedEmergencyTasks.map((t) => t.assetTag),
  ].filter(Boolean));

  const existingTitles = new Set([
    ...dbEmergencyTasks.map((t) => String(t.title || "").toLowerCase()),
    ...allCompletedEmergencyTasks.map((t) => String(t.title || "").toLowerCase()),
  ]);

  const uniqueVirtualTasks = virtualGatePassTasks.filter(
    (vt) =>
      (!vt.assetTag || !existingAssetTags.has(vt.assetTag)) &&
      (!vt.title || !existingTitles.has(vt.title.toLowerCase())),
  );

  // Merge DB emergency tasks + unique virtual gate pass tasks
  const emergencyRepairTasks = [
    ...dbEmergencyTasks,
    ...uniqueVirtualTasks,
  ];
  const plannedCount = maintenanceTasks.filter((task) => task.stage === "planned").length;
  const riskLevel = maintenanceTasks.some((task) => task.risk === "High")
    ? "High"
    : maintenanceTasks.some((task) => task.risk === "Medium")
      ? "Medium"
      : "Low";
  const [showPendingCreationsModal, setShowPendingCreationsModal] = useState(false);
  const [activeScheduleMode, setActiveScheduleMode] = useState("maintenance");
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState("planned");
  const [activeEmergencyTab, setActiveEmergencyTab] = useState("inspection");
  const [issueInventoryAllocation, setIssueInventoryAllocation] = useState({});
  const [creatingIssueId, setCreatingIssueId] = useState("");
  const [issueInventoryQuantity, setIssueInventoryQuantity] = useState({});
  const [issueDueDate, setIssueDueDate] = useState({});
  const [issueAssignee, setIssueAssignee] = useState({});
  const [expandedPendingIssueId, setExpandedPendingIssueId] = useState("");
  const [maintenanceColSearch, setMaintenanceColSearch] = useState({ id: "", vehicle: "", severity: "", service: "", assignee: "", date: "" });
  const [emergencyColSearch, setEmergencyColSearch] = useState({ id: "", vehicle: "", severity: "", service: "", assignee: "", date: "" });
  const [activeCategoryTab, setActiveCategoryTab] = useState("All");
  const [gatePassInspectionChoice, setGatePassInspectionChoice] = useState({});
  const [gatePassInspectionComment, setGatePassInspectionComment] = useState({});
  const [emergencyType, setEmergencyType] = useState("own");
  const [outsideDraft, setOutsideDraft] = useState({
    asset_name: "",
    asset_tag: "",
    category: "",
    service_type: "",
    assignee: "",
    meter_reading: "",
    vendor: "",
    notes: ""
  });
  const pendingInspectionIssues = useMemo(() => {
    return (allInspectionRecords || [])
      .flatMap((record) => {
        const sourceRecordId = String(record?.id || "");
        if (resolvedInspectionRecordIds.includes(sourceRecordId)) {
          return [];
        }
        const checkpoints = Object.values(record?.checkpoints || {});
        const issueCheckpoints = checkpoints.filter((entry) => {
          const severity = String(entry?.severity || "").toLowerCase();
          return Boolean(entry?.maintenance_needed) || ["medium", "high"].includes(severity);
        });
        if (!issueCheckpoints.length && !record?.needs_maintenance) {
          return [];
        }
        if (!issueCheckpoints.length) {
          return [
            {
              id: `inspection-record-${record?.id || record?.asset_tag || "unknown"}`,
              sourceRecordId,
              assetTag: String(record?.asset_tag || "No Tag"),
              assetName: String(record?.asset_name || "-"),
              category: String(record?.category || "-"),
              station: String(record?.station || "-"),
              inspectionDate: String(record?.inspection_date || ""),
              severity: "Medium",
              title: "Maintenance flagged",
              notes: String(record?.notes || ""),
            },
          ];
        }
        return issueCheckpoints.map((checkpoint, index) => ({
          id: `inspection-${record?.id || "x"}-${index}`,
          sourceRecordId,
          assetTag: String(record?.asset_tag || "No Tag"),
          assetName: String(record?.asset_name || "-"),
          category: String(record?.category || "-"),
          station: String(record?.station || "-"),
          inspectionDate: String(record?.inspection_date || ""),
          severity: String(checkpoint?.severity || "Low"),
          title: String(checkpoint?.title || checkpoint?.name || checkpoint?.checkpoint || "Inspection issue"),
          notes: String(checkpoint?.remarks || checkpoint?.notes || record?.notes || ""),
        }));
      })
      .sort((left, right) => new Date(right.inspectionDate || 0).getTime() - new Date(left.inspectionDate || 0).getTime());
  }, [allInspectionRecords, resolvedInspectionRecordIds]);

  function stageActionLabel(stage, task) {
    if (stage === "planned") {
      return "Inspection";
    }

    if (stage === "inspection") {
      return task?.inspectionRequired === false ? "Decline" : "Await Parts";
    }

    if (stage === "awaiting_parts") {
      return "Start Work";
    }

    if (stage === "in_progress") {
      return "Complete";
    }

    return "Reopen";
  }

  function nextStage(stage, task) {
    if (stage === "planned") {
      return "inspection";
    }

    if (stage === "inspection") {
      return task?.inspectionRequired === false ? "declined" : "awaiting_parts";
    }

    if (stage === "awaiting_parts") {
      return "in_progress";
    }

    if (stage === "in_progress") {
      return "completed";
    }

    return "planned";
  }

  if (!canViewSchedule) {
    return (
      <section className="scheduleWorkspace">
        <section className="panel scheduleFilterPanel">
          <div className="emptyState">You do not have access to view Schedule workflow.</div>
        </section>
      </section>
    );
  }

  const currentModeTasks = activeScheduleMode === 'maintenance' 
    ? maintenanceTasks.filter(t => String(t.stage || "").toLowerCase() === activeMaintenanceTab)
    : emergencyRepairTasks.filter(t => {
        const s = String(t.stage || "").toLowerCase();
        // Emergency tasks in 'planned' stage are treated as 'inspection' (they need to be inspected)
        return s === activeEmergencyTab || (activeEmergencyTab === 'inspection' && s === 'planned');
      });

  const availableCategories = ["All", ...new Set(currentModeTasks.map(t => t.category || "Uncategorized"))].sort((a, b) => {
    if (a === "All") return -1;
    if (b === "All") return 1;
    return a.localeCompare(b);
  });

  const _filteredMaintenanceTasks = maintenanceTasks.filter(task => {
    if (String(task.stage || "").toLowerCase() !== activeMaintenanceTab) return false;
    const taskCategory = task.category || "Uncategorized";
    if (activeCategoryTab !== "All" && activeCategoryTab !== taskCategory) return false;
    
    const vehicleQ = String(maintenanceColSearch?.vehicle || "").toLowerCase();
    const severityQ = String(maintenanceColSearch?.severity || "").toLowerCase();
    const serviceQ = String(maintenanceColSearch?.service || "").toLowerCase();
    const assigneeQ = String(maintenanceColSearch?.assignee || "").toLowerCase();
    const dateQ = String(maintenanceColSearch?.date || "").toLowerCase();
    
    if (vehicleQ && !String(task.assetTag || "").toLowerCase().includes(vehicleQ) && !String(task.assetName || assetNameByTag.get(String(task.assetTag || "")) || "").toLowerCase().includes(vehicleQ)) return false;
    if (severityQ && !String(task.risk || "").toLowerCase().includes(severityQ)) return false;
    if (serviceQ && !String(task.title || "").toLowerCase().includes(serviceQ) && !String(task.serviceType || "").toLowerCase().includes(serviceQ)) return false;
    if (assigneeQ && !String(task.assignee || "").toLowerCase().includes(assigneeQ)) return false;
    if (dateQ && !String(task.dueDate ? formatDate(task.dueDate) : "No due date").toLowerCase().includes(dateQ)) return false;
    return true;
  });

  const finalMaintenanceTasks = [];
  {
    const grouped = new Map();
    _filteredMaintenanceTasks.forEach(task => {
      const dateKey = String(task.dueDate || "").slice(0, 10);
      const groupKey = `${task.assetTag}_${dateKey}_${task.assignee}_${task.stage}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { ...task, isGrouped: false, groupedTasks: [task] });
      } else {
        const existing = grouped.get(groupKey);
        existing.isGrouped = true;
        existing.groupedTasks.push(task);
        
        const titles = new Set(existing.groupedTasks.map(t => t.title || ""));
        existing.title = Array.from(titles).filter(Boolean).join(" + ");
        
        const services = new Set(existing.groupedTasks.map(t => t.serviceType || t.service_type || ""));
        existing.serviceType = Array.from(services).filter(Boolean).join(" + ");
      }
    });
    finalMaintenanceTasks.push(...grouped.values());
  }

  const finalEmergencyTasks = emergencyRepairTasks.filter(task => {
    const s = String(task.stage || "").toLowerCase();
    // Emergency tasks in 'planned' stage also show under 'inspection' tab
    const stageMatch = s === activeEmergencyTab || (activeEmergencyTab === 'inspection' && s === 'planned');
    if (!stageMatch) return false;
    const taskCategory = task.category || "Uncategorized";
    if (activeCategoryTab !== "All" && activeCategoryTab !== taskCategory) return false;

    const vehicleQ = String(emergencyColSearch?.vehicle || "").toLowerCase();
    const severityQ = String(emergencyColSearch?.severity || "").toLowerCase();
    const serviceQ = String(emergencyColSearch?.service || "").toLowerCase();
    const assigneeQ = String(emergencyColSearch?.assignee || "").toLowerCase();
    const dateQ = String(emergencyColSearch?.date || "").toLowerCase();
    
    if (vehicleQ && !String(task.assetTag || "").toLowerCase().includes(vehicleQ) && !String(task.assetName || assetNameByTag.get(String(task.assetTag || "")) || "").toLowerCase().includes(vehicleQ)) return false;
    if (severityQ && !String(task.risk || "").toLowerCase().includes(severityQ)) return false;
    if (serviceQ && !String(task.title || "").toLowerCase().includes(serviceQ)) return false;
    if (assigneeQ && !String(task.assignee || "").toLowerCase().includes(assigneeQ)) return false;
    if (dateQ && !String(task.dueDate ? formatDate(task.dueDate) : "No due date").toLowerCase().includes(dateQ)) return false;
    return true;
  });

  return (
    <section className="scheduleWorkspace monthlyScheduleRedesign">
      <div className="scheduleHeader">
        <div>
          <span className="eyebrow">Workflow Management</span>
          <h1>Maintenance Scheduling</h1>
        </div>
        <div className="scheduleHeaderActions">
          <button className="scheduleGhostButton pendingCreationsButton" type="button" onClick={() => setShowPendingCreationsModal(true)}>
            <ClipboardList size={16} />
            Pending Creations
            <span className="pendingCreationsCount">{pendingInspectionIssues.length}</span>
          </button>
          {canCreateTask ? (
            <>
              {activeScheduleMode === 'emergency' && (
                <button className="scheduleGhostButton" style={{borderColor: '#dc2626', color: '#dc2626'}} type="button" onClick={() => onOpenModal("emergency")}>
                  <Plus size={16} />
                  Emergency Task
                </button>
              )}
              {activeScheduleMode === 'maintenance' && (
                <button className="schedulePrimaryButton" type="button" onClick={() => onOpenModal("maintenance")}>
                  <Plus size={16} />
                  Schedule New Task
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>

      <section className="panel scheduleFilterPanel">
        <div className="scheduleFilterGrid">
          <label className="scheduleFilterField scheduleFilterSpan3">
            <span>Asset Category</span>
            <select value={filters.category} onChange={(event) => onChangeFilter("category", event.target.value)}>
              <option value="All Assets">All Assets</option>
              {assetCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="scheduleFilterField scheduleFilterSpan3">
            <span>Station</span>
            <select value={filters.station} onChange={(event) => onChangeFilter("station", event.target.value)}>
              <option value="All Stations">All Stations</option>
              {stationOptions.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>
          </label>

          {isSuperuser ? (
            <div className="scheduleFilterField scheduleFilterSpan4">
              <span>Date Range</span>
              <div className="scheduleDateRange">
                <CalendarRange size={16} />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => onChangeFilter("dateFrom", event.target.value)}
                />
                <span>to</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => onChangeFilter("dateTo", event.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="scheduleBoard">
        <div className="scheduleModeToggle" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            className={`settingsToggleButton ${activeScheduleMode === 'maintenance' ? 'active' : 'inactive'}`} 
            style={{ 
              padding: '12px 24px', 
              borderRadius: '8px', 
              flex: 1, 
              fontSize: '1.05rem',
              fontWeight: 600,
              backgroundColor: activeScheduleMode === 'maintenance' ? '#eff6ff' : '#ffffff',
              color: activeScheduleMode === 'maintenance' ? '#1d4ed8' : '#64748b',
              border: `1px solid ${activeScheduleMode === 'maintenance' ? '#bfdbfe' : '#e2e8f0'}`,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveScheduleMode('maintenance')}
          >
            Maintenance Schedule
          </button>
          <button 
            className={`settingsToggleButton ${activeScheduleMode === 'emergency' ? 'active' : 'inactive'}`} 
            style={{ 
              padding: '12px 24px', 
              borderRadius: '8px', 
              flex: 1, 
              fontSize: '1.05rem',
              fontWeight: 600,
              backgroundColor: activeScheduleMode === 'emergency' ? '#fef2f2' : '#ffffff',
              color: activeScheduleMode === 'emergency' ? '#b91c1c' : '#64748b',
              border: `1px solid ${activeScheduleMode === 'emergency' ? '#fecaca' : '#e2e8f0'}`,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveScheduleMode('emergency')}
          >
            Emergency Repairs
          </button>
        </div>

        <div className="scheduleTabsWrap settingsCategoryActions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', marginBottom: '16px' }}>
           {availableCategories.map(cat => (
             <button
               key={cat}
               onClick={() => setActiveCategoryTab(cat)}
               style={{
                 padding: '6px 12px',
                 borderRadius: '20px',
                 fontSize: '0.85rem',
                 fontWeight: 600,
                 backgroundColor: activeCategoryTab === cat ? '#3b82f6' : '#f1f5f9',
                 color: activeCategoryTab === cat ? '#ffffff' : '#64748b',
                 border: 'none',
                 cursor: 'pointer',
                 transition: 'all 0.2s'
               }}
             >
               {cat}
             </button>
           ))}
        </div>

        {activeScheduleMode === 'maintenance' ? (
          <>
            <div className="scheduleTabsWrap settingsCategoryActions" style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '16px' }}>
              {scheduleStages.filter((stage) => stage.key !== "completed").map((stage) => {
                const count = maintenanceTasks.filter((task) => String(task.stage || "").toLowerCase() === stage.key).length;
                return (
                  <button 
                    key={stage.key}
                    className={`settingsToggleButton ${activeMaintenanceTab === stage.key ? 'active' : 'inactive'}`}
                    style={{ 
                      flex: 1, 
                      padding: '12px 10px', 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '4px',
                      backgroundColor: activeMaintenanceTab === stage.key ? '#eff6ff' : '#ffffff',
                      color: activeMaintenanceTab === stage.key ? '#1d4ed8' : '#64748b',
                      border: `1px solid ${activeMaintenanceTab === stage.key ? '#bfdbfe' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => { setActiveMaintenanceTab(stage.key); setActiveCategoryTab("All"); }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{stage.label}</span> 
                    <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>{count}</span>
                  </button>
                );
              })}
            </div>

        <div className="nativeTableWrap" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <table className="inventoryTable" style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>ID</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Vehicle</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Severity</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Service Item</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Assignee</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status / Readings</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
                </tr>
                <tr>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search ID..." value={maintenanceColSearch.id} onChange={e => setMaintenanceColSearch({...maintenanceColSearch, id: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search vehicle..." value={maintenanceColSearch.vehicle} onChange={e => setMaintenanceColSearch({...maintenanceColSearch, vehicle: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search severity..." value={maintenanceColSearch.severity} onChange={e => setMaintenanceColSearch({...maintenanceColSearch, severity: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search service..." value={maintenanceColSearch.service} onChange={e => setMaintenanceColSearch({...maintenanceColSearch, service: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search assignee..." value={maintenanceColSearch.assignee} onChange={e => setMaintenanceColSearch({...maintenanceColSearch, assignee: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search date..." value={maintenanceColSearch.date} onChange={e => setMaintenanceColSearch({...maintenanceColSearch, date: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                </tr>
              </thead>
              <tbody>
                {finalMaintenanceTasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.95rem' }}>
                      <div className="emptyState scheduleEmpty" style={{ background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', padding: '40px 20px' }}>
                        No tasks in this stage or matching search.
                      </div>
                    </td>
                  </tr>
                ) : (
                  finalMaintenanceTasks.map((task) => (
                  <tr key={task.id} className="nativeTableRow" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#334155' }}>{task.formatted_id || `#${task.id}`}</strong>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{task.assetName || assetNameByTag.get(String(task.assetTag || "")) || "Unknown Vehicle"}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{task.assetTag}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <strong className={`riskBadge ${getScheduleRiskTone(task.risk)}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{task.risk}</strong>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(task.title || "").split(" + ").map((service, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ color: '#3b82f6', fontSize: '1.1rem', lineHeight: '1' }}>•</span>
                            <strong style={{ fontSize: '0.95rem', color: '#0f172a', lineHeight: '1.3' }}>{service}</strong>
                          </div>
                        ))}
                      </div>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{task.assignee}</strong>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      {task.stage === "inspection" ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              disabled={!canInspectTaskForUser(task)}
                              value={task.inspectionRequired === false ? "Not Need" : "Need"}
                              onChange={(event) => {
                                const newVal = event.target.value !== "Not Need";
                                if (task.isGrouped) {
                                  task.groupedTasks.forEach(t => onUpdateTask(t.id, { inspectionRequired: newVal }));
                                } else {
                                  onUpdateTask(task.id, { inspectionRequired: newVal });
                                }
                              }}
                              style={{ width: '130px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                            >
                              <option value="Need">Needs Inspection</option>
                              <option value="Not Need">Not Needed</option>
                            </select>
                            {task.inspectionRequired === false ? (
                              <input
                                type="text"
                                disabled={!canInspectTaskForUser(task)}
                                defaultValue={task.inspectionComment || ""}
                                key={task.inspectionComment || "empty"}
                                placeholder="Enter reason/comment"
                                onBlur={(event) => {
                                  const newVal = event.target.value;
                                  if (task.isGrouped) {
                                    task.groupedTasks.forEach(t => onUpdateTask(t.id, { inspectionComment: newVal }));
                                  } else {
                                    onUpdateTask(task.id, { inspectionComment: newVal });
                                  }
                                }}
                                style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : ["awaiting_parts", "in_progress"].includes(task.stage) ? (
                        <input
                          type="text"
                          disabled={!canPerformTaskForUser(task)}
                          defaultValue={task.meterReading || ""}
                          key={task.meterReading || "empty"}
                          placeholder="Current meter reading"
                          onBlur={(event) => {
                            const newVal = event.target.value;
                            if (task.isGrouped) {
                              task.groupedTasks.forEach(t => onUpdateTask(t.id, { meterReading: newVal }));
                            } else {
                              onUpdateTask(task.id, { meterReading: newVal });
                            }
                          }}
                          style={{ width: '180px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No pending readings</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div className="settingsCategoryActions" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {canEditTaskForUser(task) ? (
                          <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditTask(task)} style={{ padding: '4px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>
                            <Edit2 size={14} />
                          </button>
                        ) : null}
                        {isSuperuser && task.stage === "planned" ? (
                          <button className="iconActionBtn deleteBtn" title="Delete" type="button" style={{ padding: '4px', borderRadius: '4px', background: '#fef2f2', color: '#dc2626'}} onClick={() => {
                            if (task.isGrouped) {
                              task.groupedTasks.forEach(t => onDeleteTask(t));
                            } else {
                              onDeleteTask(task);
                            }
                          }}>
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                        {canAdvanceTaskStageForUser(task) ? (
                          task.stage === "awaiting_parts" && task.approvalStatus !== "approved" ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: (task.approvalStatus === 'rejected' ? '#dc2626' : '#b45309'), background: (task.approvalStatus === 'rejected' ? '#fef2f2' : '#fef3c7'), border: `1px solid ${task.approvalStatus === 'rejected' ? '#fecaca' : '#fde68a'}`, padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {task.approvalStatus === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                            </span>
                          ) : (
                            <button className="schedulePrimaryButton" type="button" style={{minHeight: '28px', padding: '4px 12px', fontSize: '0.8rem', borderRadius: '4px', fontWeight: 600, boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'}} onClick={() => {
                              if (task.isGrouped) {
                                task.groupedTasks.forEach(t => onMoveTask(t.id, nextStage(task.stage, t)));
                              } else {
                                onMoveTask(task.id, nextStage(task.stage, task));
                              }
                            }}>
                              {stageActionLabel(task.stage, task)}
                            </button>
                          )
                        ) : null}
                        <button
                          type="button"
                          className="settingsSecondaryButton"
                          title="Print Task"
                          onClick={() => printEntry(task, "Maintenance Task")}
                          style={{ padding: '6px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
        </>
      ) : (
        <>
          <div className="scheduleTabsWrap settingsCategoryActions" style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '16px' }}>
            {scheduleStages.filter((stage) => !["planned", "completed"].includes(stage.key)).map((stage) => {
              const count = emergencyRepairTasks.filter((task) => {
                const s = String(task.stage || "").toLowerCase();
                // 'planned' emergency tasks count under 'inspection'
                return s === stage.key || (stage.key === 'inspection' && s === 'planned');
              }).length;
              return (
                <button 
                  key={`emergency-${stage.key}`}
                  className={`settingsToggleButton ${activeEmergencyTab === stage.key ? 'active' : 'inactive'}`}
                  style={{ 
                    flex: 1, 
                    padding: '12px 10px', 
                    textAlign: 'center', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '4px',
                    backgroundColor: activeEmergencyTab === stage.key ? '#fef2f2' : '#ffffff',
                    color: activeEmergencyTab === stage.key ? '#b91c1c' : '#64748b',
                    border: `1px solid ${activeEmergencyTab === stage.key ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => { setActiveEmergencyTab(stage.key); setActiveCategoryTab("All"); }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{stage.label}</span> 
                  <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="nativeTableWrap" style={{ marginTop: '16px', marginBottom: '24px' }}>

              <table className="inventoryTable" style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>ID</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Vehicle</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Severity</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Service Item</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Assignee</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status / Readings</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                  <tr>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search ID..." value={emergencyColSearch.id} onChange={e => setEmergencyColSearch({...emergencyColSearch, id: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search vehicle..." value={emergencyColSearch.vehicle} onChange={e => setEmergencyColSearch({...emergencyColSearch, vehicle: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search severity..." value={emergencyColSearch.severity} onChange={e => setEmergencyColSearch({...emergencyColSearch, severity: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search service..." value={emergencyColSearch.service} onChange={e => setEmergencyColSearch({...emergencyColSearch, service: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search assignee..." value={emergencyColSearch.assignee} onChange={e => setEmergencyColSearch({...emergencyColSearch, assignee: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search date..." value={emergencyColSearch.date} onChange={e => setEmergencyColSearch({...emergencyColSearch, date: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {finalEmergencyTasks.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.95rem' }}>
                        <div className="emptyState scheduleEmpty" style={{ background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', padding: '40px 20px' }}>
                          No emergency tasks in this stage or matching search.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    finalEmergencyTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="nativeTableRow"
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: task.isGatePassReturn ? '#fffdf5' : '#ffffff',
                        borderLeft: task.isGatePassReturn ? '4px solid #f59e0b' : 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* ID */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ fontSize: '0.92rem', color: '#1e293b', fontFamily: 'inherit' }}>
                            {task.formatted_id || `#${task.id}`}
                          </strong>
                          {task.isGatePassReturn && (
                            <span style={{
                              fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em',
                              background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5',
                              padding: '2px 6px', borderRadius: '4px', width: 'fit-content'
                            }}>
                              GATE PASS RETURN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vehicle / Asset */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                            {task.assetName || assetNameByTag.get(String(task.assetTag || "")) || "Unknown Vehicle"}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '4px' }}>
                              {task.assetTag || "-"}
                            </span>
                            {task.vendor && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                                Vendor: <strong>{task.vendor}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <strong className={`riskBadge ${getScheduleRiskTone(task.risk)}`} style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px' }}>
                          {task.risk}
                        </strong>
                      </td>

                      {/* Service Item */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{task.title}</strong>
                            {(task.serviceType || task.service_type) && (task.serviceType !== "Gate Pass Emergency Return") && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {task.serviceType || task.service_type}
                              </span>
                            )}
                          </div>
                          {task.inspectionComment && (
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{task.inspectionComment}</div>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        {task.assignee ? (
                          <strong style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{task.assignee}</strong>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.84rem', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                        </span>
                      </td>

                      {/* Status / Readings */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        {task.stage === "inspection" ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select
                                disabled={!canInspectTaskForUser(task)}
                                value={gatePassInspectionChoice[task.id] ?? (task.inspectionRequired === false ? "Not Need" : "Need")}
                                onChange={(event) => {
                                  const val = event.target.value;
                                  setGatePassInspectionChoice(prev => ({ ...prev, [task.id]: val }));
                                  if (!task.isGatePassReturn) {
                                    onUpdateTask(task.id, {
                                      inspectionRequired: val !== "Not Need",
                                    });
                                  }
                                }}
                                style={{ width: '130px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                              >
                                <option value="Need">Needs Inspection</option>
                                <option value="Not Need">Not Needed</option>
                              </select>
                              {(gatePassInspectionChoice[task.id] === "Not Need" || (gatePassInspectionChoice[task.id] === undefined && task.inspectionRequired === false)) ? (
                                <input
                                  type="text"
                                  disabled={!canInspectTaskForUser(task)}
                                  defaultValue={gatePassInspectionComment[task.id] || task.inspectionComment || ""}
                                  placeholder="Enter reason/comment"
                                  onBlur={(event) => {
                                    const commentVal = event.target.value;
                                    setGatePassInspectionComment(prev => ({ ...prev, [task.id]: commentVal }));
                                    if (!task.isGatePassReturn) {
                                      onUpdateTask(task.id, {
                                        inspectionComment: commentVal,
                                      });
                                    }
                                  }}
                                  style={{ width: '160px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                />
                              ) : null}
                            </div>
                          </div>
                        ) : ["awaiting_parts", "in_progress"].includes(task.stage) ? (
                          <input
                            type="text"
                            disabled={!canPerformTaskForUser(task)}
                            defaultValue={task.meterReading || ""}
                            key={task.meterReading || "empty"}
                            placeholder="Current meter reading"
                            onBlur={(event) =>
                              onUpdateTask(task.id, {
                                meterReading: event.target.value,
                              })
                            }
                            style={{ width: '180px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No pending readings</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div className="settingsCategoryActions" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {!task.isGatePassReturn && canEditTaskForUser(task) ? (
                            <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditTask(task)} style={{ padding: '5px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>
                              <Edit2 size={14} />
                            </button>
                          ) : null}
                          {!task.isGatePassReturn && isSuperuser && task.stage === "planned" ? (
                            <button className="iconActionBtn deleteBtn" title="Delete" type="button" style={{ padding: '5px', borderRadius: '4px', background: '#fef2f2', color: '#dc2626'}} onClick={() => onDeleteTask(task)}>
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                          {/* Normal emergency task advance button */}
                          {(!task.isGatePassReturn || ["awaiting_parts", "in_progress"].includes(task.stage)) && canAdvanceTaskStageForUser(task) ? (
                            task.stage === "awaiting_parts" && task.approvalStatus !== "approved" ? (
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: (task.approvalStatus === 'rejected' ? '#dc2626' : '#b45309'), background: (task.approvalStatus === 'rejected' ? '#fef2f2' : '#fef3c7'), border: `1px solid ${task.approvalStatus === 'rejected' ? '#fecaca' : '#fde68a'}`, padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {task.approvalStatus === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                              </span>
                            ) : (
                              <button className="schedulePrimaryButton" type="button" style={{minHeight: '28px', padding: '4px 12px', fontSize: '0.8rem', borderRadius: '4px', fontWeight: 600, boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'}} onClick={() => onMoveTask(task.id, nextStage(task.stage, task))}>
                                {stageActionLabel(task.stage, task)}
                              </button>
                            )
                          ) : null}
                          {/* Gate pass return: Action button handles both "Needs Inspection" -> awaiting_parts and "Not Needed" -> declined */}
                          {task.isGatePassReturn && !["awaiting_parts", "in_progress", "completed", "declined"].includes(task.stage) && (canInspectTask || isSuperuser) ? (
                            <button
                              className="schedulePrimaryButton"
                              type="button"
                              style={{
                                minHeight: '30px', padding: '6px 14px', fontSize: '0.82rem',
                                borderRadius: '6px', fontWeight: 600,
                                background: (gatePassInspectionChoice[task.id] === "Not Need" || (gatePassInspectionChoice[task.id] === undefined && task.inspectionRequired === false)) ? '#dc2626' : '#2563eb',
                                color: '#ffffff', border: 'none', cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                              onClick={() => {
                                const isNotNeed = gatePassInspectionChoice[task.id] === "Not Need" || (gatePassInspectionChoice[task.id] === undefined && task.inspectionRequired === false);
                                const targetStage = isNotNeed ? "declined" : "awaiting_parts";
                                const comment = gatePassInspectionComment[task.id] || task.inspectionComment || (isNotNeed ? "Not needed during emergency gate pass return inspection" : "");
                                onSaveTask({
                                  title: task.title,
                                  serviceType: task.serviceType || "Outside Maintenance",
                                  service_type: task.serviceType || "Outside Maintenance",
                                  assetTag: task.assetTag || task.assetName,
                                  asset_tag: task.assetTag || task.assetName,
                                  assetName: task.assetName || task.assetTag,
                                  asset_name: task.assetName || task.assetTag,
                                  category: task.category || "",
                                  stage: targetStage,
                                  processType: "emergency",
                                  process_type: "emergency",
                                  risk: "High",
                                  dueDate: task.dueDate || todayDateKey,
                                  due_date: task.dueDate || todayDateKey,
                                  meterReading: task.meterReading || "",
                                  meter_reading: task.meterReading || "",
                                  inspectionRequired: !isNotNeed,
                                  inspection_required: !isNotNeed,
                                  inspectionComment: comment,
                                  inspection_comment: comment,
                                  assignee: task.assignee || "",
                                });
                              }}
                            >
                              {(gatePassInspectionChoice[task.id] === "Not Need" || (gatePassInspectionChoice[task.id] === undefined && task.inspectionRequired === false)) ? "Decline" : "Await Parts"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="settingsSecondaryButton"
                            title="Print Task"
                            onClick={() => printEntry(task, "Schedule Task")}
                            style={{ padding: '6px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))


                )}
                </tbody>
              </table>
          </div>
        </>
      )}
      </section>
      {showPendingCreationsModal ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={() => setShowPendingCreationsModal(false)}>
          <section
            className="panel assetModal open scheduleModal pendingCreationsModal"
            role="dialog"
            aria-modal="true"
            aria-label="Pending Creations from Daily Inspection"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>Pending Creations - Daily Inspection Issues</h2>
              <div className="assetModalActions">
                <button type="button" onClick={() => setShowPendingCreationsModal(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="pendingCreationsBody">
              {pendingInspectionIssues.length === 0 ? (
                <div className="emptyState">No issues found in daily inspections.</div>
              ) : (
                pendingInspectionIssues.map((issue) => (
                  <article key={issue.id} className="pendingCreationIssueCard">
                    <button
                      type="button"
                      className="pendingCreationIssueSummary"
                      onClick={() =>
                        setExpandedPendingIssueId((current) => (current === issue.id ? "" : issue.id))
                      }
                    >
                      <div className="pendingCreationIssueHead">
                        <strong>{issue.assetTag}</strong>
                        <span className={`riskBadge ${getScheduleRiskTone(issue.severity)}`}>{issue.severity}</span>
                      </div>
                      <h3>{issue.title}</h3>
                    </button>
                    {expandedPendingIssueId === issue.id ? (
                      <>
                        <p>{issue.assetName} - {issue.station}</p>
                        <small>{issue.inspectionDate ? formatDate(issue.inspectionDate) : "No inspection date"}</small>
                        {issue.notes ? <div className="pendingCreationIssueNotes">{issue.notes}</div> : null}
                        <div className="pendingCreationIssueActions">
                          <label>
                            <span>Inventory Allocation</span>
                            <select
                              value={String(issueInventoryAllocation[issue.id] || "")}
                              onChange={(event) =>
                                setIssueInventoryAllocation((current) => ({ ...current, [issue.id]: event.target.value }))
                              }
                            >
                              <option value="">No allocation</option>
                              {(itemOptions || []).map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                  {item.name} ({formatQuantity(item.inventory_quantity)} available)
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Inventory Quantity</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={String(issueInventoryQuantity[issue.id] ?? 1)}
                              onChange={(event) =>
                                setIssueInventoryQuantity((current) => ({
                                  ...current,
                                  [issue.id]: Math.max(1, Number(event.target.value) || 1),
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Due Date</span>
                            <input
                              type="date"
                              value={String(issueDueDate[issue.id] || todayInputValue())}
                              onChange={(event) =>
                                setIssueDueDate((current) => ({
                                  ...current,
                                  [issue.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Assignee</span>
                            <select
                              value={String(issueAssignee[issue.id] || "")}
                              onChange={(event) =>
                                setIssueAssignee((current) => ({
                                  ...current,
                                  [issue.id]: event.target.value,
                                }))
                              }
                            >
                              <option value="">Unassigned</option>
                              {assigneeOptions.map((option) => (
                                <option key={`pending-assignee-${issue.id}-${option.value}`} value={option.value}>
                                  {option.value}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="schedulePrimaryButton"
                            disabled={!canCreateTask || creatingIssueId === issue.id}
                            onClick={async () => {
                              try {
                                setCreatingIssueId(issue.id);
                                await onCreateTaskFromInspection(
                                  issue,
                                  issueInventoryAllocation[issue.id] || "",
                                  issueInventoryQuantity[issue.id] || 1,
                                  issueDueDate[issue.id] || todayInputValue(),
                                  issueAssignee[issue.id] || "",
                                );
                                onResolveInspectionRecord(issue.sourceRecordId);
                              } finally {
                                setCreatingIssueId("");
                              }
                            }}
                          >
                            {creatingIssueId === issue.id ? "Creating..." : "Create Task"}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {scheduleModalOpen && canCreateTask ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseModal}>
          <section
            className="panel assetModal open scheduleModal"
            role="dialog"
            aria-modal="true"
            aria-label="Schedule New Task"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>
                {scheduleDraft.id
                  ? "Update Task"
                  : scheduleDraft.processType === "emergency"
                    ? "Add Emergency Task"
                    : "Schedule New Task"}
              </h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseModal}>
                  Close
                </button>
              </div>
            </div>
            
            {scheduleDraft.processType === "emergency" && !scheduleDraft.id && (
              <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>
                  How will this emergency be handled?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Own card */}
                  <label style={{
                    display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer',
                    padding: '14px 16px', borderRadius: '10px',
                    border: `2px solid ${emergencyType === "own" ? "#2563eb" : "#e2e8f0"}`,
                    background: emergencyType === "own" ? "#eff6ff" : "#ffffff",
                    transition: 'all 0.18s ease',
                    boxShadow: emergencyType === "own" ? "0 0 0 3px #bfdbfe44" : "none",
                  }}>
                    <input type="radio" name="emergencyType" value="own"
                      checked={emergencyType === "own"}
                      onChange={(e) => setEmergencyType(e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${emergencyType === "own" ? "#2563eb" : "#cbd5e1"}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {emergencyType === "own" && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: emergencyType === "own" ? "#1d4ed8" : "#0f172a" }}>
                        Own (Internal Employees)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', paddingLeft: '24px' }}>
                      Task handled by internal staff. Standard emergency workflow applies.
                    </span>
                  </label>

                  {/* Outside Maintenance card */}
                  <label style={{
                    display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer',
                    padding: '14px 16px', borderRadius: '10px',
                    border: `2px solid ${emergencyType === "outside" ? "#b91c1c" : "#e2e8f0"}`,
                    background: emergencyType === "outside" ? "#fef2f2" : "#ffffff",
                    transition: 'all 0.18s ease',
                    boxShadow: emergencyType === "outside" ? "0 0 0 3px #fecaca44" : "none",
                  }}>
                    <input type="radio" name="emergencyType" value="outside"
                      checked={emergencyType === "outside"}
                      onChange={(e) => setEmergencyType(e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${emergencyType === "outside" ? "#b91c1c" : "#cbd5e1"}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {emergencyType === "outside" && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b91c1c' }} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: emergencyType === "outside" ? "#b91c1c" : "#0f172a" }}>
                        Outside Maintenance (Gate Pass)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', paddingLeft: '24px' }}>
                      Asset sent outside the gate to external vendor for repair.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {emergencyType === "outside" && scheduleDraft.processType === "emergency" && !scheduleDraft.id ? (
              <div className="scheduleModalGrid">
                <label className="assetField">
                  <span>Service Type</span>
                  <SearchableDropdown
                    allowCustom
                    label="Service Type"
                    onChange={(val) => setOutsideDraft(cur => ({ ...cur, service_type: val }))}
                    options={serviceTypeOptions}
                    placeholder="Select task / service type"
                    value={outsideDraft.service_type}
                  />
                </label>
                <label className="assetField">
                  <span>Assignee (Employee)</span>
                  <SearchableDropdown
                    allowCustom
                    label="Assignee"
                    onChange={(val) => setOutsideDraft(cur => ({ ...cur, assignee: val }))}
                    options={assigneeOptions}
                    placeholder="Select employee / assignee"
                    value={outsideDraft.assignee}
                  />
                </label>
                <label className="assetField">
                  <span>Asset Name</span>
                  <input
                    type="text"
                    value={outsideDraft.asset_name}
                    onChange={(e) => setOutsideDraft(cur => ({ ...cur, asset_name: e.target.value }))}
                    placeholder="E.g. Generator A"
                  />
                </label>
                <label className="assetField">
                  <span>Asset Tag</span>
                  <SearchableDropdown
                    allowCustom
                    label="Asset Tag"
                    onChange={(val) => setOutsideDraft(cur => ({ ...cur, asset_tag: val }))}
                    options={assetTagOptions}
                    placeholder="Select or search asset tag"
                    value={outsideDraft.asset_tag}
                  />
                </label>
                <label className="assetField">
                  <span>Asset Category</span>
                  <SearchableDropdown
                    allowCustom
                    label="Asset Category"
                    onChange={(val) => setOutsideDraft(cur => ({ ...cur, category: val }))}
                    options={assetCategories}
                    placeholder="Select category"
                    value={outsideDraft.category}
                  />
                </label>
                <label className="assetField">
                  <span>Meter Reading</span>
                  <input
                    type="text"
                    value={outsideDraft.meter_reading}
                    onChange={(e) => setOutsideDraft(cur => ({ ...cur, meter_reading: e.target.value }))}
                    placeholder="Current reading"
                  />
                </label>
                <label className="assetField">
                  <span>Vendor</span>
                  <input
                    type="text"
                    value={outsideDraft.vendor}
                    onChange={(e) => setOutsideDraft(cur => ({ ...cur, vendor: e.target.value }))}
                    placeholder="External repair company"
                  />
                </label>
                <label className="assetField" style={{ gridColumn: '1 / -1' }}>
                  <span>Notes / Details</span>
                  <textarea
                    value={outsideDraft.notes}
                    onChange={(e) => setOutsideDraft(cur => ({ ...cur, notes: e.target.value }))}
                    placeholder="Additional context about the breakdown..."
                    style={{ minHeight: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                  />
                </label>
              </div>
            ) : (
              <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Service Type</span>
                <SearchableDropdown
                  allowCustom
                  label="Service Type"
                  onChange={(nextValue) => setScheduleDraft((current) => ({ ...current, serviceType: nextValue }))}
                  options={serviceTypeOptions}
                  placeholder="Select task type"
                  value={scheduleDraft.serviceType}
                />
              </label>
              <label className="assetField">
                <span>Task Title</span>
                <input
                  type="text"
                  value={scheduleDraft.title}
                  onChange={(event) => setScheduleDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Quarterly compressor service"
                />
              </label>
              <label className="assetField">
                <span>Asset Category</span>
                <SearchableDropdown
                  label="Asset Category"
                  onChange={(nextValue) => setScheduleDraft((current) => ({ ...current, category: nextValue }))}
                  options={assetCategories}
                  placeholder="Select category"
                  value={scheduleDraft.category}
                />
              </label>
              <label className="assetField">
                <span>Asset Tag</span>
                <SearchableDropdown
                  allowCustom
                  label="Asset Tag"
                  onChange={(nextValue) => setScheduleDraft((current) => ({ ...current, assetTag: nextValue }))}
                  options={assetTagOptions}
                  placeholder="Select or search asset tag"
                  value={scheduleDraft.assetTag}
                />
              </label>
              <label className="assetField">
                <span>Last Service</span>
                <input type="text" value={lastServiceDate ? formatDate(lastServiceDate) : "No previous record"} readOnly />
                {nextAllowedServiceDate ? (
                  <span className="scheduleHint locked">
                    Next service allowed on {formatDate(nextAllowedServiceDate)} after {serviceIntervalDays} days.
                  </span>
                ) : null}
              </label>
              <label className="assetField">
                <span>Assignee</span>
                <SearchableDropdown
                  allowCustom
                  label="Assignee"
                  onChange={(nextValue) => setScheduleDraft((current) => ({ ...current, assignee: nextValue }))}
                  options={assigneeOptions}
                  placeholder="Select assignee"
                  value={scheduleDraft.assignee}
                />
              </label>
              <label className="assetField">
                <span>Due Date</span>
                <input
                  type="date"
                  disabled={serviceCooldownActive}
                  value={scheduleDraft.dueDate}
                  onChange={(event) => setScheduleDraft((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>
              <label className="assetField">
                <span>Priority Level</span>
                <select
                  disabled={serviceCooldownActive}
                  value={scheduleDraft.risk}
                  onChange={(event) => setScheduleDraft((current) => ({ ...current, risk: event.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>
              <label className="assetField">
                <span>Consumed Item</span>
                <SearchableDropdown
                  allowCustom
                  label="Consumed Item"
                  disabled={serviceCooldownActive}
                  onChange={(nextValue) =>
                    setScheduleDraft((current) => ({
                      ...current,
                      serviceType: nextValue ? current.serviceType : "Operational Check",
                      consumedItemName: nextValue,
                      consumedItemId: (itemOptions || []).find((item) => (typeof item === "object" ? item.name : item) === nextValue)?.id ?? null,
                    }))
                  }
                  options={(itemOptions || []).map((item) => (typeof item === "object" ? item.name : item)).filter(Boolean)}
                  placeholder="Select inventory item"
                  value={scheduleDraft.consumedItemName}
                />
              </label>
              <label className="assetField">
                <span>Consumed Quantity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  disabled={serviceCooldownActive}
                  value={scheduleDraft.consumedQuantity}
                  onChange={(event) =>
                    setScheduleDraft((current) => ({ ...current, consumedQuantity: event.target.value }))
                  }
                />
              </label>
              </div>
            )}
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={async () => {
                if (emergencyType === "outside" && scheduleDraft.processType === "emergency" && !scheduleDraft.id) {
                  try {
                    const payload = {
                      ...outsideDraft,
                      service_type: (outsideDraft.service_type || "").trim() || "Outside Maintenance",
                    };
                    await createOutsideMaintenanceRecord(payload, activeModuleKey);
                    if (onRefreshGatePasses) {
                      await onRefreshGatePasses();
                    }
                    alert("Gate Pass / Outside Maintenance created successfully.");
                    onCloseModal();
                  } catch (e) {
                    alert("Error: " + e.message);
                    console.error(e);
                  }
                } else {
                  onSaveTask();
                }
              }}>
                {scheduleDraft.id ? "Update Task" : "Save Task"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

