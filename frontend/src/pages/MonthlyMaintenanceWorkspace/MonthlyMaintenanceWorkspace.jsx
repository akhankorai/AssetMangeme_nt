import { useState, useEffect, useMemo, useRef } from "react";
import { CalendarDays, ChevronDown, FileBarChart2, Search } from "lucide-react";
import { formatDate, formatCurrency, formatQuantity, formatPersonDisplayName } from "../../utils/formatting";
import { todayInputValue, dateToInputValue, formatCompactDate, monthLabel, monthRange } from "../../utils/dateHelpers";

export default function MonthlyMaintenanceWorkspace({
  activeModuleKey,
  canCreateTask,
  canViewSchedule,
  monthlyMaintenanceMonth,
  monthlyMaintenanceRows,
  onCreateTasks,
  onOpenReports,
  onOpenSchedule,
  onPlanMonthChange,
  onBulkInventoryDemandChange,
  onCreateBulkMaintenanceSchedule,
  purchaseSummary,
  saving,
  serviceTypeOptions,
  itemOptions,
  teamMembers,
  isEmbedded,
}) {
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkDatePlans, setBulkDatePlans] = useState({});
  const [selectedVehicles, setSelectedVehicles] = useState({});
  const [selectedServiceTypes, setSelectedServiceTypes] = useState({});
  const [selectedInventoryItems, setSelectedInventoryItems] = useState({});
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [serviceTypeSearch, setServiceTypeSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState("all");
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false);
  const [serviceSelectorOpen, setServiceSelectorOpen] = useState(false);
  const [inventorySelectorOpen, setInventorySelectorOpen] = useState(false);
  const [assigneeSelectorOpenByDate, setAssigneeSelectorOpenByDate] = useState({});
  const [assigneeSearchByDate, setAssigneeSearchByDate] = useState({});
  const [vehicleSelectorOpenByDate, setVehicleSelectorOpenByDate] = useState({});
  const [serviceSelectorOpenByDate, setServiceSelectorOpenByDate] = useState({});
  const [inventorySelectorOpenByDate, setInventorySelectorOpenByDate] = useState({});
  const [vehicleSearchByDate, setVehicleSearchByDate] = useState({});
  const vehicleSelectorRefsByDate = useRef({});
  const vehicleSelectorRef = useRef(null);
  const serviceSelectorRef = useRef(null);
  const inventorySelectorRef = useRef(null);
  const assigneeSelectorRefs = useRef({});
  const todayDateKey = todayInputValue();

  const assigneeOptions = useMemo(
    () =>
      (teamMembers || [])
        .filter((member) => member.is_active !== false)
        .map((member) => ({
          value: member.name,
          label: `${formatPersonDisplayName(member.name)}${member.serial_number ? ` (${member.serial_number})` : ""}`,
        })),
    [teamMembers],
  );

  function getAssetPlanKey(asset) {
    return asset?.asset_tag || String(asset?.id || "");
  }

  const vehiclesByCategory = useMemo(() => {
    const grouped = monthlyMaintenanceRows.reduce((acc, row) => {
      const category = row.asset?.category_name || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(row.asset);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, vehicles]) => ({
        category,
        vehicles: vehicles
          .slice()
          .sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || ""))),
      }));
  }, [monthlyMaintenanceRows]);

  const normalizedServiceTypeOptions = useMemo(
    () =>
      serviceTypeOptions
        .map((serviceType) =>
          typeof serviceType === "string"
            ? serviceType
            : String(serviceType?.value ?? serviceType?.label ?? "").trim(),
        )
        .filter(Boolean),
    [serviceTypeOptions],
  );

  useEffect(() => {
    setSelectedVehicles((current) => {
      const next = {};
      monthlyMaintenanceRows.forEach(({ asset }) => {
        const key = getAssetPlanKey(asset);
        if (key) {
          next[key] = Object.prototype.hasOwnProperty.call(current, key) ? Boolean(current[key]) : true;
        }
      });
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) {
        return current;
      }
      return next;
    });
  }, [monthlyMaintenanceRows]);

  useEffect(() => {
    setSelectedServiceTypes((current) => {
      const next = {};
      normalizedServiceTypeOptions.forEach((serviceType) => {
        next[serviceType] = Object.prototype.hasOwnProperty.call(current, serviceType) ? Boolean(current[serviceType]) : true;
      });
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) {
        return current;
      }
      return next;
    });
  }, [normalizedServiceTypeOptions]);

  useEffect(() => {
    setSelectedInventoryItems((current) => {
      const next = {};
      itemOptions.forEach((item) => {
        const key = String(item.id ?? item.name ?? "");
        if (key) {
          next[key] = Object.prototype.hasOwnProperty.call(current, key) ? Boolean(current[key]) : false;
        }
      });
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) {
        return current;
      }
      return next;
    });
  }, [itemOptions]);

  const selectedVehiclesByCategory = useMemo(
    () =>
      vehiclesByCategory
        .map((group) => ({
          ...group,
          vehicles: group.vehicles.filter((vehicle) => Boolean(selectedVehicles[getAssetPlanKey(vehicle)])),
        }))
        .filter((group) => group.vehicles.length > 0),
    [vehiclesByCategory, selectedVehicles],
  );

  const filteredVehiclesByCategory = useMemo(() => {
    const term = vehicleSearch.trim().toLowerCase();
    const categoryFiltered =
      vehicleCategoryFilter === "all"
        ? vehiclesByCategory
        : vehiclesByCategory.filter((group) => group.category === vehicleCategoryFilter);
    if (!term) {
      return categoryFiltered;
    }
    return categoryFiltered
      .map((group) => ({
        ...group,
        vehicles: group.vehicles.filter((vehicle) =>
          `${vehicle.asset_tag || ""} ${vehicle.name || ""} ${group.category || ""}`.toLowerCase().includes(term),
        ),
      }))
      .filter((group) => group.vehicles.length > 0);
  }, [vehicleCategoryFilter, vehicleSearch, vehiclesByCategory]);

  const vehicleCategoryOptions = useMemo(
    () => vehiclesByCategory.map((group) => group.category).filter(Boolean),
    [vehiclesByCategory],
  );

  const selectedServiceTypeOptions = useMemo(
    () => normalizedServiceTypeOptions.filter((serviceType) => Boolean(selectedServiceTypes[serviceType])),
    [normalizedServiceTypeOptions, selectedServiceTypes],
  );

  const filteredServiceTypeOptions = useMemo(() => {
    const term = serviceTypeSearch.trim().toLowerCase();
    if (!term) {
      return normalizedServiceTypeOptions;
    }
    return normalizedServiceTypeOptions.filter((serviceType) => serviceType.toLowerCase().includes(term));
  }, [normalizedServiceTypeOptions, serviceTypeSearch]);

  const selectedInventoryOptions = useMemo(
    () =>
      itemOptions.filter((item) => {
        const key = String(item.id ?? item.name ?? "");
        return Boolean(selectedInventoryItems[key]);
      }),
    [itemOptions, selectedInventoryItems],
  );

  const filteredInventoryOptions = useMemo(() => {
    const term = inventorySearch.trim().toLowerCase();
    if (!term) {
      return itemOptions;
    }
    return itemOptions.filter((item) =>
      `${item.name || ""} ${item.inventory_quantity || ""}`.toLowerCase().includes(term),
    );
  }, [inventorySearch, itemOptions]);

  function handleInventoryMultiSelectChange(event) {
    const selectedKeys = new Set(Array.from(event.target.selectedOptions).map((option) => option.value));
    setSelectedInventoryItems(() => {
      const next = {};
      itemOptions.forEach((item) => {
        const key = String(item.id ?? item.name ?? "");
        if (key) {
          next[key] = selectedKeys.has(key);
        }
      });
      return next;
    });
  }

  useEffect(() => {
    if (!inventorySelectorOpen && !vehicleSelectorOpen && !serviceSelectorOpen) {
      return;
    }
    function handleOutsideClick(event) {
      if (vehicleSelectorRef.current && !vehicleSelectorRef.current.contains(event.target)) {
        setVehicleSelectorOpen(false);
      }
      if (serviceSelectorRef.current && !serviceSelectorRef.current.contains(event.target)) {
        setServiceSelectorOpen(false);
      }
      if (inventorySelectorRef.current && !inventorySelectorRef.current.contains(event.target)) {
        setInventorySelectorOpen(false);
      }
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [inventorySelectorOpen, serviceSelectorOpen, vehicleSelectorOpen]);

  useEffect(() => {
    function handleOutsideClick(event) {
      const entries = Object.entries(assigneeSelectorRefs.current || {});
      entries.forEach(([dateKey, element]) => {
        if (element && !element.contains(event.target)) {
          setAssigneeSelectorOpenByDate((current) => ({ ...current, [dateKey]: false }));
        }
      });
      const vehicleEntries = Object.entries(vehicleSelectorRefsByDate.current || {});
      vehicleEntries.forEach(([dateKey, element]) => {
        if (element && !element.contains(event.target)) {
          setVehicleSelectorOpenByDate((current) => ({ ...current, [dateKey]: false }));
        }
      });
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const bulkDateOptions = useMemo(() => {
    if (!bulkStartDate || !bulkEndDate || bulkStartDate > bulkEndDate || bulkStartDate < todayDateKey) {
      return [];
    }
    const days = [];
    const cursor = new Date(`${bulkStartDate}T00:00:00`);
    const end = new Date(`${bulkEndDate}T00:00:00`);
    while (cursor <= end) {
      days.push(dateToInputValue(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [bulkEndDate, bulkStartDate, todayDateKey]);

  const aggregatedBulkInventoryDemand = useMemo(() => {
    const demandMap = new Map();
    Object.entries(bulkDatePlans || {}).forEach(([dateKey, datePlan]) => {
      const inventories = datePlan?.inventories || {};
      Object.entries(inventories).forEach(([itemId, quantityValue]) => {
        const quantity = Math.max(0, Number(quantityValue) || 0);
        if (!itemId || quantity <= 0) {
          return;
        }
        const key = String(itemId);
        const existing = demandMap.get(key) || { itemId: key, itemName: "", quantity: 0, requiredBy: "" };
        const matchedItem = itemOptions.find((item) => String(item.id) === key);
        existing.itemName = existing.itemName || matchedItem?.name || "";
        existing.quantity += quantity;
        if (dateKey && (!existing.requiredBy || dateKey < existing.requiredBy)) {
          existing.requiredBy = dateKey;
        }
        demandMap.set(key, existing);
      });
    });

    return [...demandMap.values()];
  }, [bulkDatePlans, itemOptions]);

  useEffect(() => {
    if (typeof onBulkInventoryDemandChange === "function") {
      onBulkInventoryDemandChange(aggregatedBulkInventoryDemand);
    }
  }, [aggregatedBulkInventoryDemand, onBulkInventoryDemandChange]);

  useEffect(
    () => () => {
      if (typeof onBulkInventoryDemandChange === "function") {
        onBulkInventoryDemandChange([]);
      }
    },
    [onBulkInventoryDemandChange],
  );

  useEffect(() => {
    const monthWindow = monthRange(monthlyMaintenanceMonth);
    const monthStartOrToday = monthWindow.start < todayDateKey ? todayDateKey : monthWindow.start;
    const monthEndOrToday = monthWindow.end < todayDateKey ? todayDateKey : monthWindow.end;
    const nextStartDate = bulkStartDate || monthStartOrToday;
    const nextEndDate = bulkEndDate || monthEndOrToday;
    if (!bulkStartDate) {
      setBulkStartDate(nextStartDate);
    }
    if (!bulkEndDate) {
      setBulkEndDate(nextEndDate);
    }
  }, [bulkEndDate, bulkStartDate, monthlyMaintenanceMonth, todayDateKey]);

  useEffect(() => {
    if (bulkDateOptions.length === 0) {
      return;
    }
    setBulkDatePlans((current) => {
      const next = { ...current };
      const keysToInit = isEmbedded ? ["master"] : bulkDateOptions;
      for (const dateKey of keysToInit) {
        const currentPlan = next[dateKey] || {};
        const nextVehicles = { ...(currentPlan.vehicles || {}) };
        monthlyMaintenanceRows.forEach(({ asset }) => {
          const vehicleKey = getAssetPlanKey(asset);
          if (!vehicleKey) {
            return;
          }
          if (typeof nextVehicles[vehicleKey] !== "boolean") {
            nextVehicles[vehicleKey] = false;
          }
        });
        next[dateKey] = {
          vehicles: nextVehicles,
          services: { ...(currentPlan.services || {}) },
          inventories: { ...(currentPlan.inventories || {}) },
          assignees: Array.isArray(currentPlan.assignees)
            ? currentPlan.assignees.map((value) => String(value || "").trim()).filter(Boolean)
            : String(currentPlan.assignee || "").trim()
              ? [String(currentPlan.assignee || "").trim()]
              : [],
        };
      }
      return next;
    });
  }, [bulkDateOptions, monthlyMaintenanceRows, isEmbedded]);

  useEffect(() => {
    setBulkDatePlans((current) => {
      const allowedVehicleKeys = new Set(
        monthlyMaintenanceRows
          .map(({ asset }) => getAssetPlanKey(asset))
          .filter((key) => key && selectedVehicles[key]),
      );
      const allowedServiceTypes = new Set(selectedServiceTypeOptions);
      const next = {};
      const keysToProcess = isEmbedded ? ["master"] : Object.keys(current || {});
      keysToProcess.forEach((dateKey) => {
        const datePlan = current[dateKey] || {};
        const vehicles = Object.fromEntries(
          Object.entries(datePlan?.vehicles || {}).filter(([key]) => allowedVehicleKeys.has(key)),
        );
        const services = Object.fromEntries(
          Object.entries(datePlan?.services || {}).filter(([key]) => allowedServiceTypes.has(key)),
        );
        const inventories = datePlan?.inventories || {};
        const normalizedAssignees = Array.isArray(datePlan?.assignees)
          ? datePlan.assignees.map((value) => String(value || "").trim()).filter(Boolean)
          : String(datePlan?.assignee || "").trim()
            ? [String(datePlan.assignee || "").trim()]
            : [];
        next[dateKey] = { vehicles, services, inventories, assignees: normalizedAssignees };
      });
      return next;
    });
  }, [monthlyMaintenanceRows, selectedVehicles, selectedServiceTypeOptions, isEmbedded]);

  if (!canViewSchedule) {
    return (
      <section className="scheduleWorkspace">
        <section className="panel scheduleFilterPanel">
          <div className="emptyState">You do not have access to view monthly maintenance planning.</div>
        </section>
      </section>
    );
  }

  if (activeModuleKey !== "vehicle-assets") {
    return (
      <section className="scheduleWorkspace">
        <section className="panel scheduleFilterPanel">
          <div className="emptyState">
            Monthly maintenance planning is currently available only in the Vehicle Assets module.
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="scheduleWorkspace monthlyScheduleRedesign">
      {!isEmbedded && (
        <div className="scheduleHeader monthlyScheduleHero">
          <div>
            {/* <span className="eyebrow">Monthly Duty Roster</span> */}
            <h1>Schedule Monthly Maintenance</h1>
          </div>
          <div className="monthlyMaintenanceToolbar" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="scheduleHeaderActions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {canViewSchedule && (
                <button className="scheduleGhostButton" type="button" onClick={onOpenSchedule}>
                  <CalendarDays size={15} />
                  Open Schedule
                </button>
              )}
              <button className="scheduleGhostButton" type="button" onClick={onOpenReports}>
                <FileBarChart2 size={14} />
                Open Reports
              </button>
              {canCreateTask && (
                <button
                  className="schedulePrimaryButton"
                  type="button"
                  onClick={onCreateTasks}
                  disabled={!canCreateTask || saving || purchaseSummary.selectedCount === 0}
                >
                  {saving ? "Scheduling..." : "Create Monthly Tasks"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isEmbedded && (
        <section className="panel monthlyMaintenancePanel">
          <div className="monthlyMaintenanceReferenceGrid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <article className="monthlyMaintenanceReferenceCard">
              <div className="monthlyMaintenanceReferenceHeader">
                <span>Category Filter</span>
                <strong>{vehicleCategoryFilter === "all" ? "All" : "1"}</strong>
              </div>
              <label className="monthlyMaintenanceReferenceSearch" style={{ margin: 0 }}>
                <select
                  className="monthlyMaintenanceReferenceSelect"
                  value={vehicleCategoryFilter}
                  onChange={(event) => setVehicleCategoryFilter(event.target.value)}
                >
                  <option value="all">All Categories</option>
                  {vehicleCategoryOptions?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
            </article>

            <article className={`monthlyMaintenanceReferenceCard ${vehicleSelectorOpen ? "monthlyMaintenanceReferenceCardOpen" : ""}`}>
              <div className="monthlyMaintenanceReferenceHeader">
                <span>Vehicles Selected</span>
                <strong>{selectedVehiclesByCategory.reduce((sum, group) => sum + group.vehicles.length, 0)}</strong>
              </div>
              <div className="monthlyMaintenanceMultiSelect monthlyMaintenanceMultiSelectLarge" ref={vehicleSelectorRef}>
                {vehiclesByCategory.length === 0 ? (
                  <p className="monthlyMaintenanceReferenceEmpty" style={{ flex: 1 }}>No vehicles.</p>
                ) : (
                  <>
                    <button
                      className="monthlyMaintenanceMultiSelectTrigger"
                      type="button"
                      onClick={() => setVehicleSelectorOpen((current) => !current)}
                      aria-haspopup="listbox"
                      aria-expanded={vehicleSelectorOpen}
                    >
                      <span>
                        {selectedVehiclesByCategory.reduce((sum, group) => sum + group.vehicles.length, 0)} vehicle
                        {selectedVehiclesByCategory.reduce((sum, group) => sum + group.vehicles.length, 0) === 1 ? "" : "s"} selected
                      </span>
                      <ChevronDown size={14} />
                    </button>
                    {vehicleSelectorOpen ? (
                      <div className="monthlyMaintenanceMultiSelectMenu" role="listbox" aria-label="Vehicle items" aria-multiselectable>
                        <label className="monthlyMaintenanceReferenceSearch monthlyMaintenanceInDropdownSearch">
                          <input
                            type="search"
                            value={vehicleSearch}
                            onChange={(event) => setVehicleSearch(event.target.value)}
                            placeholder="Search vehicles..."
                          />
                        </label>
                        <div className="monthlyMaintenanceDropdownListScroll">
                          <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                              <input
                                type="checkbox"
                                checked={filteredVehiclesByCategory.length > 0 && filteredVehiclesByCategory.flatMap(g => g.vehicles).every(v => selectedVehicles[getAssetPlanKey(v)])}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedVehicles(current => {
                                    const next = { ...current };
                                    filteredVehiclesByCategory.flatMap(g => g.vehicles).forEach(v => next[getAssetPlanKey(v)] = checked);
                                    return next;
                                  });
                                }}
                              />
                              <span>Select All Filtered</span>
                            </label>
                          </div>
                          {filteredVehiclesByCategory.map((group) => (
                            <div key={group.category} className="monthlyMaintenanceReferenceCategoryBlock">
                              <h3>
                                {group.category} ({group.vehicles.length})
                              </h3>
                              <ul>
                                {group.vehicles.map((vehicle) => (
                                  <li key={vehicle.id || vehicle.asset_tag || vehicle.name}>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedVehicles[getAssetPlanKey(vehicle)])}
                                      onChange={(event) =>
                                        setSelectedVehicles((current) => ({
                                          ...current,
                                          [getAssetPlanKey(vehicle)]: event.target.checked,
                                        }))
                                      }
                                    />
                                    <span>{vehicle.asset_tag ? `${vehicle.asset_tag} - ${vehicle.name}` : vehicle.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {filteredVehiclesByCategory.length === 0 ? (
                            <p className="monthlyMaintenanceReferenceEmpty">No matching vehicles.</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </article>

            <article className={`monthlyMaintenanceReferenceCard ${serviceSelectorOpen ? "monthlyMaintenanceReferenceCardOpen" : ""}`}>
              <div className="monthlyMaintenanceReferenceHeader">
                <span>Service Types</span>
                <strong>{selectedServiceTypeOptions.length}</strong>
              </div>
              {normalizedServiceTypeOptions.length === 0 ? (
                <p className="monthlyMaintenanceReferenceEmpty">No service types configured yet.</p>
              ) : (
                <div className="monthlyMaintenanceMultiSelect monthlyMaintenanceMultiSelectLarge" ref={serviceSelectorRef}>
                  <button
                    className="monthlyMaintenanceMultiSelectTrigger"
                    type="button"
                    onClick={() => setServiceSelectorOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={serviceSelectorOpen}
                  >
                    <span>
                      {selectedServiceTypeOptions.length} service
                      {selectedServiceTypeOptions.length === 1 ? "" : "s"} selected
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {serviceSelectorOpen ? (
                    <div className="monthlyMaintenanceMultiSelectMenu" role="listbox" aria-label="Service types" aria-multiselectable>
                      <label className="monthlyMaintenanceReferenceSearch monthlyMaintenanceInDropdownSearch">
                        <input
                          type="search"
                          value={serviceTypeSearch}
                          onChange={(event) => setServiceTypeSearch(event.target.value)}
                          placeholder="Search services..."
                        />
                      </label>
                      <div className="monthlyMaintenanceDropdownListScroll">
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>
                          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={filteredServiceTypeOptions.length > 0 && filteredServiceTypeOptions.every(s => selectedServiceTypes[s])}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedServiceTypes(current => {
                                  const next = { ...current };
                                  filteredServiceTypeOptions.forEach(s => next[s] = checked);
                                  return next;
                                });
                              }}
                            />
                            <span>Select All Filtered</span>
                          </label>
                        </div>
                        <ul className="monthlyMaintenanceReferenceChecklist">
                          {filteredServiceTypeOptions.map((serviceType) => (
                            <li key={serviceType}>
                              <input
                                type="checkbox"
                                checked={Boolean(selectedServiceTypes[serviceType])}
                                onChange={(event) =>
                                  setSelectedServiceTypes((current) => ({
                                    ...current,
                                    [serviceType]: event.target.checked,
                                  }))
                                }
                              />
                              <span>{serviceType}</span>
                            </li>
                          ))}
                        </ul>
                        {filteredServiceTypeOptions.length === 0 ? (
                          <p className="monthlyMaintenanceReferenceEmpty">No matching services.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </article>

            <article className={`monthlyMaintenanceReferenceCard ${inventorySelectorOpen ? "monthlyMaintenanceReferenceCardOpen" : ""}`}>
              <div className="monthlyMaintenanceReferenceHeader">
                <span>Inventory Available</span>
                <strong>
                  {selectedInventoryOptions.length}/{itemOptions.length}
                </strong>
              </div>
              {itemOptions.length === 0 ? (
                <p className="monthlyMaintenanceReferenceEmpty">No inventory items configured yet.</p>
              ) : (
                <div className="monthlyMaintenanceMultiSelect" ref={inventorySelectorRef}>
                  <button
                    className="monthlyMaintenanceMultiSelectTrigger"
                    type="button"
                    onClick={() => setInventorySelectorOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={inventorySelectorOpen}
                  >
                    <span>
                      {selectedInventoryOptions.length === 0
                        ? "Select inventory items"
                        : `${selectedInventoryOptions.length} item${selectedInventoryOptions.length === 1 ? "" : "s"} selected`}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {inventorySelectorOpen ? (
                    <div className="monthlyMaintenanceMultiSelectMenu" role="listbox" aria-label="Inventory items" aria-multiselectable>
                      <label className="monthlyMaintenanceReferenceSearch monthlyMaintenanceInDropdownSearch">
                        <input
                          type="search"
                          value={inventorySearch}
                          onChange={(event) => setInventorySearch(event.target.value)}
                          placeholder="Search inventory..."
                        />
                      </label>
                      <div className="monthlyMaintenanceDropdownListScroll">
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>
                          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={filteredInventoryOptions.length > 0 && filteredInventoryOptions.every(i => selectedInventoryItems[String(i.id ?? i.name ?? "")])}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedInventoryItems(current => {
                                  const next = { ...current };
                                  filteredInventoryOptions.forEach(i => next[String(i.id ?? i.name ?? "")] = checked);
                                  return next;
                                });
                              }}
                            />
                            <span>Select All Filtered</span>
                          </label>
                        </div>
                        {filteredInventoryOptions.map((item) => {
                          const key = String(item.id ?? item.name ?? "");
                          return (
                            <label key={key} className="monthlyMaintenanceMultiSelectOption">
                              <input
                                type="checkbox"
                                checked={Boolean(selectedInventoryItems[key])}
                                onChange={(event) =>
                                  setSelectedInventoryItems((current) => ({
                                    ...current,
                                    [key]: event.target.checked,
                                  }))
                                }
                              />
                              <span>
                                {item.name} ({formatQuantity(item.inventory_quantity)} in stock)
                              </span>
                            </label>
                          );
                        })}
                        {filteredInventoryOptions.length === 0 ? (
                          <p className="monthlyMaintenanceReferenceEmpty">No matching inventory items.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          </div>
        </section>
      )}

      <section className="monthlyMaintenanceBoard">

        {canCreateTask && (
          <div className="panelHeader monthlyPlannerHeader">
            <div>
              <h2>Create Maintenance Schedule</h2>
            </div>
            <div className="monthlyPlannerDateRange">
              {/* <span>Date Range</span> */}
              <div className="monthlyPlannerDateRangeInputs">
                <label className="monthlyPlannerDateField">
                  <small>From</small>
                  <input
                    type="date"
                    style={{ marginRight: '20px' }}
                    value={bulkStartDate}
                    min={todayDateKey}
                    onChange={(event) => {
                      const nextFrom = event.target.value;
                      setBulkStartDate(nextFrom);
                      if (bulkEndDate && nextFrom && nextFrom > bulkEndDate) {
                        setBulkEndDate(nextFrom);
                      }
                    }}
                  />
                </label>
                <label className="monthlyPlannerDateField">
                  <small>To</small>
                  <input
                    type="date"
                    value={bulkEndDate}
                    min={bulkStartDate || todayDateKey}
                    onChange={(event) => setBulkEndDate(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {canCreateTask && (
          <section className="monthlyMaintenanceInlinePlanner">
            {bulkDateOptions.length === 0 ? (
              <div className="scheduleEmpty">Select a valid date range to build the date-wise maintenance planner.</div>
            ) : (
              <div className={isEmbedded ? "" : "monthlyMaintenanceDateBoardScroller"}>
                <div className={isEmbedded ? "" : "monthlyMaintenanceDateBoardTrack"}>
                  {(isEmbedded ? ["master"] : bulkDateOptions).map((dateKey) => {
                    const datePlan = bulkDatePlans[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] };
                    const assigneeSearch = String(assigneeSearchByDate[dateKey] || "").trim().toLowerCase();
                    const filteredAssigneeOptions = assigneeOptions.filter((option) =>
                      option.label.toLowerCase().includes(assigneeSearch) || option.value.toLowerCase().includes(assigneeSearch),
                    );

                    return (
                      <article
                        key={dateKey}
                        className={`monthlyMaintenanceDateBoardCard ${assigneeSelectorOpenByDate[dateKey] ? "monthlyMaintenanceDateBoardCardAssigneeOpen" : ""} ${vehicleSelectorOpenByDate[dateKey] ? "monthlyMaintenanceDateBoardCardVehicleOpen" : ""}`}
                        style={isEmbedded ? { width: '100%', maxWidth: 'none', margin: '0' } : undefined}
                      >
                        <div className="monthlyMaintenanceDateBoardHeader" style={isEmbedded ? { justifyContent: 'flex-start' } : undefined}>
                          {/* <span>Date Plan</span> */}
                          <strong>{isEmbedded ? "Master Schedule Plan" : formatCompactDate(dateKey)}</strong>
                        </div>
                        {isEmbedded && (
                          <div style={{ textAlign: 'left', marginBottom: '20px', padding: '0 20px', color: '#64748b', fontSize: '0.85rem' }}>
                            {/* Settings applied here will be scheduled for all days in the selected date range. */}
                          </div>
                        )}
                        <div className="monthlyMaintenanceBulkGrid">
                          <section className="monthlyMaintenanceBulkBlock">
                            <h3 style={isEmbedded ? { fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', textTransform: 'none', letterSpacing: 'normal', margin: '0 0 4px 0' } : undefined}>Vehicles</h3>
                            <div style={{ position: 'relative', marginTop: '10px' }}>
                              <button
                                className="monthlyMaintenanceMultiSelectTrigger"
                                type="button"
                                onClick={() => {
                                  setVehicleSelectorOpenByDate((current) => ({
                                    ...current,
                                    [dateKey]: !current[dateKey],
                                  }));
                                  setServiceSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                  setInventorySelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                  setAssigneeSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                }}
                              >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px', flex: 1, textAlign: 'left', minWidth: 0 }}>
                                  {(() => {
                                    const selectedVehicleKeys = Object.keys(datePlan.vehicles || {}).filter(k => (datePlan.vehicles || {})[k] !== false);
                                    if (selectedVehicleKeys.length === 0) return "Select vehicles";
                                    return `${selectedVehicleKeys.length} vehicle(s) selected`;
                                  })()}
                                </span>
                                <ChevronDown size={14} style={{ transform: vehicleSelectorOpenByDate[dateKey] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                              </button>

                              {vehicleSelectorOpenByDate[dateKey] && (
                                <div className="monthlyMaintenanceBulkChecklist">
                                  <label className="select-all-row">
                                    <input
                                      type="checkbox"
                                      checked={vehiclesByCategory.flatMap(g => g.vehicles).every(v => (datePlan.vehicles || {})[getAssetPlanKey(v)] !== false)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setBulkDatePlans(current => {
                                          const nextDatePlan = { ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }) };
                                          const nextVehicles = { ...nextDatePlan.vehicles };
                                          vehiclesByCategory.flatMap(g => g.vehicles).forEach(v => nextVehicles[getAssetPlanKey(v)] = checked);
                                          nextDatePlan.vehicles = nextVehicles;
                                          return { ...current, [dateKey]: nextDatePlan };
                                        });
                                      }}
                                    />
                                    <span>Select All</span>
                                  </label>
                                  {vehiclesByCategory.map((group) => {
                                    const groupVehicles = group.vehicles;
                                    if (groupVehicles.length === 0) return null;
                                    return groupVehicles.map((vehicle) => {
                                      const vehicleKey = getAssetPlanKey(vehicle);
                                      const isSelected = (datePlan.vehicles || {})[vehicleKey] !== false;
                                      return (
                                        <label key={`${dateKey}-${vehicleKey}`} className="monthlyMaintenanceCheckboxOption">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(event) =>
                                              setBulkDatePlans((current) => ({
                                                ...current,
                                                [dateKey]: {
                                                  ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }),
                                                  vehicles: {
                                                    ...((current[dateKey] || {}).vehicles || {}),
                                                    [vehicleKey]: event.target.checked,
                                                  },
                                                },
                                              }))
                                            }
                                          />
                                          <span>{vehicle.asset_tag ? `${vehicle.asset_tag} - ${vehicle.name}` : vehicle.name}</span>
                                        </label>
                                      );
                                    });
                                  })}
                                </div>
                              )}
                            </div>
                          </section>

                          <section className="monthlyMaintenanceBulkBlock">
                            <h3 style={isEmbedded ? { fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', textTransform: 'none', letterSpacing: 'normal', margin: '0 0 4px 0' } : undefined}>Services</h3>
                            <div style={{ position: 'relative', marginTop: '10px' }}>
                              <button
                                className="monthlyMaintenanceMultiSelectTrigger"
                                type="button"
                                style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => {
                                  setServiceSelectorOpenByDate((current) => ({
                                    ...current,
                                    [dateKey]: !current[dateKey],
                                  }));
                                  setVehicleSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                  setInventorySelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                  setAssigneeSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                }}
                              >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px', flex: 1, textAlign: 'left', minWidth: 0 }}>
                                  {(() => {
                                    const selectedServiceKeys = Object.keys(datePlan.services || {}).filter(k => (datePlan.services || {})[k] !== false);
                                    if (selectedServiceKeys.length === 0) return "Select services";
                                    return `${selectedServiceKeys.length} service(s) selected`;
                                  })()}
                                </span>
                                <ChevronDown size={14} style={{ transform: serviceSelectorOpenByDate[dateKey] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                              </button>

                              {serviceSelectorOpenByDate[dateKey] && (
                                <div className="monthlyMaintenanceBulkChecklist">
                                  <label className="select-all-row">
                                    <input
                                      type="checkbox"
                                      checked={normalizedServiceTypeOptions.length > 0 && normalizedServiceTypeOptions.every(s => (datePlan.services || {})[s] !== false)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setBulkDatePlans(current => {
                                          const nextDatePlan = { ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }) };
                                          const nextServices = { ...nextDatePlan.services };
                                          normalizedServiceTypeOptions.forEach(s => nextServices[s] = checked);
                                          nextDatePlan.services = nextServices;
                                          return { ...current, [dateKey]: nextDatePlan };
                                        });
                                      }}
                                    />
                                    <span>Select All</span>
                                  </label>
                                  {normalizedServiceTypeOptions.map((serviceType) => (
                                    <label key={serviceType} className="monthlyMaintenanceCheckboxOption">
                                      <input
                                        type="checkbox"
                                        checked={Boolean((datePlan.services || {})[serviceType])}
                                        onChange={(event) => {
                                          setBulkDatePlans((current) => ({
                                            ...current,
                                            [dateKey]: {
                                              ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }),
                                              services: {
                                                ...((current[dateKey] || {}).services || {}),
                                                [serviceType]: event.target.checked,
                                              },
                                            },
                                          }));
                                        }}
                                      />
                                      <span>{serviceType}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </section>

                          {!isEmbedded && (
                            <section className="monthlyMaintenanceBulkBlock">
                              <h3 style={isEmbedded ? { fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', textTransform: 'none', letterSpacing: 'normal', margin: '0 0 4px 0' } : undefined}>Parts To Consume</h3>
                              <div style={{ position: 'relative', marginTop: '10px' }}>
                                <>
                                  <button
                                    className="monthlyMaintenanceMultiSelectTrigger"
                                    type="button"
                                    onClick={() => {
                                      setInventorySelectorOpenByDate((current) => ({
                                        ...current,
                                        [dateKey]: !current[dateKey],
                                      }));
                                      setVehicleSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                      setServiceSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                      setAssigneeSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                    }}
                                  >
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px', flex: 1, textAlign: 'left', minWidth: 0 }}>
                                      {(() => {
                                        const selectedInventoryKeys = Object.keys(datePlan.inventories || {}).filter(k => (datePlan.inventories || {})[k] > 0);
                                        if (selectedInventoryKeys.length === 0) return "Select inventory";
                                        return `${selectedInventoryKeys.length} item(s) selected`;
                                      })()}
                                    </span>
                                    <ChevronDown size={14} style={{ transform: inventorySelectorOpenByDate[dateKey] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                                  </button>

                                  {inventorySelectorOpenByDate[dateKey] && (
                                    <div className="monthlyMaintenanceBulkChecklist">
                                      {itemOptions.length === 0 ? (
                                        <div style={{ padding: '8px', fontSize: '0.8rem', color: '#64748b' }}>No inventory items available</div>
                                      ) : (
                                        itemOptions.map((item) => {
                                          const itemKey = String(item.id ?? item.name ?? "");
                                          const currentQty = (datePlan.inventories || {})[itemKey] ?? "0";
                                          const isChecked = Number(currentQty) > 0;
                                          return (
                                            <div key={`${dateKey}-${itemKey}`} className="monthlyMaintenanceBulkInventoryRow">
                                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer', margin: 0 }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(event) => {
                                                    const checked = event.target.checked;
                                                    setBulkDatePlans((current) => ({
                                                      ...current,
                                                      [dateKey]: {
                                                        ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }),
                                                        inventories: {
                                                          ...((current[dateKey] || {}).inventories || {}),
                                                          [itemKey]: checked ? "1" : "0",
                                                        },
                                                      },
                                                    }));
                                                  }}
                                                />
                                                <span>{item.name} ({formatQuantity(item.inventory_quantity)} in stock)</span>
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                value={currentQty}
                                                style={{ width: '60px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                onChange={(event) =>
                                                  setBulkDatePlans((current) => ({
                                                    ...current,
                                                    [dateKey]: {
                                                      ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }),
                                                      inventories: {
                                                        ...((current[dateKey] || {}).inventories || {}),
                                                        [itemKey]: event.target.value,
                                                      },
                                                    },
                                                  }))
                                                }
                                              />
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </>
                              </div>
                            </section>
                          )}

                          <section className="monthlyMaintenanceBulkBlock">
                            <h3 style={isEmbedded ? { fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', textTransform: 'none', letterSpacing: 'normal', margin: '0 0 4px 0' } : undefined}>Assignee</h3>
                            {/* <h4 style={{ margin: '16px 0 4px', fontSize: '0.8rem', color: '#334155', textTransform: 'uppercase' }}>Assignee</h4> */}
                            {/* <p style={{ margin: '0 0 12px', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Assign all tasks for this date to multiple people</p> */}
                            <div style={{ position: 'relative', marginTop: '10px' }}>
                              <button
                                className="monthlyMaintenanceMultiSelectTrigger"
                                type="button"
                                style={{ width: '100%', background: '#fff', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => {
                                  setAssigneeSelectorOpenByDate((current) => ({
                                    ...current,
                                    [dateKey]: !current[dateKey],
                                  }));
                                  setVehicleSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                  setServiceSelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                  setInventorySelectorOpenByDate(c => ({ ...c, [dateKey]: false }));
                                }}
                              >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px', flex: 1, textAlign: 'left', minWidth: 0 }}>
                                  {(() => {
                                    const selectedAssignees = datePlan.assignees || [];
                                    if (selectedAssignees.length === 0) return "Select assignees";
                                    return `${selectedAssignees.length} assignee(s) selected`;
                                  })()}
                                </span>
                                <ChevronDown size={14} style={{ transform: assigneeSelectorOpenByDate[dateKey] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                              </button>

                              {assigneeSelectorOpenByDate[dateKey] && (
                                <div className="monthlyMaintenanceBulkChecklist">
                                  <label className="monthlyMaintenanceReferenceSearch monthlyMaintenanceInDropdownSearch" style={{ padding: '4px', margin: '0 0 8px 0' }}>
                                    <input
                                      type="search"
                                      value={assigneeSearchByDate[dateKey] || ""}
                                      onChange={(event) =>
                                        setAssigneeSearchByDate((current) => ({
                                          ...current,
                                          [dateKey]: event.target.value,
                                        }))
                                      }
                                      placeholder="Search team member..."
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                  </label>
                                  <label className="select-all-row">
                                    <input
                                      type="checkbox"
                                      checked={filteredAssigneeOptions.length > 0 && filteredAssigneeOptions.every(a => (datePlan.assignees || []).includes(a.value))}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setBulkDatePlans(current => {
                                          const nextDatePlan = { ...(current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] }) };
                                          const currentAssignees = new Set(nextDatePlan.assignees || []);
                                          if (checked) {
                                            filteredAssigneeOptions.forEach(a => currentAssignees.add(a.value));
                                          } else {
                                            filteredAssigneeOptions.forEach(a => currentAssignees.delete(a.value));
                                          }
                                          nextDatePlan.assignees = Array.from(currentAssignees);
                                          return { ...current, [dateKey]: nextDatePlan };
                                        });
                                      }}
                                    />
                                    <span>Select All Filtered</span>
                                  </label>
                                  {filteredAssigneeOptions.length === 0 ? (
                                    <p className="monthlyMaintenanceReferenceEmpty" style={{ padding: '8px', fontSize: '0.8rem', color: '#64748b' }}>No matching team members.</p>
                                  ) : (
                                    filteredAssigneeOptions.map((option) => {
                                      const selected = (datePlan.assignees || []).includes(option.value);
                                      return (
                                        <label key={`${dateKey}-${option.value}`} className="monthlyMaintenanceCheckboxOption">
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(event) =>
                                              setBulkDatePlans((current) => {
                                                const currentDatePlan = current[dateKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] };
                                                const currentAssignees = Array.isArray(currentDatePlan.assignees) ? currentDatePlan.assignees : [];
                                                const nextAssignees = event.target.checked
                                                  ? [...new Set([...currentAssignees, option.value])]
                                                  : currentAssignees.filter((value) => value !== option.value);
                                                return {
                                                  ...current,
                                                  [dateKey]: {
                                                    ...currentDatePlan,
                                                    assignees: nextAssignees,
                                                  },
                                                };
                                              })
                                            }
                                          />
                                          <span>{option.label}</span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </section>
                        </div>
                      </article>
                    );
                  })}
                </div >
              </div >
            )
            }

            <div className="assetFormActions">
              <button
                className="primaryAction"
                type="button"
                disabled={saving}
                onClick={() =>
                  onCreateBulkMaintenanceSchedule({
                    startDate: bulkStartDate,
                    endDate: bulkEndDate,
                    datePlans: bulkDateOptions.map((dateKey) => {
                      const planKey = isEmbedded ? "master" : dateKey;
                      const datePlan = bulkDatePlans[planKey] || { vehicles: {}, services: {}, inventories: {}, assignees: [] };
                      return {
                        date: dateKey,
                        assignees: Array.isArray(datePlan.assignees)
                          ? datePlan.assignees.map((value) => String(value || "").trim()).filter(Boolean)
                          : String(datePlan.assignee || "").trim()
                            ? [String(datePlan.assignee || "").trim()]
                            : [],
                        vehicles: monthlyMaintenanceRows
                          .filter(({ asset }) => Boolean(selectedVehicles[getAssetPlanKey(asset)]))
                          .map(({ asset, draft }) => {
                            const assetKey = getAssetPlanKey(asset);
                            return {
                              key: assetKey,
                              asset,
                              include: draft.enabled !== false && (datePlan.vehicles || {})[assetKey] !== false,
                              dueDate: dateKey,
                            };
                          }),
                        serviceTypes: selectedServiceTypeOptions.filter(
                          (serviceType) => (datePlan.services || {})[serviceType] !== false
                        ),
                        inventories: itemOptions
                          .map((item) => ({
                            id: item.id,
                            name: item.name,
                            quantity: Math.max(0, Number((datePlan.inventories || {})[String(item.id)] || 0)),
                          }))
                          .filter((entry) => entry.quantity > 0),
                        inventoryNotes: datePlan.inventoryNotes,
                      };
                    }),
                    onSuccess: () => {
                      const monthWindow = monthRange(monthlyMaintenanceMonth);
                      setBulkStartDate(monthWindow.start < todayDateKey ? todayDateKey : monthWindow.start);
                      setBulkEndDate(monthWindow.end < todayDateKey ? todayDateKey : monthWindow.end);
                      setBulkDatePlans({});
                    },
                  })
                }
              >
                Create Schedule Tasks
              </button>
            </div>
          </section >
        )
        }

      </section >


    </section >
  );
}

