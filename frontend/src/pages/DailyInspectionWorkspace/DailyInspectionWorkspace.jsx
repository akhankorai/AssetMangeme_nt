import { useState, useEffect, useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { todayInputValue } from "../../utils/dateHelpers";
import { DEFAULT_REGULAR_INSPECTION_LIST } from "../../constants";
import MonthlyMaintenanceWorkspace from "../MonthlyMaintenanceWorkspace/MonthlyMaintenanceWorkspace";

export default function DailyInspectionWorkspace({
  assets,
  locations,
  teamMembers,
  tasks,
  completedTasks,
  inspectionRecords,
  allInspectionRecords,
  resolvedInspectionRecordIds,
  regularInspectionList,
  serviceTypes,
  onSaveInspectionForVehicle,
  onOpenInspection,
  canViewSchedule,
  monthlyMaintenanceProps,
}) {
  const todayDate = todayInputValue();
  const dailyOpenTasks = (tasks || [])
    .filter((task) => String(task?.dueDate || "").slice(0, 10) === todayDate)
    .sort(
      (left, right) =>
        new Date(left?.dueDate || left?.assignedAt || 0).getTime() - new Date(right?.dueDate || right?.assignedAt || 0).getTime(),
    );
  const dailyCompletedTasks = (completedTasks || []).filter((task) => String(task?.dueDate || "").slice(0, 10) === todayDate);
  const taskByAssetTag = new Map();
  const completedByAssetTag = new Map();
  for (const task of dailyOpenTasks) {
    const key = String(task?.assetTag || "").trim();
    if (key && !taskByAssetTag.has(key)) {
      taskByAssetTag.set(key, task);
    }
  }
  for (const task of dailyCompletedTasks) {
    const key = String(task?.assetTag || "").trim();
    if (key && !completedByAssetTag.has(key)) {
      completedByAssetTag.set(key, task);
    }
  }
  const vehicleInspectionRows = (assets || [])
    .map((asset) => {
      const assetTag = String(asset?.asset_tag || "").trim();
      const openTask = taskByAssetTag.get(assetTag);
      const completedTask = completedByAssetTag.get(assetTag);
      const checkKey = String(assetTag || asset?.id || "");
      const inspectionRecord = inspectionRecords?.[checkKey] || null;
      const manuallyChecked = Boolean(inspectionRecord?.completed);
      const hasInspectionToday = Boolean(
        manuallyChecked || openTask && !["planned"].includes(String(openTask?.stage || "").toLowerCase()) || completedTask,
      );
      const hasPendingInspection = Boolean(openTask && String(openTask?.stage || "").toLowerCase() === "planned");
      return {
        id: asset.id,
        checkKey,
        assetTag: assetTag || "No Tag",
        name: asset.name || "-",
        category: asset.category_name || "-",
        station: asset.location_name || "-",
        status: hasInspectionToday ? "Checked Today" : hasPendingInspection ? "Pending" : "No Task Today",
        tone: hasInspectionToday ? "good" : hasPendingInspection ? "medium" : "low",
        task: openTask || completedTask || null,
        inspectionRecord,
      };
    })
    .sort((left, right) => left.assetTag.localeCompare(right.assetTag));

  const vehicleTypeOptions = useMemo(
    () =>
      Array.from(new Set((assets || []).map((entry) => String(entry?.category_name || "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [assets],
  );
  const [selectedVehicleType, setSelectedVehicleType] = useState("");
  const [selectedVehicleNo, setSelectedVehicleNo] = useState("");
  const [selectedStation, setSelectedStation] = useState("");
  const [currentMeterReading, setCurrentMeterReading] = useState("");
  const [selectedInspector, setSelectedInspector] = useState("");
  const [selectedCheckupType, setSelectedCheckupType] = useState("");
  const [inspectionDateFrom, setInspectionDateFrom] = useState("");
  const [inspectionDateTo, setInspectionDateTo] = useState("");
  const filteredVehicleRows = useMemo(
    () => vehicleInspectionRows.filter((row) => !selectedVehicleType || row.category === selectedVehicleType),
    [vehicleInspectionRows, selectedVehicleType],
  );
  const stationOptions = useMemo(
    () => Array.from(new Set((locations || []).map((entry) => String(entry?.name || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [locations],
  );
  const fleetInspectorOptions = useMemo(
    () =>
      (teamMembers || [])
        .filter((member) => {
          const categoryName = String(member?.employee_category_name || member?.employeeCategoryName || "").trim().toLowerCase();
          return categoryName.includes("fleet inspector");
        })
        .map((member) => String(member?.name || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [teamMembers],
  );
  const checkupTypeOptions = useMemo(
    () =>
      (serviceTypes || [])
        .filter((serviceType) => serviceType?.is_active !== false)
        .map((serviceType) => String(serviceType?.name || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [serviceTypes],
  );
  const sampleRow = filteredVehicleRows.find((row) => row.checkKey === selectedVehicleNo) || filteredVehicleRows[0] || null;
  const previousMeterReadingForSelectedVehicle = useMemo(() => {
    if (!sampleRow?.assetTag) {
      return "0";
    }
    const selectedTag = String(sampleRow.assetTag || "").trim();
    const matchedRows = (allInspectionRecords || [])
      .filter((record) => String(record?.asset_tag || "").trim() === selectedTag)
      .sort(
        (left, right) =>
          new Date(right?.completed_at || right?.inspection_date || 0).getTime() -
          new Date(left?.completed_at || left?.inspection_date || 0).getTime(),
      );
    const latest = matchedRows.find((record) => String(record?.meter_reading || "").trim());
    const latestReading = String(latest?.meter_reading || "").trim();
    if (!latestReading) {
      return "0";
    }
    const numericReading = latestReading.replace(/[^0-9.]/g, "");
    return numericReading || "0";
  }, [allInspectionRecords, sampleRow]);
  const sourceChecklistRows = regularInspectionList.length > 0 ? regularInspectionList : DEFAULT_REGULAR_INSPECTION_LIST;
  const fallbackChecklistRows = sourceChecklistRows.map((entry, index) => ({
    id: `chk-default-${entry.id || index + 1}`,
    category: entry.category,
    checkItem: entry.check_item,
    standard: entry.standard,
    status: "OK",
    severity: "",
    remarks: "",
    action: "No",
  }));
  const checklistRowsFromSettings = (serviceTypes || [])
    .map((entry, index) => {
      const category = String(entry?.category || entry?.category_name || entry?.inspection_category || "").trim();
      const checkItem = String(entry?.check_item || entry?.checkItem || entry?.inspection_item || entry?.name || "").trim();
      const standard = String(entry?.standard || entry?.inspection_standard || entry?.description || "").trim();
      if (!category || !checkItem || !standard) {
        return null;
      }
      return {
        id: `chk-settings-${entry?.id || index + 1}`,
        category,
        checkItem,
        standard,
        status: "OK",
        severity: "",
        remarks: "",
        action: "No",
      };
    })
    .filter(Boolean);
  const [checklistPreviewRows, setChecklistPreviewRows] = useState(
    checklistRowsFromSettings.length > 0 ? checklistRowsFromSettings : fallbackChecklistRows,
  );
  const [activeTab, setActiveTab] = useState("entry");
  useEffect(() => {
    if (checklistRowsFromSettings.length > 0) {
      setChecklistPreviewRows((current) => {
        const previousById = new Map(current.map((row) => [row.id, row]));
        return checklistRowsFromSettings.map((row) => {
          const previous = previousById.get(row.id);
          return previous
            ? { ...row, severity: previous.severity, remarks: previous.remarks }
            : row;
        });
      });
    }
  }, [checklistRowsFromSettings]);
  const checklistOkCount = checklistPreviewRows.filter(
    (row) => (row.action === "Yes" || row.status === "NOT OK") ? false : true
  ).length;
  const checklistNotOkCount = checklistPreviewRows.filter(
    (row) => row.action === "Yes" || row.status === "NOT OK"
  ).length;
  const checklistObservationCount = checklistPreviewRows.filter(
    (row) => Boolean(row.severity) && row.severity !== "Low"
  ).length;
  const assetRowByTag = useMemo(() => {
    const map = new Map();
    vehicleInspectionRows.forEach((row) => {
      const key = String(row.assetTag || "").trim();
      if (key && !map.has(key)) {
        map.set(key, row);
      }
    });
    return map;
  }, [vehicleInspectionRows]);
  const savedInspectionRows = (allInspectionRecords || [])
    .map((record) => {
      const assetTag = String(record?.asset_tag || "").trim();
      const matchedRow = assetRowByTag.get(assetTag);
      const checkpointsObject = record?.checkpoints || {};
      const checkpoints = Object.values(checkpointsObject);
      const issueCheckpoints = checkpoints.filter((entry) => {
        const severity = String(entry?.severity || "").toLowerCase();
        return Boolean(entry?.maintenance_needed) || ["medium", "high"].includes(severity);
      });
      const highestSeverity = issueCheckpoints.some((entry) => String(entry?.severity || "").toLowerCase() === "high")
        ? "High"
        : issueCheckpoints.length > 0
          ? "Medium"
          : "Low";
      return {
        id: matchedRow?.id || record?.id,
        checkKey: assetTag || String(record?.id || ""),
        assetTag: assetTag || "No Tag",
        name: record?.asset_name || matchedRow?.name || "-",
        category: record?.category || matchedRow?.category || "-",
        station: record?.station || matchedRow?.station || "-",
        inspectionDate: String(record?.inspection_date || ""),
        inspectionRecord: {
          id: record?.id,
          completed: Boolean(record?.completed),
          completedAt: record?.completed_at || "",
          checkpoints: checkpointsObject,
          needsMaintenance: record?.needs_maintenance ? "yes" : "no",
          notes: record?.notes || "",
        },
        issueCheckpoints,
        hasIssues: Boolean(record?.needs_maintenance) || issueCheckpoints.length > 0,
        highestSeverity,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.inspectionRecord?.completedAt || 0).getTime() - new Date(left.inspectionRecord?.completedAt || 0).getTime(),
    );
  const dateFilteredInspectionRows = savedInspectionRows.filter((row) => {
    const inspectionDate = String(row.inspectionDate || "").slice(0, 10);
    if (!inspectionDate) {
      return !inspectionDateFrom && !inspectionDateTo;
    }
    if (inspectionDateFrom && inspectionDate < inspectionDateFrom) {
      return false;
    }
    if (inspectionDateTo && inspectionDate > inspectionDateTo) {
      return false;
    }
    return true;
  });
  const [issuesColSearch, setIssuesColSearch] = useState({ issueId: "", details: "", severity: "", status: "" });
  const [completedColSearch, setCompletedColSearch] = useState({ assetTag: "", assetName: "" });

  const issueInspectionRows = dateFilteredInspectionRows.filter((row) => row.hasIssues);
  const visibleIssueInspectionRows = issueInspectionRows.filter(
    (row) => !resolvedInspectionRecordIds.includes(String(row.inspectionRecord?.id || ""))
  ).filter((row, index) => {
    const issueIdStr = `ISS-${String(index + 1).padStart(4, "0")}`.toLowerCase();
    const primaryIssue = row.issueCheckpoints?.[0];
    const issueLabel = String(primaryIssue?.check_item || primaryIssue?.category || row.assetTag).toLowerCase();
    const detailsStr = `${String(row.assetTag).toLowerCase()} - ${issueLabel}`;
    const severityStr = String(row.highestSeverity || "").toLowerCase();
    const statusStr = "open";

    const s = issuesColSearch;
    if (s.issueId && !issueIdStr.includes(s.issueId.toLowerCase())) return false;
    if (s.details && !detailsStr.includes(s.details.toLowerCase())) return false;
    if (s.severity && !severityStr.includes(s.severity.toLowerCase())) return false;
    if (s.status && !statusStr.includes(s.status.toLowerCase())) return false;

    return true;
  });

  const completedInspectionRows = dateFilteredInspectionRows.filter((row) => {
    if (row.hasIssues) return false;
    const assetTagStr = String(row.assetTag || "").toLowerCase();
    const assetNameStr = String(row.name || "").toLowerCase();
    
    const s = completedColSearch;
    if (s.assetTag && !assetTagStr.includes(s.assetTag.toLowerCase())) return false;
    if (s.assetName && !assetNameStr.includes(s.assetName.toLowerCase())) return false;

    return true;
  });

  const [savingChecklist, setSavingChecklist] = useState(false);

  useEffect(() => {
    if (!filteredVehicleRows.length) {
      setSelectedVehicleNo("");
      return;
    }
    const existsInType = filteredVehicleRows.some((row) => row.checkKey === selectedVehicleNo);
    if (!existsInType) {
      setSelectedVehicleNo("");
    }
  }, [filteredVehicleRows, selectedVehicleNo]);

  useEffect(() => {
    if (!sampleRow) {
      setSelectedStation("");
      setCurrentMeterReading("");
      setSelectedInspector("");
      return;
    }
    setSelectedStation(sampleRow.station || "");
    setSelectedInspector((current) => current || "");
  }, [sampleRow?.checkKey]);

  useEffect(() => {
    if (!sampleRow?.checkKey) {
      return;
    }
    setCurrentMeterReading(previousMeterReadingForSelectedVehicle);
  }, [sampleRow?.checkKey, previousMeterReadingForSelectedVehicle]);

  useEffect(() => {
    if (!checkupTypeOptions.length) {
      setSelectedCheckupType("");
      return;
    }
    setSelectedCheckupType((current) => current && checkupTypeOptions.includes(current) ? current : checkupTypeOptions[0]);
  }, [checkupTypeOptions]);

  function handleChecklistRemarkChange(rowId, value) {
    setChecklistPreviewRows((current) => current.map((row) => (row.id === rowId ? { ...row, remarks: value } : row)));
  }

  function handleChecklistSeverityChange(rowId, value) {
    setChecklistPreviewRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              severity: value,
              status: row.action === "Yes" || (value && value !== "Low") ? "NOT OK" : "OK",
            }
          : row
      )
    );
  }

  function handleChecklistMaintenanceNeededChange(rowId, value) {
    setChecklistPreviewRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              action: value,
              status: value === "Yes" ? "NOT OK" : (row.severity && row.severity !== "Low" ? "NOT OK" : "OK"),
            }
          : row
      )
    );
  }

  async function handleSaveChecklistForOpenVehicle() {
    if (!sampleRow?.checkKey || !onSaveInspectionForVehicle) {
      return;
    }
    try {
      setSavingChecklist(true);
      await onSaveInspectionForVehicle(sampleRow, checklistPreviewRows, currentMeterReading);
      setSelectedVehicleType("");
      setSelectedVehicleNo("");
      setChecklistPreviewRows(checklistRowsFromSettings.length > 0 ? checklistRowsFromSettings : fallbackChecklistRows);
    } finally {
      setSavingChecklist(false);
    }
  }

  if (!canViewSchedule) {
    return (
      <section className="panel scheduleFilterPanel">
        <div className="emptyState">You do not have access to view Schedule workflow.</div>
      </section>
    );
  }

  return (
    <section className="dailyInspectionPage">
      <div className="dailyInspectionTopbar">
        <div>
          <h1>Routine Checkup Entry</h1>
          <p>Fleet Maintenance / Routine Checkup Entry</p>
        </div>
      </div>

      <div className="scheduleModeToggle" style={{ display: 'flex', gap: '10px', marginBottom: '20px', marginTop: '20px' }}>
        <button 
          className={`settingsToggleButton ${activeTab === 'entry' ? 'active' : 'inactive'}`} 
          style={{ 
            padding: '12px 24px', 
            borderRadius: '8px', 
            flex: 1, 
            fontSize: '1.05rem',
            fontWeight: 600,
            backgroundColor: activeTab === 'entry' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'entry' ? '#1d4ed8' : '#64748b',
            border: `1px solid ${activeTab === 'entry' ? '#bfdbfe' : '#e2e8f0'}`,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('entry')}
        >
          Routine Checkup Entry
        </button>
        <button 
          className={`settingsToggleButton ${activeTab === 'monthly_schedule' ? 'active' : 'inactive'}`} 
          style={{ 
            padding: '12px 24px', 
            borderRadius: '8px', 
            flex: 1, 
            fontSize: '1.05rem',
            fontWeight: 600,
            backgroundColor: activeTab === 'monthly_schedule' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'monthly_schedule' ? '#1d4ed8' : '#64748b',
            border: `1px solid ${activeTab === 'monthly_schedule' ? '#bfdbfe' : '#e2e8f0'}`,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('monthly_schedule')}
        >
          Schedule Monthly Inspection
        </button>
        <button 
          className={`settingsToggleButton ${activeTab === 'issues' ? 'active' : 'inactive'}`} 
          style={{ 
            padding: '12px 24px', 
            borderRadius: '8px', 
            flex: 1, 
            fontSize: '1.05rem',
            fontWeight: 600,
            backgroundColor: activeTab === 'issues' ? '#fef2f2' : '#ffffff',
            color: activeTab === 'issues' ? '#b91c1c' : '#64748b',
            border: `1px solid ${activeTab === 'issues' ? '#fecaca' : '#e2e8f0'}`,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('issues')}
        >
          Issues Generated
        </button>
        <button 
          className={`settingsToggleButton ${activeTab === 'completed' ? 'active' : 'inactive'}`} 
          style={{ 
            padding: '12px 24px', 
            borderRadius: '8px', 
            flex: 1, 
            fontSize: '1.05rem',
            fontWeight: 600,
            backgroundColor: activeTab === 'completed' ? '#f0fdf4' : '#ffffff',
            color: activeTab === 'completed' ? '#15803d' : '#64748b',
            border: `1px solid ${activeTab === 'completed' ? '#bbf7d0' : '#e2e8f0'}`,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('completed')}
        >
          Completed Inspections
        </button>
      </div>

      <section className="dailyInspectionBoardV2" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeTab === 'monthly_schedule' && monthlyMaintenanceProps && (
          <MonthlyMaintenanceWorkspace {...monthlyMaintenanceProps} isEmbedded={true} />
        )}
        {activeTab === 'monthly_schedule' && !monthlyMaintenanceProps && (
           <div className="emptyState" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
             Monthly maintenance planning is available only for superuser and creator roles.
           </div>
        )}
        {activeTab === 'entry' && (
          <>
            <section className="panel dailyInspectionInfoPanel">
              <h2>Checkup Information</h2>
              <div className="dailyInspectionInfoGrid">
                <label className="dailyInspectionHiddenField"><span>Checkup No.</span><input value={`CHK-${String(todayDate).replaceAll("-", "")}`} readOnly /></label>
                <label className="dailyInspectionHiddenField"><span>Checkup Date</span><input value={todayDate} readOnly /></label>
                <label>
                  <span>Vehicle Type</span>
                  <select
                    value={selectedVehicleType}
                    onChange={(event) => {
                      setSelectedVehicleType(event.target.value);
                    }}
                  >
                    <option value="">Select type</option>
                    {vehicleTypeOptions.map((type) => (
                      <option key={`info-${type}`} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Vehicle Title</span>
                  <select
                    value={selectedVehicleNo}
                    onChange={(event) => {
                      setSelectedVehicleNo(event.target.value);
                    }}
                  >
                    <option value="">Select vehicle title</option>
                    {filteredVehicleRows.map((row) => (
                      <option key={`vehicle-${row.checkKey}`} value={row.checkKey}>
                        {row.name && row.name !== "-" ? row.name : row.assetTag}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Department / Station</span>
                  <select value={selectedStation} onChange={(event) => setSelectedStation(event.target.value)}>
                    <option value="">Select station</option>
                    {stationOptions.map((station) => (
                      <option key={`station-${station}`} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Current Meter Reading (KM)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={currentMeterReading}
                    onChange={(event) => setCurrentMeterReading(event.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter meter reading"
                  />
                </label>
                <label>
                  <span>Checkup Type</span>
                  <select value={selectedCheckupType} onChange={(event) => setSelectedCheckupType(event.target.value)}>
                    <option value="">Select checkup type</option>
                    {checkupTypeOptions.map((typeName) => (
                      <option key={`checkup-type-${typeName}`} value={typeName}>
                        {typeName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Inspected By</span>
                  <select value={selectedInspector} onChange={(event) => setSelectedInspector(event.target.value)}>
                    <option value="">Select inspector</option>
                    {fleetInspectorOptions.map((memberName) => (
                      <option key={`inspector-${memberName}`} value={memberName}>
                        {memberName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div className="dailyInspectionMain" style={{ borderRight: 'none' }}>
                <div className="dailyInspectionStatGrid" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <article><span>Total Items</span><strong>{checklistPreviewRows.length}</strong></article>
                  <article><span>OK</span><strong className="ok">{checklistOkCount}</strong></article>
                  <article><span>Not OK</span><strong className="notOk">{checklistNotOkCount}</strong></article>
                  <article><span>Observation</span><strong className="obs">{checklistObservationCount}</strong></article>
                </div>

                <div className="reportPreviewTable dailyInspectionChecklistTable dailyInspectionChecklistWide" style={{ margin: '0' }}>
                  <div className="reportPreviewHeader" style={{ borderTop: 'none' }}>
                    <span>#</span><span>Category</span><span>Check Item</span><span>Standard</span><span>Status</span><span>Severity</span><span>Remarks</span><span>Maintenance Needed</span>
                  </div>
                  {checklistPreviewRows.map((row, index) => (
                    <div key={`${row.id}-${index}`} className="reportPreviewRow">
                      <span>{index + 1}</span>
                      <span>{row.category}</span>
                      <span>{row.checkItem}</span>
                      <span>{row.standard}</span>
                      <span className={`riskPill ${row.status === "OK" ? "low" : "medium"}`}>{row.status}</span>
                      <span>
                        <select
                          className={`dailyInspectionSelect dailyInspectionSeveritySelect ${String(row.severity || "").toLowerCase()}`}
                          value={row.severity}
                          onChange={(event) => handleChecklistSeverityChange(row.id, event.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </span>
                      <span>
                        <input
                          className="dailyInspectionRemarkInput"
                          type="text"
                          value={row.remarks}
                          onChange={(event) => handleChecklistRemarkChange(row.id, event.target.value)}
                          placeholder="Enter remarks"
                        />
                      </span>
                      <span className="dailyInspectionActionCell">
                        <select
                          className="dailyInspectionSelect"
                          value={row.action || "No"}
                          onChange={(event) => handleChecklistMaintenanceNeededChange(row.id, event.target.value)}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="dailyInspectionFooterNote" style={{ padding: '16px 24px' }}>Showing 1 to {checklistPreviewRows.length} of {checklistPreviewRows.length} items</div>
                <div className="dailyInspectionChecklistActions" style={{ padding: '0 24px 24px 24px' }}>
                  <button
                    className="primaryAction"
                    type="button"
                    onClick={handleSaveChecklistForOpenVehicle}
                    disabled={!sampleRow?.checkKey || savingChecklist}
                  >
                    {savingChecklist ? "Saving..." : "Save For This Vehicle"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {(activeTab === 'issues' || activeTab === 'completed') && (
          <section className="panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>Inspection Date Filter</h3>
            <div className="dailyInspectionSideDateFilter" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: '24px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>From</span>
                <input style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="date" value={inspectionDateFrom} onChange={(event) => setInspectionDateFrom(event.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>To</span>
                <input style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px' }} type="date" value={inspectionDateTo} onChange={(event) => setInspectionDateTo(event.target.value)} />
              </label>
              <button
                type="button"
                className="ghostButton"
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 600 }}
                onClick={() => {
                  setInspectionDateFrom("");
                  setInspectionDateTo("");
                }}
              >
                Clear Filter
              </button>
            </div>
            
            {activeTab === 'issues' && (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>Issues Generated</h3>
                <div className="nativeTableWrap" style={{ marginTop: '16px' }}>
                  <table className="inventoryTable" style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Issue ID</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Details</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Severity</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                      </tr>
                      <tr>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input type="text" placeholder="Search ID..." value={issuesColSearch.issueId} onChange={e => setIssuesColSearch({...issuesColSearch, issueId: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                        </th>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input type="text" placeholder="Search details..." value={issuesColSearch.details} onChange={e => setIssuesColSearch({...issuesColSearch, details: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                        </th>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input type="text" placeholder="Search severity..." value={issuesColSearch.severity} onChange={e => setIssuesColSearch({...issuesColSearch, severity: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                        </th>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input type="text" placeholder="Search status..." value={issuesColSearch.status} onChange={e => setIssuesColSearch({...issuesColSearch, status: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleIssueInspectionRows.length === 0 ? (
                        <tr><td colSpan="4" className="emptyState" style={{ padding: '24px', textAlign: 'center' }}>No issues found in saved inspections.</td></tr>
                      ) : (
                        visibleIssueInspectionRows.map((row, index) => {
                          const primaryIssue = row.issueCheckpoints[0];
                          const issueLabel = primaryIssue?.check_item || primaryIssue?.category || row.assetTag;
                          return (
                            <tr key={`${row.id}-issue`} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => onOpenInspection(row)}>
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>ISS-{String(index + 1).padStart(4, "0")}</td>
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>{row.assetTag} - {issueLabel}</td>
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                <span className={["dailyInspectionIssueSeverity", row.highestSeverity === "High" ? "high" : row.highestSeverity === "Medium" ? "medium" : "low"].join(" ")}>{row.highestSeverity}</span>
                              </td>
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                <span className="dailyInspectionIssueOpen">Open</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'completed' && (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>Completed Inspections</h3>
                <div className="nativeTableWrap" style={{ marginTop: '16px' }}>
                  <table className="inventoryTable" style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '60px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Asset Tag</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Asset Name</th>
                      </tr>
                      <tr>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input type="text" placeholder="Search asset tag..." value={completedColSearch.assetTag} onChange={e => setCompletedColSearch({...completedColSearch, assetTag: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                        </th>
                        <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <input type="text" placeholder="Search asset name..." value={completedColSearch.assetName} onChange={e => setCompletedColSearch({...completedColSearch, assetName: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedInspectionRows.length === 0 ? (
                        <tr><td colSpan="3" className="emptyState" style={{ padding: '24px', textAlign: 'center' }}>No completed inspections without issues yet.</td></tr>
                      ) : (
                        completedInspectionRows.map((row) => (
                          <tr key={`${row.id}-completed`} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => onOpenInspection(row)}>
                            <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                              <ShieldCheck size={18} color="#10b981" />
                            </td>
                            <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{row.assetTag}</td>
                            <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>{row.name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </section>
    </section>
  );
}
