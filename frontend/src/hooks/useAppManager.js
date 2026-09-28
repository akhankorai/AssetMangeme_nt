import { useEffect, useMemo, useRef, useState } from "react";
import {
  changePassword, deleteAdminUser, deleteAdminRole, createAdminUser, createAdminRole,
  getCurrentUser, listAdminRoles, listAdminUsers, login, logout,
  updateAdminUser, updateAdminRole, updateProfile,
} from "../api";
import { assetModules, defaultAssetModule, findAssetModule, systemModules } from "../modules";
import { navigation, viewDescriptions, reportOptions, ROLE_ACTIONS, ROLE_SUBTYPES, ROLE_SUBTYPE_ACTIONS, DEFAULT_REGULAR_INSPECTION_LIST, scheduleStages } from "../constants";
import { formatDate, formatCurrency, formatQuantity, formatPersonDisplayName } from "../utils/formatting";
import { todayInputValue, monthInputValue, dateToInputValue, parseInputDate, formatCompactDate, addDaysDateKey, addDaysToDate, monthLabel, addMonths, monthRange, buildMonthDays, matchesReportPeriod } from "../utils/dateHelpers";
import { downloadExcelCompatibleCsv, downloadModernNotificationExcel } from "../utils/csvExport";
import { normalizeIdentityValue, canonicalIdentityValue, isTaskAssignedToCurrentUser } from "../utils/identity";
import { buildPriority, statusLabel, parseAssetNotes, buildCategoryPrefix, extractAssetIdentifierParts, buildAssetTagFromValues, buildDraftFromAsset } from "../utils/assetHelpers";
import { normalizeScheduleTask, serializeScheduleTask, splitScheduleTasks, stageProgress, resolveTaskAssetDetails, dedupeTasks, buildTaskIdentity, normalizeServiceTypeName, serviceTypeMatchKey, getServiceTypeIntervalDays, findLatestCompletedServiceDate, hasConsumedItem, normalizeNoConsumptionTask, markTaskAsJustCreated, getScheduleRiskTone } from "../normalizers/scheduleNormalizers";
import { normalizeFuelDemand } from "../normalizers/fuelNormalizers";
import { normalizeList, emptyDashboardSummaryFallback, buildNotificationTaskEntry, getMonthlyMaintenanceDefaultServiceType, createMonthlyMaintenanceDraft } from "../normalizers/commonNormalizers";
import SearchableDropdown from "../components/SearchableDropdown";
import StatBlock from "../components/StatBlock";
import ReportRangePicker from "../components/ReportRangePicker";
import DailyInspectionWorkspace from "../pages/DailyInspectionWorkspace/DailyInspectionWorkspace";
import ScheduleWorkspace from "../pages/ScheduleWorkspace/ScheduleWorkspace";
import MonthlyMaintenanceWorkspace from "../pages/MonthlyMaintenanceWorkspace/MonthlyMaintenanceWorkspace";
import CompletedTasksWorkspace from "../pages/CompletedTasksWorkspace/CompletedTasksWorkspace";
import ExpenseWorkspace from "../pages/ExpenseWorkspace/ExpenseWorkspace";
import FuelDemandWorkspace from "../pages/FuelDemandWorkspace/FuelDemandWorkspace";
import SettingsWorkspace from "../pages/SettingsWorkspace/SettingsWorkspace";
import TeamWorkspace from "../pages/TeamWorkspace/TeamWorkspace";
import AssetsWorkspace from "../pages/AssetsWorkspace/AssetsWorkspace";
import ReportsWorkspace from "../pages/ReportsWorkspace/ReportsWorkspace";
import Sidebar from "../components/Layout/Sidebar";
import Header from "../components/Layout/Header";
import TaskModal from "../components/Modals/TaskModal";
import DailyInspectionModal from "../components/Modals/DailyInspectionModal";
import NotificationModal from "../components/Modals/NotificationModal";

export function useAppManager() {

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fuelDemands, setFuelDemands] = useState([]);
  const [fuelTab, setFuelTab] = useState("request");
  const [fuelAllocationDrafts, setFuelAllocationDrafts] = useState({});
  const [items, setItems] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [regularInspectionList, setRegularInspectionList] = useState([]);
  const [regularInspectionDbReady, setRegularInspectionDbReady] = useState(false);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("Dashboard");
  const [expandedSidebarSection, setExpandedSidebarSection] = useState(defaultAssetModule.key);
  const [activeModuleKey, setActiveModuleKey] = useState(defaultAssetModule.key);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationInbox, setNotificationInbox] = useState([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState("");
  const [assetFormTab, setAssetFormTab] = useState("directory");
  const [viewedAssetId, setViewedAssetId] = useState(null);
  const [isAssetModalClosing, setIsAssetModalClosing] = useState(false);
  const [viewedTask, setViewedTask] = useState(null);
  const [isTaskModalClosing, setIsTaskModalClosing] = useState(false);
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [dailyInspectionRecordsByDate, setDailyInspectionRecordsByDate] = useState({});
  const [allDailyInspectionRecords, setAllDailyInspectionRecords] = useState([]);
  const [resolvedInspectionRecordIds, setResolvedInspectionRecordIds] = useState([]);
  const [dailyInspectionModal, setDailyInspectionModal] = useState(null);
  const [dailyInspectionDraft, setDailyInspectionDraft] = useState({
    checkpoints: {
      brakes: false,
      tires: false,
      lights: false,
      horn: false,
      oilLeak: false,
      battery: false,
    },
    needsMaintenance: "no",
    notes: "",
  });
  const [monthlyMaintenanceMonth, setMonthlyMaintenanceMonth] = useState(monthInputValue());
  const [monthlyMaintenanceDraftsByPlan, setMonthlyMaintenanceDraftsByPlan] = useState({});
  const [bulkInventoryDemand, setBulkInventoryDemand] = useState([]);
  const [monthlyMaintenanceSaving, setMonthlyMaintenanceSaving] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("");
  const [reportType, setReportType] = useState("assets");
  const [reportFrequency, setReportFrequency] = useState("monthly");
  const [reportFuelScope, setReportFuelScope] = useState("overall");
  const [reportFuelAssetTag, setReportFuelAssetTag] = useState("");
  const [reportFuelStation, setReportFuelStation] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const value = new Date();
    value.setFullYear(value.getFullYear() - 1);
    return dateToInputValue(value);
  });
  const [reportDateTo, setReportDateTo] = useState(todayInputValue());
  const [reportDownloading, setReportDownloading] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [serviceTypeModalOpen, setServiceTypeModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [serviceTypeSearch, setServiceTypeSearch] = useState("");
  const [categoryDraft, setCategoryDraft] = useState({
    id: null,
    name: "",
    description: "",
  });
  const [itemDraft, setItemDraft] = useState({
    id: null,
    name: "",
    price: "",
    inventory_quantity: "",
  });
  const [fuelDemandDraft, setFuelDemandDraft] = useState([
    {
      _id: String(Date.now() + Math.random()),
      assetTag: "",
      fuelItemId: "",
      liters: "",
      meterReading: "",
      requestDate: todayInputValue(),
      station: "",
      notes: "",
    }
  ]);
  const [locationDraft, setLocationDraft] = useState({
    id: null,
    name: "",
    description: "",
    site: "",
    room: "",
  });
  const [confirmConfig, setConfirmConfig] = useState(null);

  function requestConfirm({ message, onConfirm }) {
    setConfirmConfig({ message, onConfirm });
  }

  function handleConfirmDialog() {
    if (confirmConfig?.onConfirm) {
      confirmConfig.onConfirm();
    }
    setConfirmConfig(null);
  }

  function handleCancelConfirm() {
    setConfirmConfig(null);
  }
  const [serviceTypeDraft, setServiceTypeDraft] = useState({
    id: null,
    name: "",
    description: "",
    interval_days: "",
  });
  const [employeeCategories, setEmployeeCategories] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamTab, setTeamTab] = useState("Members");
  const [teamMemberModalOpen, setTeamMemberModalOpen] = useState(false);
  const [employeeCategoryModalOpen, setEmployeeCategoryModalOpen] = useState(false);
  const [teamMemberSearch, setTeamMemberSearch] = useState("");
  const [employeeCategorySearch, setEmployeeCategorySearch] = useState("");
  const [teamMemberDraft, setTeamMemberDraft] = useState({
    id: null,
    name: "",
    serial_number: "",
    employee_category: "",
    designation: "",
    is_active: true,
  });
  const [employeeCategoryDraft, setEmployeeCategoryDraft] = useState({
    id: null,
    name: "",
    description: "",
    is_active: true,
  });
  const [scheduleFilters, setScheduleFilters] = useState({
    category: "All Assets",
    station: "All Stations",
    dateFrom: "",
    dateTo: "",
  });
  const [scheduleDraft, setScheduleDraft] = useState({
    id: "",
    title: "",
    assetTag: "",
    category: "",
    serviceType: "",
    assignee: "",
    dueDate: "",
    risk: "Medium",
    stage: "planned",
    processType: "maintenance",
    progress: 0,
    inspectionRequired: true,
    inspectionComment: "",
    meterReading: "",
    lastServiceDate: "",
    consumedItemId: null,
    consumedItemName: "",
    consumedQuantity: 1,
    inventoryApplied: false,
  });
  const [assetDraft, setAssetDraft] = useState({
    id: null,
    name: "",
    category_name: "Tractor",
    location_name: "",
    purchase_date: "",
    warranty_expiry: "",
    meter_reading: "",
  });
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminSection, setAdminSection] = useState("Profile");
  const [profileDraft, setProfileDraft] = useState({ first_name: "", last_name: "", email: "" });
  const [passwordDraft, setPasswordDraft] = useState({ current_password: "", new_password: "" });
  const [managedUsers, setManagedUsers] = useState([]);
  const [userRoleDrafts, setUserRoleDrafts] = useState({});
  const [editingManagedUserId, setEditingManagedUserId] = useState(null);
  const [managedUserEditDraft, setManagedUserEditDraft] = useState({
    first_name: "",
    last_name: "",
    email: "",
    new_password: "",
    is_superuser: false,
  });
  const [roles, setRoles] = useState([]);
  const [roleDraft, setRoleDraft] = useState({ name: "", description: "", permissions: {} });
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleEditorTab, setRoleEditorTab] = useState("permissions");
  const [rolePermissionSearch, setRolePermissionSearch] = useState("");
  const [roleTreeOpen, setRoleTreeOpen] = useState({});
  const [roleSubtypeOpen, setRoleSubtypeOpen] = useState({});
  const [managedUserDraft, setManagedUserDraft] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    is_active: true,
    is_staff: true,
    is_superuser: false,
    assigned_role_ids: [],
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const canAccessUserManagement = Boolean(authUser?.is_superuser);
  const fileInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const assetModalCloseTimeoutRef = useRef(null);
  const activeModule = findAssetModule(activeModuleKey);
  const moduleApi = activeModule.api;
  const activeModuleLabel = activeModule.label;
  const assetRegistrationDraftStorageKey = `${activeModuleKey}-asset-registration-draft`;
  const permissionTree = useMemo(() => authUser?.access_policy?.permissions || {}, [authUser?.access_policy?.permissions]);

  const visibleAssetModules = useMemo(() => {
    if (!authUser || authUser?.is_superuser) {
      return assetModules;
    }

    const allowedModuleSet = new Set();

    if (permissionTree && typeof permissionTree === "object") {
      Object.entries(permissionTree).forEach(([moduleKey, subtypes]) => {
        if (!subtypes || typeof subtypes !== "object") {
          return;
        }
        const hasCheckedAction = Object.values(subtypes).some(
          (actionMap) =>
            actionMap &&
            typeof actionMap === "object" &&
            Object.values(actionMap).some((enabled) => Boolean(enabled)),
        );
        if (hasCheckedAction) {
          allowedModuleSet.add(moduleKey);
        }
      });
    }

    if (allowedModuleSet.size === 0) {
      return assetModules;
    }
    return assetModules.filter((moduleDefinition) => allowedModuleSet.has(moduleDefinition.key));
  }, [authUser, permissionTree]);
  const monthlyMaintenancePlanKey = `${activeModuleKey}:${monthlyMaintenanceMonth}`;
  const availableVehicleAssets = useMemo(
    () =>
      assets
        .filter((asset) => ["available", "assigned", "maintenance"].includes(String(asset.status || "").toLowerCase()))
        .sort(
          (left, right) =>
            String(left.asset_tag || left.name || "").localeCompare(String(right.asset_tag || right.name || "")),
        ),
    [assets],
  );
  const monthlyMaintenanceDrafts = useMemo(
    () => monthlyMaintenanceDraftsByPlan[monthlyMaintenancePlanKey] || {},
    [monthlyMaintenanceDraftsByPlan, monthlyMaintenancePlanKey],
  );

  useEffect(() => {
    setMonthlyMaintenanceDraftsByPlan((current) => {
      const currentPlan = current[monthlyMaintenancePlanKey] || {};
      const nextPlan = {};
      let changed = false;

      availableVehicleAssets.forEach((asset) => {
        const assetKey = String(asset.asset_tag || asset.id || "");
        if (currentPlan[assetKey]) {
          nextPlan[assetKey] = currentPlan[assetKey];
          return;
        }
        nextPlan[assetKey] = createMonthlyMaintenanceDraft(asset, monthlyMaintenanceMonth, serviceTypes);
        changed = true;
      });

      if (Object.keys(currentPlan).length !== Object.keys(nextPlan).length) {
        changed = true;
      }

      if (!changed) {
        return current;
      }

      return {
        ...current,
        [monthlyMaintenancePlanKey]: nextPlan,
      };
    });
  }, [availableVehicleAssets, monthlyMaintenanceMonth, monthlyMaintenancePlanKey, serviceTypes]);

  const monthlyMaintenanceRows = useMemo(
    () =>
      availableVehicleAssets.map((asset) => {
        const assetKey = String(asset.asset_tag || asset.id || "");
        return {
          asset,
          draft: monthlyMaintenanceDrafts[assetKey] || createMonthlyMaintenanceDraft(asset, monthlyMaintenanceMonth, serviceTypes),
        };
      }),
    [availableVehicleAssets, monthlyMaintenanceDrafts, monthlyMaintenanceMonth, serviceTypes],
  );
  const monthlyMaintenancePurchaseSummary = useMemo(() => {
    const [yearText, monthText] = monthlyMaintenanceMonth.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const monthDate = year && month ? new Date(year, month - 1, 1) : new Date();
    const reservations = scheduleTasks.reduce((map, task) => {
      if (task.stage === "completed" || !hasConsumedItem(task)) {
        return map;
      }

      const itemKey = String(task.consumedItemId || task.consumedItemName || "").trim().toLowerCase();
      if (!itemKey) {
        return map;
      }

      map.set(itemKey, (map.get(itemKey) || 0) + Math.max(1, Number(task.consumedQuantity) || 1));
      return map;
    }, new Map());

    const selectedRows = monthlyMaintenanceRows.filter(({ draft }) => draft.enabled !== false);
    const reportMap = new Map();
    let unallocatedCount = 0;
    let totalDemandUnits = 0;
    function getOrCreateReportRow(matchedItem) {
      const key = String(matchedItem.id || matchedItem.name).trim().toLowerCase();
      const existing = reportMap.get(key) || {
        key,
        name: matchedItem.name,
        newDemandQuantity: 0,
        currentStockQuantity: Number(matchedItem.inventory_quantity || 0),
        alreadyReservedQuantity:
          reservations.get(String(matchedItem.id).trim().toLowerCase()) ||
          reservations.get(String(matchedItem.name || "").trim().toLowerCase()) ||
          0,
        requiredBeforeDate: "",
        unitPrice: Number(matchedItem.price || 0),
      };
      reportMap.set(key, existing);
      return existing;
    }

    selectedRows.forEach(({ draft }) => {
      const quantity = Math.max(1, Number(draft.consumedQuantity) || 1);
      const matchedItem =
        items.find((item) => String(item.id) === String(draft.consumedItemId || "")) ??
        items.find((item) => String(item.name || "").trim().toLowerCase() === String(draft.consumedItemName || "").trim().toLowerCase()) ??
        null;

      if (!matchedItem) {
        unallocatedCount += 1;
        return;
      }

      const existing = getOrCreateReportRow(matchedItem);
      existing.newDemandQuantity += quantity;
      if (draft.dueDate && (!existing.requiredBeforeDate || draft.dueDate < existing.requiredBeforeDate)) {
        existing.requiredBeforeDate = draft.dueDate;
      }
      totalDemandUnits += quantity;
    });
    (bulkInventoryDemand || []).forEach((entry) => {
      const matchedItem =
        items.find((item) => String(item.id) === String(entry?.itemId || "")) ??
        items.find((item) => String(item.name || "").trim().toLowerCase() === String(entry?.itemName || "").trim().toLowerCase()) ??
        null;
      const quantity = Math.max(0, Number(entry?.quantity) || 0);
      if (!matchedItem || quantity <= 0) {
        return;
      }
      const existing = getOrCreateReportRow(matchedItem);
      existing.newDemandQuantity += quantity;
      const entryRequiredBy = String(entry?.requiredBy || "");
      if (entryRequiredBy && (!existing.requiredBeforeDate || entryRequiredBy < existing.requiredBeforeDate)) {
        existing.requiredBeforeDate = entryRequiredBy;
      }
      totalDemandUnits += quantity;
    });

    const reportRows = [...reportMap.values()]
      .map((row) => {
        const remainingQuantity = row.currentStockQuantity - row.newDemandQuantity;
        const purchaseQuantity = Math.max(0, -remainingQuantity);
        return {
          ...row,
          remainingQuantity,
          purchaseQuantity,
          purchaseCost: purchaseQuantity * row.unitPrice,
        };
      })
      .sort((left, right) => right.purchaseQuantity - left.purchaseQuantity || left.name.localeCompare(right.name));
    const purchaseRows = reportRows.filter((row) => row.purchaseQuantity > 0);

    return {
      monthLabel: monthLabel(monthDate),
      reportTitle: `${monthLabel(monthDate)} Inventory Purchase Preview`,
      totalVehicles: availableVehicleAssets.length,
      selectedCount: selectedRows.length,
      unallocatedCount,
      totalDemandUnits,
      purchaseLines: purchaseRows.length,
      purchaseUnits: formatQuantity(reportRows.reduce((sum, row) => sum + row.purchaseQuantity, 0)),
      purchaseCost: reportRows.reduce((sum, row) => sum + row.purchaseCost, 0),
      reportRows,
      purchaseRows,
    };
  }, [availableVehicleAssets.length, bulkInventoryDemand, items, monthlyMaintenanceMonth, monthlyMaintenanceRows, scheduleTasks]);

  function hasRolePermission(moduleKey, subtypeKey, actionKey) {
    if (authUser?.is_superuser) {
      return true;
    }
    const modulePermissions = permissionTree[moduleKey] || {};
    const scoped = modulePermissions[subtypeKey] || {};
    return Boolean(scoped[actionKey]);
  }

  const canAccessMonthlyMaintenance = Boolean(
    authUser?.is_superuser || hasRolePermission(activeModuleKey, "schedule_workflow", "create_task"),
  );

  useEffect(() => {
    if (visibleAssetModules.some((moduleDefinition) => moduleDefinition.key === activeModuleKey)) {
      return;
    }
    const fallbackModuleKey = visibleAssetModules[0]?.key || defaultAssetModule.key;
    setActiveModuleKey(fallbackModuleKey);
    setExpandedSidebarSection((current) => (current === "system" ? "system" : fallbackModuleKey));
  }, [activeModuleKey, visibleAssetModules]);

  useEffect(() => {
    if (activeView !== "Schedule Monthly Maintenance Task") {
      return;
    }
    if (canAccessMonthlyMaintenance) {
      return;
    }
    setActiveView("Dashboard");
    setActionMessage("Monthly maintenance planning is available only for superuser and creator roles.");
  }, [activeView, canAccessMonthlyMaintenance]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const user = await getCurrentUser();
        if (!cancelled) {
          setAuthUser(user);
          setProfileDraft({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
          });
        }
      } catch {
        if (!cancelled) {
          setAuthUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthInitialized(true);
        }
      }
    }

    loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    try {
      const user = await login(loginForm);
      setAuthUser(user);
      setActionMessage(`Welcome ${user.username}.`);
    } catch (err) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    try {
      await logout();
      setAuthUser(null);
      setLoginForm({ username: "", password: "" });
      setActionMessage("Logged out.");
    } catch (err) {
      setLoginError(err.message || "Logout failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleProfileClick() {
    setActiveView("Admin");
    setAdminSection("Profile");
    setActionMessage("Admin profile opened.");
    setUserMenuOpen(false);
  }

  function handleUserManagementClick() {
    if (!canAccessUserManagement) {
      setActionMessage("Only super admin can access user management.");
      setUserMenuOpen(false);
      return;
    }
    setActiveView("Admin");
    setAdminSection("User Management");
    setActionMessage("Admin user management opened.");
    setUserMenuOpen(false);
  }

  async function handleSaveProfile() {
    try {
      const saved = await updateProfile(profileDraft);
      setAuthUser((current) => ({ ...(current || {}), ...saved }));
      setActionMessage("Profile updated.");
    } catch (err) {
      setActionMessage(`Profile update failed: ${err.message}`);
    }
  }

  async function handleChangePassword() {
    try {
      await changePassword(passwordDraft);
      setPasswordDraft({ current_password: "", new_password: "" });
      setActionMessage("Password changed successfully.");
    } catch (err) {
      setActionMessage(`Password update failed: ${err.message}`);
    }
  }

  async function handleLoadManagedUsers() {
    try {
      const users = await listAdminUsers();
      setManagedUsers(users);
    } catch (err) {
      setActionMessage(`User list failed: ${err.message}`);
    }
  }

  async function handleCreateManagedUser() {
    try {
      await createAdminUser(managedUserDraft);
      setActionMessage("User created.");
      setManagedUserDraft({
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        email: "",
        is_active: true,
        is_staff: true,
        is_superuser: false,
        assigned_role_ids: [],
      });
      await handleLoadManagedUsers();
    } catch (err) {
      showNotification(`User creation failed: ${err.message}`, "error");
    }
  }

  async function handleToggleManagedUser(user, field) {
    try {
      await updateAdminUser(user.id, { [field]: !user[field] });
      await handleLoadManagedUsers();
    } catch (err) {
      setActionMessage(`User update failed: ${err.message}`);
    }
  }

  function toggleManagedUserRoleDraft(user, roleId, checked) {
    setUserRoleDrafts((current) => {
      const currentIds = current[user.id] !== undefined ? current[user.id] : (user.assigned_role_ids || []);
      const nextIds = checked ? [...new Set([...currentIds, roleId])] : currentIds.filter((id) => id !== roleId);
      return { ...current, [user.id]: nextIds };
    });
  }

  async function handleSaveManagedUserRoles(userId, explicitRoleIds = null, options = {}) {
    const { silent = false } = options;

    // Allow explicitly passing roles to bypass React state delays, otherwise fall back to draft, then current roles
    let selectedRoleIds = explicitRoleIds;
    if (selectedRoleIds === null) {
      const user = managedUsers.find(u => u.id === userId);
      selectedRoleIds = userRoleDrafts[userId] !== undefined
        ? userRoleDrafts[userId]
        : (user?.assigned_role_ids || []);
    }

    try {
      await updateAdminUser(userId, { assigned_role_ids: selectedRoleIds });
      await handleLoadManagedUsers();
      if (!silent) {
        setActionMessage("User roles updated.");
        showNotification("User roles updated successfully.");
      }
    } catch (err) {
      setActionMessage(`User role update failed: ${err.message}`);
      showNotification(`User role update failed: ${err.message}`, "error");
      throw err;
    }
  }

  function startEditManagedUser(user) {
    setEditingManagedUserId(user.id);
    setManagedUserEditDraft({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      new_password: "",
      is_superuser: Boolean(user.is_superuser),
    });
  }

  function cancelEditManagedUser() {
    setEditingManagedUserId(null);
    setManagedUserEditDraft({
      first_name: "",
      last_name: "",
      email: "",
      new_password: "",
      is_superuser: false,
    });
  }

  async function handleSaveManagedUser(userId) {
    try {
      const payload = {
        first_name: managedUserEditDraft.first_name,
        last_name: managedUserEditDraft.last_name,
        email: managedUserEditDraft.email,
        is_superuser: managedUserEditDraft.is_superuser,
      };
      if (managedUserEditDraft.new_password.trim()) {
        payload.new_password = managedUserEditDraft.new_password.trim();
      }
      await updateAdminUser(userId, payload);
      await handleSaveManagedUserRoles(userId, null, { silent: true });
      cancelEditManagedUser();
      setActionMessage("User updated.");
      showNotification("User updated successfully.");
    } catch (err) {
      setActionMessage(`User update failed: ${err.message}`);
      showNotification(`User update failed: ${err.message}`, "error");
    }
  }

  async function handleDeleteManagedUser(user) {
    const shouldDelete = window.confirm(`Delete user "${user.username}"?`);
    if (!shouldDelete) {
      return;
    }
    try {
      await deleteAdminUser(user.id);
      if (editingManagedUserId === user.id) {
        cancelEditManagedUser();
      }
      await handleLoadManagedUsers();
      setActionMessage("User deleted.");
      showNotification("User deleted successfully.");
    } catch (err) {
      setActionMessage(`User delete failed: ${err.message}`);
      showNotification(`User delete failed: ${err.message}`, "error");
    }
  }

  async function handleLoadRoles() {
    try {
      const rows = await listAdminRoles();
      setRoles(rows);
    } catch (err) {
      setActionMessage(`Role list failed: ${err.message}`);
    }
  }

  async function handleCreateRole() {
    try {
      if (!roleDraft.name.trim()) {
        setActionMessage("Role name is required.");
        showNotification("Role name is required.", "error");
        return;
      }
      showNotification(editingRoleId ? "Updating role..." : "Saving role...");
      if (editingRoleId) {
        await updateAdminRole(editingRoleId, {
          name: roleDraft.name,
          description: roleDraft.description,
          permissions: roleDraft.permissions,
        });
        setActionMessage("Role updated.");
        showNotification("Role updated successfully.");
      } else {
        await createAdminRole({
          name: roleDraft.name,
          description: roleDraft.description,
          permissions: roleDraft.permissions,
        });
        setActionMessage("Role created.");
        showNotification("Role created successfully.");
      }
      setRoleDraft({ name: "", description: "", permissions: {} });
      setEditingRoleId(null);
      setRolePermissionSearch("");
      await handleLoadRoles();
    } catch (err) {
      setActionMessage(`Role creation failed: ${err.message}`);
      showNotification(`Role save failed: ${err.message}`, "error");
    }
  }

  async function handleDeleteRole(role) {
    const shouldDelete = window.confirm(`Delete role "${role.name}"? This will remove it from all assigned users.`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteAdminRole(role.id);
      if (editingRoleId === role.id) {
        setEditingRoleId(null);
        setRoleDraft({ name: "", description: "", permissions: {} });
      }
      setActionMessage("Role deleted.");
      showNotification("Role deleted successfully.");
      await handleLoadRoles();
      await handleLoadManagedUsers();
    } catch (err) {
      setActionMessage(`Role delete failed: ${err.message}`);
      showNotification(`Role delete failed: ${err.message}`, "error");
    }
  }

  function isRolePermissionChecked(moduleKey, subtypeKey, actionKey) {
    return Boolean(roleDraft.permissions?.[moduleKey]?.[subtypeKey]?.[actionKey]);
  }

  function toggleRolePermission(moduleKey, subtypeKey, actionKey) {
    setRoleDraft((current) => {
      const next = { ...(current.permissions || {}) };
      next[moduleKey] = { ...(next[moduleKey] || {}) };
      next[moduleKey][subtypeKey] = { ...(next[moduleKey][subtypeKey] || {}) };
      next[moduleKey][subtypeKey][actionKey] = !next[moduleKey][subtypeKey][actionKey];
      return { ...current, permissions: next };
    });
  }

  function getSubtypeActions(subtype) {
    return ROLE_SUBTYPE_ACTIONS[subtype] || ROLE_ACTIONS;
  }

  function isSubtypeSelected(moduleKey, subtypeKey) {
    const actions = getSubtypeActions(subtypeKey);
    return actions.every((action) => isRolePermissionChecked(moduleKey, subtypeKey, action));
  }

  function toggleSubtypePermissions(moduleKey, subtypeKey, checked) {
    setRoleDraft((current) => {
      const next = { ...(current.permissions || {}) };
      next[moduleKey] = { ...(next[moduleKey] || {}) };
      next[moduleKey][subtypeKey] = { ...(next[moduleKey][subtypeKey] || {}) };
      getSubtypeActions(subtypeKey).forEach((action) => {
        next[moduleKey][subtypeKey][action] = checked;
      });
      return { ...current, permissions: next };
    });
  }

  function isSubtypeOpen(moduleKey, subtypeKey) {
    return roleSubtypeOpen[`${moduleKey}:${subtypeKey}`] === true;
  }

  function toggleModulePermissions(moduleKey, checked) {
    setRoleDraft((current) => {
      const next = { ...(current.permissions || {}) };
      next[moduleKey] = { ...(next[moduleKey] || {}) };
      ROLE_SUBTYPES.forEach((subtype) => {
        next[moduleKey][subtype] = { ...(next[moduleKey][subtype] || {}) };
        getSubtypeActions(subtype).forEach((action) => {
          next[moduleKey][subtype][action] = checked;
        });
      });
      return { ...current, permissions: next };
    });
  }

  const roleSearchTerm = rolePermissionSearch.trim().toLowerCase();
  const filteredRoleTree = [...assetModules, ...systemModules].map((moduleDefinition) => {
    const visibleSubtypes = ROLE_SUBTYPES.filter((subtype) => {
      if (moduleDefinition.key === "system" && subtype !== "approvals") return false;
      if (moduleDefinition.key !== "system" && subtype === "approvals") return false;

      if (!roleSearchTerm) {
        return true;
      }
      const subtypeText = subtype.replaceAll("_", " ").toLowerCase();
      const moduleText = moduleDefinition.label.toLowerCase();
      const actionText = getSubtypeActions(subtype).join(" ").replaceAll("_", " ").toLowerCase();
      return subtypeText.includes(roleSearchTerm) || moduleText.includes(roleSearchTerm) || actionText.includes(roleSearchTerm);
    });
    return { moduleDefinition, visibleSubtypes };
  });

  const hasAnyVisiblePermission = filteredRoleTree.some((entry) => entry.visibleSubtypes.length > 0);
  const isAllVisibleSelected =
    hasAnyVisiblePermission &&
    filteredRoleTree
      .filter((entry) => entry.visibleSubtypes.length > 0)
      .every((entry) =>
        entry.visibleSubtypes.every((subtype) => isSubtypeSelected(entry.moduleDefinition.key, subtype)),
      );

  function toggleSelectAllVisible(checked) {
    setRoleDraft((current) => {
      const next = { ...(current.permissions || {}) };
      filteredRoleTree.forEach((entry) => {
        if (entry.visibleSubtypes.length === 0) {
          return;
        }
        const moduleKey = entry.moduleDefinition.key;
        next[moduleKey] = { ...(next[moduleKey] || {}) };
        entry.visibleSubtypes.forEach((subtype) => {
          next[moduleKey][subtype] = { ...(next[moduleKey][subtype] || {}) };
          getSubtypeActions(subtype).forEach((action) => {
            next[moduleKey][subtype][action] = checked;
          });
        });
      });
      return { ...current, permissions: next };
    });
  }

  useEffect(() => {
    if (!canAccessUserManagement && adminSection === "User Management") {
      setAdminSection("Profile");
      return;
    }

    if (activeView === "Admin" && adminSection === "User Management") {
      handleLoadManagedUsers();
      handleLoadRoles();
    }
    if (activeView === "Admin" && adminSection === "Roles") {
      handleLoadRoles();
    }
  }, [activeView, adminSection, canAccessUserManagement]);

  useEffect(() => {
    setUserRoleDrafts((current) => {
      const next = {};
      managedUsers.forEach((user) => {
        next[user.id] = current[user.id] || user.assigned_role_ids || [];
      });
      return next;
    });
  }, [managedUsers]);

  async function handleAdminLogoutClick() {
    setUserMenuOpen(false);
    await handleLogout();
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  function createEmptyDraft() {
    return {
      id: null,
      name: "",
      category_name: categories.find((category) => category.is_active !== false)?.name || "Tractor",
      location_name: "",
      purchase_date: "",
      warranty_expiry: "",
      meter_reading: "",
    };
  }

  function createEmptyScheduleDraft(processType = "maintenance") {
    return {
      id: "",
      title: "",
      assetTag: "",
      category: "",
      serviceType: "",
      assignee: "",
      assignedAt: "",
      dueDate: "",
      risk: "Medium",
      stage: processType === "emergency" ? "inspection" : "planned",
      processType,
      progress: 0,
      inspectionRequired: true,
      inspectionComment: "",
      meterReading: "",
      lastServiceDate: "",
      consumedItemId: null,
      consumedItemName: "",
      consumedQuantity: 1,
      inventoryApplied: false,
    };
  }

  function createEmptyItemDraft() {
    return {
      id: null,
      name: "",
      price: "",
      inventory_quantity: "",
    };
  }

  function createEmptyFuelDemandDraft() {
    return {
      _id: String(Date.now() + Math.random()),
      assetTag: "",
      fuelItemId: "",
      liters: "",
      meterReading: "",
      requestDate: todayInputValue(),
      station: "",
      notes: "",
    };
  }

  function createEmptyLocationDraft() {
    return {
      id: null,
      name: "",
      description: "",
      site: "",
      room: "",
    };
  }

  function createEmptyServiceTypeDraft() {
    return {
      id: null,
      name: "",
      description: "",
      interval_days: "",
    };
  }

  function createEmptyEmployeeCategoryDraft() {
    return {
      id: null,
      name: "",
      description: "",
      is_active: true,
    };
  }

  function createEmptyTeamMemberDraft() {
    return {
      id: null,
      name: "",
      serial_number: "",
      employee_category: "",
      designation: "",
      is_active: true,
    };
  }

  function handleSidebarSectionToggle(sectionKey) {
    setExpandedSidebarSection((current) => {
      if (current === sectionKey) {
        return "";
      }

      if (sectionKey !== "system") {
        setActiveModuleKey(sectionKey);
      }
      return sectionKey;
    });
  }

  useEffect(() => {
    const nextDefaultCategory = categories.find((category) => category.is_active !== false)?.name || "Tractor";
    setActiveView("Dashboard");
    setSearch("");
    setSelectedStatus("");
    setSelectedLocation("");
    setSelectedAssetId(null);
    setNotificationsOpen(false);
    setAlertsDismissed(false);
    setActionMessage(`${activeModuleLabel} workspace loaded.`);
    setNotification(null);
    setError("");
    setSettingsTab("");
    setReportType("assets");
    setReportFrequency("monthly");
    setReportFuelScope("overall");
    setReportFuelAssetTag("");
    setReportFuelStation("");
    setReportDateFrom(todayInputValue());
    setReportDateTo(todayInputValue());
    setCategorySearch("");
    setItemSearch("");
    setLocationSearch("");
    setServiceTypeSearch("");
    setFuelDemandDraft([createEmptyFuelDemandDraft()]);
    setFuelTab("request");
    setFuelAllocationDrafts({});
    setAssetDraft({
      id: null,
      name: "",
      category_name: nextDefaultCategory,
      location_name: "",
      purchase_date: "",
      warranty_expiry: "",
      meter_reading: "",
    });
    setScheduleDraft({
      id: "",
      title: "",
      assetTag: "",
      category: "",
      serviceType: "",
      assignee: "",
      assignedAt: "",
      dueDate: "",
      risk: "Medium",
      stage: "planned",
      progress: 0,
      inspectionRequired: true,
      inspectionComment: "",
      meterReading: "",
      lastServiceDate: "",
      consumedItemId: null,
      consumedItemName: "",
      consumedQuantity: 1,
      inventoryApplied: false,
    });
    setUploadedFileName("");
    setUploadError("");
  }, [activeModuleKey, activeModuleLabel, categories]);

  useEffect(() => {
    async function loadData() {
      const [assetResult, dashboardResult] = await Promise.allSettled([
        moduleApi.listAssets(),
        moduleApi.getDashboardSummary(),
      ]);

      if (assetResult.status === "fulfilled") {
        const rawAssets = normalizeList(assetResult.value);
        const normalizedAssets = rawAssets.map((asset) => hydrateAsset(asset));
        setAssets(normalizedAssets);
        setSelectedAssetId(normalizedAssets[0]?.id ?? null);

        const shouldSyncAssetTagsToBackend = activeModuleKey !== "vehicle-assets";
        const outdatedAssets = normalizedAssets.filter((asset, index) => asset.asset_tag !== rawAssets[index]?.asset_tag);
        if (shouldSyncAssetTagsToBackend && outdatedAssets.length > 0) {
          Promise.allSettled(
            outdatedAssets.map((asset) =>
              moduleApi.patchAsset(asset.id, {
                asset_tag: asset.asset_tag,
              }),
            ),
          );
        }
      } else {
        setAssets([]);
        setSelectedAssetId(null);
        setError(assetResult.reason.message);
      }

      if (dashboardResult.status === "fulfilled") {
        setSummary(dashboardResult.value);
      } else {
        setSummary(emptyDashboardSummaryFallback());
        if (assetResult.status !== "rejected") {
          setError(dashboardResult.reason.message);
        }
      }
    }

    loadData();
  }, [moduleApi, activeModuleKey]);

  async function refreshScheduleTasks() {
    try {
      const dbTasks = splitScheduleTasks(normalizeList(await moduleApi.listScheduleTasks()));
      let nextActiveTasks = dedupeTasks(dbTasks.active);
      let nextCompletedTasks = dedupeTasks(dbTasks.completed);

      nextActiveTasks = nextActiveTasks.map((task) => {
        const details = resolveTaskAssetDetails(assets, task.assetTag, {
          assetName: task.assetName,
          category: task.category,
        });
        return { ...task, ...details };
      });
      nextCompletedTasks = nextCompletedTasks.map((task) => {
        const details = resolveTaskAssetDetails(assets, task.assetTag, {
          assetName: task.assetName,
          category: task.category,
        });
        return { ...task, ...details };
      });

      setScheduleTasks(nextActiveTasks);
      setCompletedTasks(nextCompletedTasks);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refreshScheduleTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleApi, assets]);

  useEffect(() => {
    async function loadReferenceData() {
      let supportsRegularInspectionItems = false;
      try {
        const apiRoot = await moduleApi.listApiRoot();
        supportsRegularInspectionItems = Boolean(apiRoot && apiRoot["regular-inspection-items"]);
      } catch (_) {
        supportsRegularInspectionItems = false;
      }

      const [
        categoryResult,
        expenseResult,
        fuelDemandResult,
        itemResult,
        serviceTypeResult,
        regularInspectionResult,
        locationResult,
        employeeCategoryResult,
        teamMemberResult,
      ] = await Promise.allSettled([
        moduleApi.listCategories(),
        moduleApi.listExpenses(),
        moduleApi.listFuelDemands(),
        moduleApi.listItems(),
        moduleApi.listServiceTypes(),
        supportsRegularInspectionItems ? moduleApi.listRegularInspectionItems() : Promise.resolve([]),
        moduleApi.listLocations(),
        moduleApi.listEmployeeCategories(),
        moduleApi.listTeamMembers(),
      ]);

      if (categoryResult.status === "fulfilled") {
        setCategories(normalizeList(categoryResult.value));
      } else {
        setError(categoryResult.reason.message);
      }

      if (expenseResult.status === "fulfilled") {
        setExpenses(normalizeList(expenseResult.value));
      } else {
        setExpenses([]);
      }

      if (fuelDemandResult.status === "fulfilled") {
        setFuelDemands(normalizeList(fuelDemandResult.value).map(normalizeFuelDemand));
      } else {
        setFuelDemands([]);
      }

      if (itemResult.status === "fulfilled") {
        setItems(normalizeList(itemResult.value));
      } else {
        setItems([]);
      }

      if (serviceTypeResult.status === "fulfilled") {
        setServiceTypes(
          normalizeList(serviceTypeResult.value).map((serviceType) => ({
            ...serviceType,
            name: normalizeServiceTypeName(serviceType.name),
            interval_days: Number(serviceType.interval_days || 0),
          })),
        );
      } else {
        setServiceTypes([]);
      }

      if (supportsRegularInspectionItems && regularInspectionResult.status === "fulfilled") {
        const normalizedRows = normalizeList(regularInspectionResult.value)
          .map((row, index) => ({
            id: row.id,
            category: String(row.category || "").trim(),
            check_item: String(row.check_item || "").trim(),
            standard: String(row.standard || "").trim(),
            sort_order: Number(row.sort_order ?? index + 1),
          }))
          .sort((left, right) => {
            const bySort = Number(left.sort_order || 0) - Number(right.sort_order || 0);
            if (bySort !== 0) {
              return bySort;
            }
            return Number(left.id || 0) - Number(right.id || 0);
          });
        setRegularInspectionList(normalizedRows);
        setRegularInspectionDbReady(true);
      } else {
        setRegularInspectionList([...DEFAULT_REGULAR_INSPECTION_LIST]);
        setRegularInspectionDbReady(false);
      }

      if (locationResult.status === "fulfilled") {
        setLocations(
          normalizeList(locationResult.value).sort((left, right) => left.name.localeCompare(right.name)),
        );
      } else {
        setError(locationResult.reason.message);
      }

      if (employeeCategoryResult.status === "fulfilled") {
        setEmployeeCategories(normalizeList(employeeCategoryResult.value));
      } else {
        setEmployeeCategories([]);
      }

      if (teamMemberResult.status === "fulfilled") {
        setTeamMembers(normalizeList(teamMemberResult.value));
      } else {
        setTeamMembers([]);
      }
    }

    loadReferenceData();
  }, [moduleApi]);

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    const hasPendingFuelDemands = fuelDemands.some((entry) => ["requested", "approved"].includes(entry.status));
    if (hasPendingFuelDemands) {
      setFuelTab("allocate");
    }
  }, [fuelDemands]);

  useEffect(() => {
    return () => {
      if (assetModalCloseTimeoutRef.current) {
        window.clearTimeout(assetModalCloseTimeoutRef.current);
      }
    };
  }, []);

  const viewScopedAssets = useMemo(() => {
    if (activeView === "Daily Inspection" || activeView === "Schedule" || activeView === "Tasks") {
      return assets.filter((asset) => ["assigned", "maintenance"].includes(asset.status));
    }

    if (activeView === "Team") {
      return assets.filter((asset) => asset.assigned_to);
    }

    return assets;
  }, [activeView, assets]);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return viewScopedAssets.filter((asset) => {
      const matchesSearch =
        !term ||
        [
          asset.asset_tag,
          asset.name,
          asset.serial_number,
          asset.category_name,
          asset.location_name,
          asset.assigned_to,
          asset.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesStatus = !selectedStatus || asset.status === selectedStatus;
      const matchesLocation = !selectedLocation || asset.location_name === selectedLocation;

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [search, selectedLocation, selectedStatus, viewScopedAssets]);

  const selectedAsset =
    filteredAssets.find((asset) => asset.id === selectedAssetId) ??
    assets.find((asset) => asset.id === selectedAssetId) ??
    filteredAssets[0] ??
    assets[0] ??
    null;
  const viewedAsset =
    assets.find((asset) => asset.id === viewedAssetId) ??
    filteredAssets.find((asset) => asset.id === viewedAssetId) ??
    null;
  const assetCategories = [
    ...new Set(
      (
        categories.some((category) => category.is_active !== false)
          ? categories.filter((category) => category.is_active !== false).map((category) => category.name)
          : [...assets.map((asset) => asset.category_name).filter(Boolean), "Tractor", "Bike"]
      ).filter(Boolean),
    ),
  ];
  const assetNameOptions = [...new Set(assets.map((asset) => asset.name).filter(Boolean))];
  const assetTypeOptions = [...new Set([assetDraft.category_name, ...assetCategories].filter(Boolean))];
  const assetTagOptions = [...new Set(assets.map((asset) => asset.asset_tag).filter(Boolean))];
  const fuelItems = useMemo(() => {
    const preferred = items.filter((item) => /fuel|diesel|petrol|gas/i.test(String(item.name || "")));
    return (preferred.length > 0 ? preferred : items).slice().sort((left, right) => left.name.localeCompare(right.name));
  }, [items]);
  const stationAssetTagSet = useMemo(
    () =>
      new Set(
        assets
          .filter((asset) => !reportFuelStation || asset.location_name === reportFuelStation)
          .map((asset) => asset.asset_tag)
          .filter(Boolean),
      ),
    [assets, reportFuelStation],
  );
  const serviceTypeOptions = [
    ...new Set([
      ...serviceTypes
        .filter((serviceType) => serviceType.is_active !== false)
        .map((serviceType) => normalizeServiceTypeName(serviceType.name)),
    ]),
  ];
  const employeeCategoryOptions = [...employeeCategories]
    .slice()
    .sort((left, right) => Number(right.is_active !== false) - Number(left.is_active !== false) || left.name.localeCompare(right.name));
  const showDashboardOverview = ![
    "Admin",
    "Assets",
    "Daily Inspection",
    "Schedule",
    "Schedule Monthly Maintenance Task",
    "Fuel Demand",
    "Settings",
    "Expense",
    "Tasks",
    "Team",
    "Reports",
    "Gate Pass",
    "Approvals",
  ].includes(activeView);

  const assetBackedOverview = {
    total_assets: assets.length,
    available_assets: assets.filter((asset) => asset.status === "available").length,
    assigned_assets: assets.filter((asset) => asset.status === "assigned").length,
    maintenance_assets: assets.filter((asset) => asset.status === "maintenance").length,
    retired_assets: assets.filter((asset) => asset.status === "retired").length,
    categories: new Set(assets.map((asset) => asset.category_name).filter(Boolean)).size,
    locations: new Set(assets.map((asset) => asset.location_name).filter(Boolean)).size,
  };
  const overview = summary?.error ? assetBackedOverview : summary?.overview ?? assetBackedOverview;
  const assignedTasks = scheduleTasks.filter((task) => task.assignee && task.stage !== "completed");
  const activeMaintenanceTasks = scheduleTasks.filter((task) => task.stage !== "completed");
  const allocatedFuelTaskRows = fuelDemands
    .filter((entry) => entry.status === "fulfilled")
    .map((entry) => ({
      id: `fuel-demand-${entry.id}`,
      title: "Fuel Allocation",
      assetTag: entry.assetTag || "",
      assetName: entry.assetName || "",
      category: "Fuel Demand",
      assignee: entry.station || "",
      serviceType: "Fuel Allocation",
      stage: "completed",
      completedAt: entry.allocatedAt || entry.requestDate || entry.createdAt || "",
      assignedAt: entry.requestDate || entry.createdAt || "",
      dueDate: "",
      consumedItemName: entry.fuelItemName || "",
      consumedQuantity: Number(entry.liters || 0),
      meterReading: entry.meterReading == null ? "" : String(entry.meterReading),
      inspectionRequired: false,
      progress: 100,
      sourceType: "fuel",
    }));
  const completedTaskRows = [...completedTasks, ...allocatedFuelTaskRows]
    .filter((task) => {
      const term = search.trim().toLowerCase();
      return (
        !term ||
        [task.title, task.assetTag, task.category, task.assignee, task.consumedItemName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    })
    .sort(
      (left, right) =>
        new Date(right.completedAt || right.assignedAt || right.dueDate || 0).getTime() -
        new Date(left.completedAt || left.assignedAt || left.dueDate || 0).getTime(),
    );
  const dailyInspectionDateKey = todayInputValue();
  const dailyInspectionRecords = dailyInspectionRecordsByDate[dailyInspectionDateKey] || {};

  useEffect(() => {
    let cancelled = false;

    async function loadDailyInspectionRecords() {
      try {
        const [rowsForDate, allRows] = await Promise.all([
          moduleApi.listDailyInspections(dailyInspectionDateKey),
          moduleApi.listDailyInspections(),
        ]);
        const rows = normalizeList(rowsForDate);
        const allRowsNormalized = normalizeList(allRows);
        if (cancelled) {
          return;
        }
        const byAssetKey = {};
        rows.forEach((entry) => {
          const assetKey = String(entry.asset_tag || "").trim();
          if (!assetKey) {
            return;
          }
          byAssetKey[assetKey] = {
            id: entry.id,
            completed: Boolean(entry.completed),
            completedAt: entry.completed_at || "",
            checkpoints: entry.checkpoints || {},
            needsMaintenance: entry.needs_maintenance ? "yes" : "no",
            notes: entry.notes || "",
          };
        });
        setDailyInspectionRecordsByDate((current) => ({
          ...current,
          [dailyInspectionDateKey]: byAssetKey,
        }));
        setAllDailyInspectionRecords(allRowsNormalized);
      } catch {
        setDailyInspectionRecordsByDate((current) => ({
          ...current,
          [dailyInspectionDateKey]: current[dailyInspectionDateKey] || {},
        }));
        setAllDailyInspectionRecords([]);
      }
    }

    loadDailyInspectionRecords();
    return () => {
      cancelled = true;
    };
  }, [dailyInspectionDateKey, moduleApi]);

  function handleOpenDailyInspection(row) {
    if (!row?.checkKey) {
      return;
    }
    const existingRecord = dailyInspectionRecords[row.checkKey];
    setDailyInspectionModal(row);
    setDailyInspectionDraft(
      existingRecord || {
        checkpoints: {
          brakes: false,
          tires: false,
          lights: false,
          horn: false,
          oilLeak: false,
          battery: false,
        },
        needsMaintenance: "no",
        notes: "",
      },
    );
  }

  function handleCloseDailyInspectionModal() {
    setDailyInspectionModal(null);
  }

  function handleToggleDailyCheckpoint(checkpointKey, checked) {
    setDailyInspectionDraft((current) => ({
      ...current,
      checkpoints: {
        ...(current.checkpoints || {}),
        [checkpointKey]: checked,
      },
    }));
  }

  async function handleCompleteDailyInspection() {
    if (!dailyInspectionModal?.checkKey) {
      return;
    }
    const completedAt = new Date().toISOString();
    const payload = {
      inspection_date: dailyInspectionDateKey,
      asset_tag: dailyInspectionModal.assetTag,
      asset_name: dailyInspectionModal.name,
      category: dailyInspectionModal.category,
      station: dailyInspectionModal.station,
      checkpoints: dailyInspectionDraft.checkpoints || {},
      needs_maintenance: dailyInspectionDraft.needsMaintenance === "yes",
      notes: String(dailyInspectionDraft.notes || "").trim(),
      completed: true,
      completed_at: completedAt,
    };
    const existingRecord = dailyInspectionRecords[dailyInspectionModal.checkKey];
    try {
      const savedRecord = existingRecord?.id
        ? await moduleApi.updateDailyInspection(existingRecord.id, payload)
        : await moduleApi.createDailyInspection(payload);
      setDailyInspectionRecordsByDate((current) => ({
        ...current,
        [dailyInspectionDateKey]: {
          ...(current[dailyInspectionDateKey] || {}),
          [dailyInspectionModal.checkKey]: {
            id: savedRecord.id,
            completed: Boolean(savedRecord.completed),
            completedAt: savedRecord.completed_at || completedAt,
            checkpoints: savedRecord.checkpoints || {},
            needsMaintenance: savedRecord.needs_maintenance ? "yes" : "no",
            notes: savedRecord.notes || "",
          },
        },
      }));
      setAllDailyInspectionRecords((current) => {
        const next = Array.isArray(current) ? [...current] : [];
        const nextRecord = {
          id: savedRecord.id,
          inspection_date: dailyInspectionDateKey,
          asset_tag: dailyInspectionModal.assetTag,
          asset_name: dailyInspectionModal.name,
          category: dailyInspectionModal.category,
          station: dailyInspectionModal.station,
          checkpoints: savedRecord.checkpoints || {},
          needs_maintenance: Boolean(savedRecord.needs_maintenance),
          notes: savedRecord.notes || "",
          completed: Boolean(savedRecord.completed),
          completed_at: savedRecord.completed_at || completedAt,
        };
        const existingIndex = next.findIndex((entry) => Number(entry?.id) === Number(savedRecord.id));
        if (existingIndex >= 0) {
          next[existingIndex] = nextRecord;
        } else {
          next.unshift(nextRecord);
        }
        return next;
      });
      showNotification("Daily inspection marked as completed.");
      setDailyInspectionModal(null);
    } catch (err) {
      showNotification(err.message || "Could not save daily inspection.", "error");
    }
  }

  async function handleSaveInspectionForVehicle(row, checklistRows, currentMeterReading) {
    if (!row?.checkKey) {
      return;
    }
    const checklistPayload = {};
    (checklistRows || []).forEach((entry) => {
      if (!entry?.id) {
        return;
      }
      checklistPayload[entry.id] = {
        category: entry.category || "",
        check_item: entry.checkItem || "",
        standard: entry.standard || "",
        status: entry.status || "",
        severity: entry.severity || "",
        remarks: entry.remarks || "",
        maintenance_needed: String(entry.action || "No").toLowerCase() === "yes",
      };
    });
    const needsMaintenance = Object.values(checklistPayload).some((entry) => entry.maintenance_needed);
    const meterValue = String(currentMeterReading || "").trim();
    const numericMeterReading = meterValue.replace(/[^0-9.]/g, "");
    const normalizedMeterReading = numericMeterReading || "0";
    const payload = {
      inspection_date: dailyInspectionDateKey,
      asset_tag: row.assetTag,
      asset_name: row.name,
      category: row.category,
      station: row.station,
      meter_reading: normalizedMeterReading,
      checkpoints: checklistPayload,
      needs_maintenance: needsMaintenance,
      notes: "",
      completed: false,
      completed_at: null,
    };
    const existingRecord = dailyInspectionRecords[row.checkKey];
    try {
      const savedRecord = existingRecord?.id
        ? await moduleApi.updateDailyInspection(existingRecord.id, payload)
        : await moduleApi.createDailyInspection(payload);
      setDailyInspectionRecordsByDate((current) => ({
        ...current,
        [dailyInspectionDateKey]: {
          ...(current[dailyInspectionDateKey] || {}),
          [row.checkKey]: {
            id: savedRecord.id,
            completed: Boolean(savedRecord.completed),
            completedAt: savedRecord.completed_at || "",
            checkpoints: savedRecord.checkpoints || {},
            needsMaintenance: savedRecord.needs_maintenance ? "yes" : "no",
            notes: savedRecord.notes || "",
          },
        },
      }));
      setAllDailyInspectionRecords((current) => {
        const next = Array.isArray(current) ? [...current] : [];
        const nextRecord = {
          id: savedRecord.id,
          inspection_date: dailyInspectionDateKey,
          asset_tag: row.assetTag,
          asset_name: row.name,
          category: row.category,
          station: row.station,
          meter_reading: savedRecord.meter_reading || normalizedMeterReading,
          checkpoints: savedRecord.checkpoints || {},
          needs_maintenance: Boolean(savedRecord.needs_maintenance),
          notes: savedRecord.notes || "",
          completed: Boolean(savedRecord.completed),
          completed_at: savedRecord.completed_at || null,
        };
        const existingIndex = next.findIndex((entry) => Number(entry?.id) === Number(savedRecord.id));
        if (existingIndex >= 0) {
          next[existingIndex] = nextRecord;
        } else {
          next.unshift(nextRecord);
        }
        return next;
      });
      showNotification("Inspection checklist saved for this vehicle.");
    } catch (err) {
      showNotification(err.message || "Could not save inspection checklist.", "error");
      throw err;
    }
  }
  const activeConsumptionRows = scheduleTasks
    .filter((task) => task.consumedItemName && task.stage !== "completed")
    .map((task) => {
      const matchedItem =
        items.find((item) => item.id === task.consumedItemId) ??
        items.find((item) => item.name === task.consumedItemName);
      const quantity = Math.max(1, Number(task.consumedQuantity) || 1);
      const unitPrice = Number(matchedItem?.price || 0);

      return {
        id: `task-${task.id}`,
        formatted_id: task.formatted_id || "",
        taskTitle: task.serviceType || task.title,
        assignee: task.assignee || "Unassigned",
        assignedDate: formatDate(task.assignedAt || task.dueDate),
        assetTitle: task.assetTag || "Unassigned asset",
        itemSubtitle: matchedItem
          ? `${matchedItem.name} x${quantity}`
          : `${task.consumedItemName} x${quantity}`,
        projectedCost: unitPrice * quantity,
        source: "scheduled",
      };
    });
  const pendingFuelConsumptionRows = fuelDemands
    .filter((entry) => ["requested", "approved"].includes(entry.status))
    .map((entry) => {
      const matchedItem =
        items.find((item) => item.id === entry.fuelItemId) ??
        items.find((item) => item.name === entry.fuelItemName);
      const quantity = Number(entry.liters || 0);
      const unitPrice = Number(matchedItem?.price || entry.unitPrice || 0);

      return {
        id: `fuel-request-${entry.id}`,
        formatted_id: entry.formatted_id || "",
        taskTitle: "Fuel Demand",
        assignee: entry.station || "Pending station",
        assignedDate: formatDate(entry.requestDate || entry.createdAt),
        assetTitle: entry.assetTag || "Vehicle asset",
        itemSubtitle: matchedItem
          ? `${matchedItem.name} x${formatQuantity(quantity)}`
          : `${entry.fuelItemName || "Fuel item"} x${formatQuantity(quantity)}`,
        projectedCost: unitPrice * quantity,
        source: "fuel-request",
      };
    });
  const recordedExpenseReferences = useMemo(
    () =>
      new Set(
        expenses.map((expense) => String(expense.task_reference || "")),
      ),
    [expenses],
  );
  const allocatedFuelExpenseRows = fuelDemands
    .filter((entry) => entry.status === "fulfilled" && !recordedExpenseReferences.has(`fuel-demand-${entry.id}`))
    .map((entry) => ({
      id: `fuel-expense-fallback-${entry.id}`,
      formatted_id: entry.formatted_id || "",
      taskTitle: "Fuel Allocation",
      assignee: entry.station || "Unassigned",
      assignedDate: formatDate(entry.allocatedAt || entry.requestDate || entry.createdAt),
      assetTitle: entry.assetTag || "Vehicle asset",
      itemSubtitle: entry.fuelItemName
        ? `${entry.fuelItemName} x${formatQuantity(entry.liters)}`
        : `Fuel x${formatQuantity(entry.liters)}`,
      projectedCost: Number(entry.totalCost || 0),
      source: "fuel-expense-fallback",
    }));

  const expenseRows = [
    ...activeConsumptionRows,
    ...pendingFuelConsumptionRows,
    ...allocatedFuelExpenseRows,
    ...expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      formatted_id: expense.formatted_id || "",
      taskTitle: expense.service_type || expense.task_title,
      assignee: expense.assignee || "Unassigned",
      assignedDate: formatDate(expense.assigned_at || expense.completed_at),
      assetTitle: expense.asset_tag || "Unassigned asset",
      itemSubtitle: expense.item_name
        ? `${expense.item_name} x${Math.max(1, Number(expense.quantity) || 1)}`
        : "No inventory item assigned",
      projectedCost: Number(expense.total_cost || 0),
      source: "expense",
    })),
  ].sort((left, right) => String(right.assignedDate).localeCompare(String(left.assignedDate)));
  const costMetrics = useMemo(() => {
    const itemBreakdown = items.map((item) => {
      const matchingScheduledTasks = scheduleTasks.filter(
        (task) =>
          task.stage !== "completed" &&
          (task.consumedItemId === item.id ||
            String(task.consumedItemName || "").trim().toLowerCase() === String(item.name).trim().toLowerCase()),
      );
      const matchingFuelRequests = fuelDemands.filter(
        (entry) =>
          ["requested", "approved"].includes(entry.status) &&
          (entry.fuelItemId === item.id ||
            String(entry.fuelItemName || "").trim().toLowerCase() === String(item.name).trim().toLowerCase()),
      );
      const scheduledQuantity =
        matchingScheduledTasks.reduce((sum, task) => sum + (Number(task.consumedQuantity) || 0), 0) +
        matchingFuelRequests.reduce((sum, entry) => sum + (Number(entry.liters) || 0), 0);
      const currentQuantity = Number(item.inventory_quantity || 0);

      return {
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        scheduledQuantity,
        remainingQuantity: currentQuantity,
        projectedCost: scheduledQuantity * Number(item.price || 0),
      };
    });

    const futureConsumptionCost = itemBreakdown.reduce((sum, item) => sum + item.projectedCost, 0);
    const reservedUnits = itemBreakdown.reduce((sum, item) => sum + item.scheduledQuantity, 0);
    const remainingInventoryValue = itemBreakdown.reduce((sum, item) => sum + item.remainingQuantity * item.price, 0);
    const syntheticAllocatedFuelExpenses = fuelDemands
      .filter((entry) => entry.status === "fulfilled" && !recordedExpenseReferences.has(`fuel-demand-${entry.id}`))
      .map((entry) => ({
        item: entry.fuelItemId,
        item_name: entry.fuelItemName || "",
        quantity: Number(entry.liters || 0),
        total_cost: Number(entry.totalCost || 0),
      }));
    const allConsumedExpenseRows = [...expenses, ...syntheticAllocatedFuelExpenses];
    const consumedBreakdown = items.map((item) => {
      const matchingExpenses = allConsumedExpenseRows.filter(
        (expense) =>
          expense.item === item.id ||
          String(expense.item_name || "").trim().toLowerCase() === String(item.name).trim().toLowerCase(),
      );
      const consumedQuantity = matchingExpenses.reduce((sum, expense) => sum + (Number(expense.quantity) || 0), 0);
      const consumedCost = matchingExpenses.reduce((sum, expense) => sum + Number(expense.total_cost || 0), 0);
      const currentQuantity = Number(item.inventory_quantity || 0);

      return {
        id: item.id,
        name: item.name,
        consumedQuantity,
        remainingQuantity: currentQuantity,
        consumedCost,
      };
    }).filter((item) => item.consumedQuantity > 0 || item.consumedCost > 0);

    const netConsumedCost = consumedBreakdown.reduce((sum, item) => sum + item.consumedCost, 0);
    const totalTrackedUnits = itemBreakdown.reduce((sum, item) => sum + item.remainingQuantity + item.scheduledQuantity, 0);
    const remainingTrackedUnits = itemBreakdown.reduce((sum, item) => sum + item.remainingQuantity, 0);
    const coverageRate = totalTrackedUnits ? ((remainingTrackedUnits / totalTrackedUnits) * 100).toFixed(1) : "0.0";

    return {
      futureConsumptionCost,
      netConsumedCost,
      reservedUnits,
      remainingInventoryValue,
      coverageRate,
      itemBreakdown,
      consumedBreakdown,
    };
  }, [expenses, fuelDemands, items, recordedExpenseReferences, scheduleTasks]);
  const fuelMetrics = useMemo(() => {
    const allocatedDemands = fuelDemands.filter((entry) => entry.status === "fulfilled");
    const totalLiters = allocatedDemands.reduce((sum, entry) => sum + Number(entry.liters || 0), 0);
    const totalCost = allocatedDemands.reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
    const totalDistance = allocatedDemands.reduce((sum, entry) => sum + Number(entry.distanceTravelled || 0), 0);
    return {
      totalLiters,
      totalCost,
      totalDistance,
      uniqueVehicles: new Set(allocatedDemands.map((entry) => entry.assetTag).filter(Boolean)).size,
      pendingRequests: fuelDemands.filter((entry) => ["requested", "approved"].includes(entry.status)).length,
      averageMileage: totalLiters > 0 ? totalDistance / totalLiters : 0,
    };
  }, [fuelDemands]);

  const alerts = alertsDismissed ? [] : summary?.alerts ?? [];
  const todayDateKey = todayInputValue();
  const tomorrowDateKey = addDaysDateKey(todayDateKey, 1);
  const yesterdayDateKey = addDaysDateKey(todayDateKey, -1);
  const userIdentityKeys = useMemo(() => {
    const fullName = `${authUser?.first_name || ""} ${authUser?.last_name || ""}`.trim();
    const username = String(authUser?.username || "").trim();
    const usernameAsName = username.replace(/[._-]+/g, " ");
    const emailLocalPart = String(authUser?.email || "").split("@")[0] || "";
    const values = [
      username,
      usernameAsName,
      fullName,
      authUser?.email,
      emailLocalPart,
    ];
    return new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean),
    );
  }, [authUser?.email, authUser?.first_name, authUser?.last_name, authUser?.username]);

  const userAssignedTasks = useMemo(
    () => {
      const dueWindowTasks = scheduleTasks.filter((task) => {
        const dueKey = String(task.dueDate || "").slice(0, 10);
        return dueKey === todayDateKey || dueKey === tomorrowDateKey;
      });
      if (authUser?.is_superuser) {
        return dueWindowTasks;
      }
      const matchedTasks = dueWindowTasks.filter((task) =>
        isTaskAssignedToCurrentUser(task.assignee, userIdentityKeys),
      );
      if (matchedTasks.length > 0) {
        return matchedTasks;
      }
      // Fallback: if identity mapping fails, still show due-window tasks that are
      // already visible to this user, instead of an empty notification popup.
      return dueWindowTasks;
    },
    [authUser?.is_superuser, scheduleTasks, todayDateKey, tomorrowDateKey, userIdentityKeys],
  );
  const userTasksDueTomorrow = useMemo(
    () => userAssignedTasks.filter((task) => String(task.dueDate || "").slice(0, 10) === tomorrowDateKey),
    [tomorrowDateKey, userAssignedTasks],
  );
  const userTasksDueToday = useMemo(
    () => userAssignedTasks.filter((task) => String(task.dueDate || "").slice(0, 10) === todayDateKey),
    [todayDateKey, userAssignedTasks],
  );

  useEffect(() => {
    if (userTasksDueTomorrow.length === 0) {
      return;
    }
    const moduleKey = String(activeModuleKey || "default");
    const reminderKey = `task-reminder:${moduleKey}:${todayDateKey}`;
    if (window.localStorage.getItem(reminderKey) === "1") {
      return;
    }
    showNotification(
      `Reminder: you have ${userTasksDueTomorrow.length} task${userTasksDueTomorrow.length === 1 ? "" : "s"} due tomorrow.`,
      "success",
    );
    window.localStorage.setItem(reminderKey, "1");
  }, [activeModuleKey, todayDateKey, userTasksDueTomorrow.length]);

  const popupTaskRows = useMemo(() => {
    const rows = [
      ...userTasksDueToday.map((task) => ({ ...task, _window: "today" })),
      ...userTasksDueTomorrow.map((task) => ({ ...task, _window: "tomorrow" })),
    ];
    const seen = new Set();
    return rows.filter((task) => {
      const key = String(task.id || `${task.title}-${task.assetTag}-${task.dueDate}`);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [userTasksDueToday, userTasksDueTomorrow]);
  const notificationStorageKey = useMemo(
    () => `task-notification-inbox:${activeModuleKey}:${String(authUser?.username || "anon").toLowerCase()}`,
    [activeModuleKey, authUser?.username],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notificationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setNotificationInbox(Array.isArray(parsed) ? parsed : []);
    } catch {
      setNotificationInbox([]);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!notificationStorageKey) {
      return;
    }
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(notificationInbox));
  }, [notificationInbox, notificationStorageKey]);

  useEffect(() => {
    if (popupTaskRows.length === 0) {
      return;
    }
    setNotificationInbox((current) => {
      const nextById = new Map((current || []).map((entry) => [String(entry.id), entry]));
      popupTaskRows.forEach((task) => {
        const entry = buildNotificationTaskEntry(task, task._window === "tomorrow" ? "tomorrow" : "today");
        const existing = nextById.get(String(entry.id));
        if (existing) {
          nextById.set(String(entry.id), { ...existing, ...entry, read: Boolean(existing.read) });
        } else {
          nextById.set(String(entry.id), entry);
        }
      });
      const pruned = [...nextById.values()].filter((entry) => {
        if (!entry?.dueDate) {
          return true;
        }
        return entry.dueDate >= addDaysDateKey(todayDateKey, -30);
      });
      return pruned.sort((left, right) => String(right.dueDate || "").localeCompare(String(left.dueDate || "")));
    });
  }, [popupTaskRows, todayDateKey]);

  const unreadNotificationTasks = useMemo(
    () => notificationInbox.filter((entry) => !entry.read),
    [notificationInbox],
  );
  const readNotificationTasks = useMemo(
    () => notificationInbox.filter((entry) => entry.read),
    [notificationInbox],
  );

  function markNotificationAsRead(entryId) {
    setNotificationInbox((current) =>
      current.map((entry) => (String(entry.id) === String(entryId) ? { ...entry, read: true } : entry)),
    );
  }

  function markAllNotificationsRead() {
    setNotificationInbox((current) => current.map((entry) => ({ ...entry, read: true })));
  }

  function getNotificationTimingLabel(dueDate) {
    const dueKey = String(dueDate || "").slice(0, 10);
    if (!dueKey) {
      return "No Date";
    }
    if (dueKey === todayDateKey) {
      return `Today (${formatDate(dueKey)})`;
    }
    if (dueKey === tomorrowDateKey) {
      return `Pre Informed (${formatDate(dueKey)})`;
    }
    if (dueKey === yesterdayDateKey) {
      return `Yesterday (${formatDate(dueKey)})`;
    }
    return formatDate(dueKey);
  }

  function groupedNotificationsByDate(entries) {
    const map = new Map();
    entries.forEach((entry) => {
      const key = String(entry.dueDate || "No due date");
      map.set(key, [...(map.get(key) || []), entry]);
    });
    return [...map.entries()].sort((left, right) => String(right[0]).localeCompare(String(left[0])));
  }

  const unreadNotificationsByDate = useMemo(
    () => groupedNotificationsByDate(unreadNotificationTasks),
    [unreadNotificationTasks],
  );
  const readNotificationsByDate = useMemo(
    () => groupedNotificationsByDate(readNotificationTasks),
    [readNotificationTasks],
  );
  const notificationCount = unreadNotificationTasks.length;
  const recentActivity =
    scheduleTasks.length > 0
      ? scheduleTasks.slice(0, 5).map((task) => ({
        id: task.id || `${task.assetTag || "asset"}-${task.serviceType || task.title || "task"}-${task.dueDate || "no-date"}`,
        asset_id: task.assetId ?? null,
        person: task.assignee || "Unassigned",
        action: `${task.serviceType || task.title} is ${task.stage.replaceAll("_", " ")}`,
        time: task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date",
      }))
      : summary?.recent_activity ?? [];
  const locationFeed = summary?.location_feed ?? [];
  const selectedStatusCount = selectedStatus
    ? overview[`${selectedStatus}_assets`] ?? filteredAssets.length
    : overview.total_assets;

  const uptime = overview.total_assets
    ? Math.max(94.8, 100 - overview.maintenance_assets * 1.7).toFixed(1)
    : "99.9";

  const filteredActiveMaintenanceTasks = activeMaintenanceTasks.filter(task =>
    filteredAssets.some(a => a.id === task.assetId || a.id === task.asset_id || a.asset_tag === task.assetTag)
  );

  const filteredUpcomingMaintenance = summary?.upcoming_maintenance?.filter(row =>
    filteredAssets.some(a => a.asset_tag === row.asset_tag || a.name === row.asset)
  ) || [];

  const maintenanceRows =
    filteredActiveMaintenanceTasks.length > 0
      ? filteredActiveMaintenanceTasks.slice(0, 6).map((task) => ({
        id: task.id,
        asset: task.title,
        asset_tag: task.assetTag,
        priority: task.risk,
        date: task.dueDate,
        tech: task.assignee || "Unassigned",
        status: task.stage,
        location_name: task.category || "",
      }))
      : filteredUpcomingMaintenance.length > 0
        ? filteredUpcomingMaintenance
        : filteredAssets.slice(0, 6).map((asset) => ({
          id: asset.id,
          asset: asset.name,
          asset_tag: asset.asset_tag,
          priority: buildPriority(asset.status),
          date: asset.purchase_date,
          tech: asset.assigned_to || "Unassigned",
          status: asset.status,
          location_name: asset.location_name || "",
        }));

  const teamSnapshot = useMemo(() => {
    const grouped = filteredAssets.reduce((map, asset) => {
      const owner = asset.assigned_to || "Unassigned";
      map.set(owner, (map.get(owner) ?? 0) + 1);
      return map;
    }, new Map());

    return [...grouped.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5);
  }, [filteredAssets]);

  const monthlyScheduleInventoryDemandPreview = useMemo(() => {
    const scopedTasks = scheduleTasks.filter((task) => {
      if (!task?.dueDate || !hasConsumedItem(task)) {
        return false;
      }
      if (task.stage === "completed" || task.stage === "declined") {
        return false;
      }
      if (!matchesReportPeriod(task.dueDate, reportDateFrom, reportDateTo)) {
        return false;
      }
      if (reportFuelScope === "asset") {
        return !reportFuelAssetTag || task.assetTag === reportFuelAssetTag;
      }
      if (reportFuelScope === "station") {
        return reportFuelStation ? stationAssetTagSet.has(task.assetTag) : true;
      }
      return true;
    });

    const itemLookupById = new Map(items.map((item) => [String(item.id), item]));
    const itemLookupByName = new Map(items.map((item) => [String(item.name || "").trim().toLowerCase(), item]));
    const demandMap = new Map();

    scopedTasks.forEach((task) => {
      const quantity = Math.max(1, Number(task.consumedQuantity) || 1);
      const matchedItem =
        itemLookupById.get(String(task.consumedItemId || "")) ||
        itemLookupByName.get(String(task.consumedItemName || "").trim().toLowerCase()) ||
        null;
      if (!matchedItem) {
        return;
      }

      const key = String(matchedItem.id);
      const existing = demandMap.get(key) || {
        name: matchedItem.name,
        currentStockQuantity: Number(matchedItem.inventory_quantity || 0),
        newDemandQuantity: 0,
        requiredBeforeDate: task.dueDate,
        unitPrice: Number(matchedItem.price || 0),
      };
      existing.newDemandQuantity += quantity;
      if (task.dueDate && (!existing.requiredBeforeDate || task.dueDate < existing.requiredBeforeDate)) {
        existing.requiredBeforeDate = task.dueDate;
      }
      demandMap.set(key, existing);
    });

    const rows = [...demandMap.values()]
      .map((row) => {
        const remainingQuantity = row.currentStockQuantity - row.newDemandQuantity;
        const purchaseQuantity = Math.max(0, -remainingQuantity);
        return {
          ...row,
          remainingQuantity,
          purchaseQuantity,
          purchaseCost: purchaseQuantity * row.unitPrice,
        };
      })
      .filter((row) => row.purchaseQuantity > 0)
      .sort((left, right) => right.purchaseQuantity - left.purchaseQuantity || left.name.localeCompare(right.name));

    return {
      rows,
      totalDemandUnits: rows.reduce((sum, row) => sum + row.newDemandQuantity, 0),
      totalPurchaseUnits: rows.reduce((sum, row) => sum + row.purchaseQuantity, 0),
      totalPurchaseCost: rows.reduce((sum, row) => sum + row.purchaseCost, 0),
      openTasksInRangeCount: scopedTasks.length,
      mappedItemDemandCount: demandMap.size,
      inventoryItemCount: items.length,
    };
  }, [items, reportDateFrom, reportDateTo, reportFuelAssetTag, reportFuelScope, reportFuelStation, scheduleTasks, stationAssetTagSet]);

  const selectedReportOption = reportOptions.find((option) => option.key === reportType) ?? reportOptions[0];
  const reportPreview = useMemo(() => {
    if (reportType === "monthly-schedule-inventory-demand") {
      let emptyStateMessage = "";
      if (monthlyScheduleInventoryDemandPreview.inventoryItemCount === 0) {
        emptyStateMessage = "No inventory items exist in this module. Add inventory first, then compare schedule demand.";
      } else if (monthlyScheduleInventoryDemandPreview.openTasksInRangeCount === 0) {
        emptyStateMessage = "No open scheduled maintenance tasks with consumed items were found in the selected date range.";
      } else if (monthlyScheduleInventoryDemandPreview.mappedItemDemandCount === 0) {
        emptyStateMessage = "Scheduled items could not be matched to inventory items. Ensure consumed item names/IDs match inventory.";
      } else {
        emptyStateMessage = "No shortage found: current inventory is sufficient for scheduled demand in this range.";
      }
      return {
        title: "Monthly Schedule Inventory Demand Report",
        description:
          "Compares current inventory against new monthly scheduled demand and lists items that must be purchased before their schedule date.",
        columns: ["Item", "Current stock", "New demand", "Remaining", "Purchase required", "Required before"],
        rows: monthlyScheduleInventoryDemandPreview.rows.map((row) => [
          row.name,
          formatQuantity(row.currentStockQuantity),
          formatQuantity(row.newDemandQuantity),
          formatQuantity(row.remainingQuantity),
          formatQuantity(row.purchaseQuantity),
          row.requiredBeforeDate ? formatDate(row.requiredBeforeDate) : "Not specified",
        ]),
        summary: [
          { label: "Items with shortage", value: String(monthlyScheduleInventoryDemandPreview.rows.length) },
          { label: "Total demand", value: formatQuantity(monthlyScheduleInventoryDemandPreview.totalDemandUnits || 0) },
          { label: "Units to purchase", value: formatQuantity(monthlyScheduleInventoryDemandPreview.totalPurchaseUnits || 0) },
          { label: "Estimated purchase cost", value: formatCurrency(monthlyScheduleInventoryDemandPreview.totalPurchaseCost || 0) },
        ],
        emptyStateMessage,
      };
    }

    if (reportType === "inventory-items") {
      const filteredRows = items.filter((item) => matchesReportPeriod(item.updated_at, reportDateFrom, reportDateTo));
      return {
        title: "Inventory Items Report",
        description: "A stock-focused preview of the PDF export, including unit rates and current value.",
        columns: ["Item", "Qty", "Unit price", "Stock value", "Updated"],
        rows: filteredRows.map((item) => [
          item.name,
          formatQuantity(item.inventory_quantity),
          formatCurrency(item.price),
          formatCurrency(Number(item.inventory_quantity || 0) * Number(item.price || 0)),
          formatDate(item.updated_at),
        ]),
        summary: [
          { label: "Rows", value: String(filteredRows.length) },
          { label: "Tracked units", value: formatQuantity(filteredRows.reduce((sum, item) => sum + Number(item.inventory_quantity || 0), 0)) },
          { label: "Inventory value", value: formatCurrency(filteredRows.reduce((sum, item) => sum + Number(item.inventory_quantity || 0) * Number(item.price || 0), 0)) },
        ],
      };
    }

    if (reportType === "team") {
      const filteredRows = teamMembers.filter((member) => matchesReportPeriod(member.created_at, reportDateFrom, reportDateTo));
      return {
        title: "Team Report",
        description: "A roster preview with category and activity status for people created in the chosen period.",
        columns: ["Serial", "Name", "Category", "Designation", "Status"],
        rows: filteredRows.map((member) => [
          member.serial_number,
          member.name,
          member.employee_category_name || employeeCategories.find((entry) => entry.id === member.employee_category)?.name || "Unassigned",
          member.designation || "Not set",
          member.is_active !== false ? "Active" : "Inactive",
        ]),
        summary: [
          { label: "Rows", value: String(filteredRows.length) },
          { label: "Active members", value: String(filteredRows.filter((member) => member.is_active !== false).length) },
          { label: "Categories", value: String(new Set(filteredRows.map((member) => member.employee_category).filter(Boolean)).size) },
        ],
      };
    }

    if (reportType === "tasks") {
      const filteredRows = [...scheduleTasks, ...completedTasks].filter((task) => {
        if (!matchesReportPeriod(task.assignedAt || task.dueDate || task.completedAt || task.createdAt, reportDateFrom, reportDateTo)) {
          return false;
        }
        if (reportFuelScope === "asset") {
          return !reportFuelAssetTag || task.assetTag === reportFuelAssetTag;
        }
        if (reportFuelScope === "station") {
          return reportFuelStation ? stationAssetTagSet.has(task.assetTag) : true;
        }
        return true;
      });
      return {
        title: "Tasks Report",
        description: "A service execution preview with assignee, stage, and due-date visibility.",
        columns: ["Task", "Asset tag", "Service", "Assignee", "Stage", "Date"],
        rows: filteredRows.map((task) => [
          task.title,
          task.assetTag || "Not assigned",
          task.serviceType || "Not set",
          task.assignee || "Unassigned",
          task.stage.replaceAll("_", " "),
          formatDate(task.dueDate || task.completedAt || task.assignedAt),
        ]),
        summary: [
          { label: "Rows", value: String(filteredRows.length) },
          { label: "Completed", value: String(filteredRows.filter((task) => task.stage === "completed").length) },
          { label: "High risk", value: String(filteredRows.filter((task) => task.risk === "High").length) },
        ],
      };
    }

    if (reportType === "expenses") {
      const filteredRows = expenses.filter((expense) => {
        if (!matchesReportPeriod(expense.completed_at || expense.assigned_at || expense.created_at, reportDateFrom, reportDateTo)) {
          return false;
        }
        if (reportFuelScope === "asset") {
          return !reportFuelAssetTag || expense.asset_tag === reportFuelAssetTag;
        }
        if (reportFuelScope === "station") {
          return reportFuelStation ? stationAssetTagSet.has(expense.asset_tag) : true;
        }
        return true;
      });
      return {
        title: "Expense Report",
        description: "A spending preview across recorded maintenance expenses in the selected reporting window.",
        columns: ["Task", "Asset tag", "Item", "Qty", "Total", "Recorded"],
        rows: filteredRows.map((expense) => [
          expense.task_title,
          expense.asset_tag || "Not assigned",
          expense.item_name || "No item",
          formatQuantity(expense.quantity),
          formatCurrency(expense.total_cost),
          formatDate(expense.completed_at || expense.assigned_at || expense.created_at),
        ]),
        summary: [
          { label: "Rows", value: String(filteredRows.length) },
          { label: "Total spend", value: formatCurrency(filteredRows.reduce((sum, expense) => sum + Number(expense.total_cost || 0), 0)) },
          { label: "Unique assets", value: String(new Set(filteredRows.map((expense) => expense.asset_tag).filter(Boolean)).size) },
        ],
      };
    }

    if (reportType === "fuel-consumption") {
      const filteredRows = fuelDemands.filter((entry) => {
        if (entry.status !== "fulfilled") {
          return false;
        }
        if (!matchesReportPeriod(entry.requestDate || entry.createdAt, reportDateFrom, reportDateTo)) {
          return false;
        }
        if (reportFuelScope === "asset") {
          return !reportFuelAssetTag || entry.assetTag === reportFuelAssetTag;
        }
        if (reportFuelScope === "station") {
          return !reportFuelStation || entry.station === reportFuelStation;
        }
        return true;
      });
      const liters = filteredRows.reduce((sum, entry) => sum + Number(entry.liters || 0), 0);
      const distance = filteredRows.reduce((sum, entry) => sum + Number(entry.distanceTravelled || 0), 0);
      const description =
        reportFuelScope === "asset"
          ? `A vehicle-specific fuel history preview for ${reportFuelAssetTag || "the selected asset"}.`
          : reportFuelScope === "station"
            ? `A station-specific fuel history preview for ${reportFuelStation || "the selected station"}.`
            : "A vehicle-wise fuel history preview with liters, meter movement, and average mileage.";
      return {
        title: "Fuel Consumption Report",
        description,
        columns: ["Asset tag", "Vehicle", "Fuel item", "Liters", "Distance", "Avg km/l", "Cost", "Date"],
        rows: filteredRows.map((entry) => [
          entry.assetTag,
          entry.assetName || "Not set",
          entry.fuelItemName || "Fuel item removed",
          formatQuantity(entry.liters),
          entry.distanceTravelled == null ? "-" : formatQuantity(entry.distanceTravelled),
          entry.averageDistancePerLiter == null ? "-" : formatQuantity(entry.averageDistancePerLiter),
          formatCurrency(entry.totalCost),
          formatDate(entry.requestDate || entry.createdAt),
        ]),
        summary: [
          { label: "Rows", value: String(filteredRows.length) },
          { label: "Total liters", value: formatQuantity(liters) },
          { label: "Fuel spend", value: formatCurrency(filteredRows.reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0)) },
          { label: "Avg mileage", value: liters > 0 ? formatQuantity(distance / liters) : "0" },
        ],
      };
    }

    const filteredRows = assets.filter((asset) => {
      if (!matchesReportPeriod(asset.created_at || asset.updated_at || asset.purchase_date, reportDateFrom, reportDateTo)) {
        return false;
      }
      if (reportFuelScope === "asset") {
        return !reportFuelAssetTag || asset.asset_tag === reportFuelAssetTag;
      }
      if (reportFuelScope === "station") {
        return !reportFuelStation || asset.location_name === reportFuelStation;
      }
      return true;
    });
    return {
      title: "Assets Report",
      description: "A registration preview with asset tags, categories, live statuses, and location placement.",
      columns: ["Tag", "Asset", "Category", "Status", "Location", "Purchase date"],
      rows: filteredRows.map((asset) => [
        asset.asset_tag,
        asset.name,
        asset.category_name || "Not set",
        statusLabel(asset.status),
        asset.location_name || "Not set",
        formatDate(asset.purchase_date || asset.created_at),
      ]),
      summary: [
        { label: "Rows", value: String(filteredRows.length) },
        { label: "Available", value: String(filteredRows.filter((asset) => asset.status === "available").length) },
        { label: "Maintenance", value: String(filteredRows.filter((asset) => asset.status === "maintenance").length) },
      ],
    };
  }, [assets, completedTasks, employeeCategories, expenses, fuelDemands, items, monthlyScheduleInventoryDemandPreview, reportDateFrom, reportDateTo, reportFuelAssetTag, reportFuelScope, reportFuelStation, reportType, scheduleTasks, stationAssetTagSet, teamMembers]);

  function handleNavClick(label, options = {}) {
    const nextView = options.view || label;
    setActiveView(nextView);
    if (options.settingsTab) {
      setSettingsTab(options.settingsTab);
    } else if (nextView !== "Settings") {
      setSettingsTab("");
    }
    setActionMessage(`${label} view is active in ${activeModuleLabel}.`);
  }

  function handleStatusFilter(status) {
    setSelectedStatus((current) => (current === status ? "" : status));
    setActiveView(status === "available" ? "Assets" : activeView);
    setActionMessage(
      selectedStatus === status ? "Status filter cleared." : `Filtering assets by ${statusLabel(status)} status.`,
    );
  }

  function handleAlertAction(alert, action) {
    if (action.toLowerCase().includes("view")) {
      setSelectedAssetId(alert.asset_id);
      setActiveView("Assets");
      setActionMessage(`Selected ${alert.title}.`);
      return;
    }

    if (alert.status_filter) {
      setSelectedStatus(alert.status_filter);
    }

    if (alert.location_name) {
      setSelectedLocation(alert.location_name);
    }

    setActiveView("Tasks");
    setActionMessage(`Applied ${statusLabel(alert.status_filter)} alert filters.`);
  }

  function clearFilters() {
    setSelectedStatus("");
    setSelectedLocation("");
    setSearch("");
    setActionMessage("All dashboard filters cleared.");
  }

  async function handleDownloadReport() {
    if (reportDateFrom > reportDateTo) {
      setError("From date cannot be after To date.");
      return;
    }

    try {
      const scopedReportTypes = new Set(["assets", "tasks", "expenses", "fuel-consumption"]);
      const reportParams = scopedReportTypes.has(reportType)
        ? {
          scope: reportFuelScope,
          asset_tag: reportFuelScope === "asset" ? reportFuelAssetTag : "",
          station: reportFuelScope === "station" ? reportFuelStation : "",
        }
        : {};
      if (scopedReportTypes.has(reportType) && reportFuelScope === "asset" && !reportFuelAssetTag) {
        throw new Error("Select a vehicle asset before downloading the single asset report.");
      }
      if (scopedReportTypes.has(reportType) && reportFuelScope === "station" && !reportFuelStation) {
        throw new Error("Select a station before downloading the station report.");
      }
      setReportDownloading(true);
      setError("");
      await moduleApi.downloadReport(reportType, reportFrequency, reportDateFrom, reportDateTo, reportParams);
      setActionMessage(`${selectedReportOption.label} ${reportFrequency} report downloaded for ${activeModuleLabel}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportDownloading(false);
    }
  }

  function handleDraftChange(field, value) {
    setAssetDraft((current) => ({ ...current, [field]: value }));
  }

  function showNotification(message, tone = "success") {
    setNotification({ message, tone });
  }

  function handleSaveDraft() {
    const draftPayload = {
      ...assetDraft,
      uploadedFileName,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(assetRegistrationDraftStorageKey, JSON.stringify(draftPayload));
    setActionMessage(`Draft saved for ${assetDraft.name || "new asset registration"}.`);
  }

  function hydrateAsset(asset, category, location) {
    return {
      ...asset,
      asset_tag: buildAssetTagFromValues({
        name: asset?.name,
        categoryName: category?.name || asset.category_name || "Tractor",
        existingTag: asset?.asset_tag,
      }),
      category_name: category?.name || asset.category_name || "Tractor",
      location_name: location?.name || asset.location_name || "",
    };
  }

  async function ensureCategory(name) {
    const existing = categories.find((category) => category.name === name);
    if (existing) {
      if (existing.is_active === false) {
        const reactivated = await moduleApi.updateCategory(existing.id, { is_active: true });
        setCategories((current) =>
          current.map((category) => (category.id === reactivated.id ? reactivated : category)),
        );
        return reactivated;
      }
      return existing;
    }

    const created = await moduleApi.createCategory({
      name,
      description: `${name} assets`,
    });
    setCategories((current) => [...current, created]);
    return created;
  }

  async function ensureLocation(name) {
    const existing = locations.find((location) => location.name === name);
    if (existing) {
      return existing;
    }

    const created = await moduleApi.createLocation({
      name,
      site: "Fleet Yard",
      room: "",
    });
    setLocations((current) => [...current, created]);
    return created;
  }

  function buildAssetTag() {
    return buildAssetTagFromValues({
      name: assetDraft.name,
      categoryName: assetDraft.category_name,
    });
  }

  async function handleProceedNext() {
    if (!assetDraft.name.trim()) {
      setActionMessage("Enter an asset name before continuing.");
      return;
    }

    if (!assetDraft.category_name) {
      setActionMessage("Choose an asset type before continuing.");
      return;
    }

    if (!assetDraft.location_name) {
      setActionMessage("Choose a location code before continuing.");
      return;
    }

    if (!assetDraft.purchase_date) {
      setActionMessage("Select a purchase date before continuing.");
      return;
    }

    if (!assetDraft.warranty_expiry) {
      setActionMessage("Select a warranty expiry date before continuing.");
      return;
    }

    if (["Tractor", "Bike"].includes(assetDraft.category_name) && !assetDraft.meter_reading.trim()) {
      setActionMessage("Enter the meter reading before continuing.");
      return;
    }

    try {
      const category = await ensureCategory(assetDraft.category_name);
      const location = await ensureLocation(assetDraft.location_name);
      const editingAsset = assets.find((asset) => asset.id === assetDraft.id) ?? selectedAsset;
      const payload = {
        asset_tag: assetDraft.id && editingAsset?.asset_tag ? editingAsset.asset_tag : buildAssetTag(),
        name: assetDraft.name.trim(),
        serial_number: "",
        category: category.id,
        location: location.id,
        assigned_to: "",
        purchase_date: assetDraft.purchase_date,
        purchase_cost: null,
        status: "available",
        notes: [
          `Warranty Expiry: ${assetDraft.warranty_expiry}`,
          assetDraft.meter_reading ? `Meter Reading: ${assetDraft.meter_reading}` : "",
          uploadedFileName ? `Document: ${uploadedFileName}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      };

      const savedAsset = assetDraft.id
        ? await moduleApi.updateAsset(assetDraft.id, payload)
        : await moduleApi.createAsset(payload);

      const hydratedAsset = hydrateAsset(savedAsset, category, location);
      setAssets((current) =>
        assetDraft.id
          ? current.map((asset) => (asset.id === savedAsset.id ? hydratedAsset : asset))
          : [hydratedAsset, ...current],
      );
      setSelectedAssetId(savedAsset.id);
      handleSaveDraft();
      setAssetFormTab("directory");
      const successMessage = assetDraft.id
        ? `${savedAsset.name} updated successfully.`
        : `${savedAsset.name} saved to the database and added to the directory.`;
      setActionMessage(successMessage);
      showNotification(successMessage);
      setAssetDraft(createEmptyDraft());
      setUploadedFileName("");
      setUploadError("");
    } catch (err) {
      const failureMessage = `Could not save to the database: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function handleAssetView(assetId) {
    if (assetModalCloseTimeoutRef.current) {
      window.clearTimeout(assetModalCloseTimeoutRef.current);
      assetModalCloseTimeoutRef.current = null;
    }
    setIsAssetModalClosing(false);
    setSelectedAssetId(assetId);
    setViewedAssetId(assetId);
    setAssetFormTab("directory");
    setActionMessage("Entry details loaded.");
  }

  function handleScheduleFilter(field, value) {
    setScheduleFilters((current) => ({ ...current, [field]: value }));
  }

  function handleCategoryDraftChange(field, value) {
    setCategoryDraft((current) => ({ ...current, [field]: value }));
  }

  function handleItemDraftChange(field, value) {
    setItemDraft((current) => ({ ...current, [field]: value }));
  }

  function handleLocationDraftChange(field, value) {
    setLocationDraft((current) => ({ ...current, [field]: value }));
  }

  function handleServiceTypeDraftChange(field, value) {
    setServiceTypeDraft((current) => ({ ...current, [field]: value }));
  }

  function handleOpenCategoryModal() {
    setCategoryDraft({
      id: null,
      name: "",
      description: "",
    });
    setCategoryModalOpen(true);
  }

  function handleEditCategory(category) {
    setCategoryDraft({
      id: category.id,
      name: category.name,
      description: category.description || "",
    });
    setCategoryModalOpen(true);
  }

  function handleCloseCategoryModal() {
    setCategoryModalOpen(false);
    setCategoryDraft({
      id: null,
      name: "",
      description: "",
    });
  }

  function handleOpenItemModal() {
    setItemDraft(createEmptyItemDraft());
    setItemModalOpen(true);
  }

  function handleEditItem(item) {
    setItemDraft({
      id: item.id,
      name: item.name,
      price: item.price ?? "",
      inventory_quantity: item.inventory_quantity ?? "",
    });
    setItemModalOpen(true);
  }

  function handleCloseItemModal() {
    setItemModalOpen(false);
    setItemDraft(createEmptyItemDraft());
  }

  function handleOpenLocationModal() {
    setLocationDraft(createEmptyLocationDraft());
    setLocationModalOpen(true);
  }

  function handleEditLocation(location) {
    setLocationDraft({
      id: location.id,
      name: location.name || "",
      description: location.description || "",
      site: location.site || "",
      room: location.room || "",
    });
    setLocationModalOpen(true);
  }

  function handleCloseLocationModal() {
    setLocationModalOpen(false);
    setLocationDraft(createEmptyLocationDraft());
  }

  async function handleSaveCategory() {
    const name = categoryDraft.name.trim();
    const description = categoryDraft.description.trim();

    if (!name) {
      showNotification("Enter a category name before saving.", "error");
      return;
    }

    try {
      const existing = categories.find((category) => category.name.toLowerCase() === name.toLowerCase());
      const targetCategory =
        categories.find((category) => category.id === categoryDraft.id) ??
        (existing && existing.id !== categoryDraft.id ? existing : null);
      const savedCategory = targetCategory
        ? await moduleApi.updateCategory(targetCategory.id, {
          name,
          description: description || targetCategory.description,
          is_active: true,
        })
        : await moduleApi.createCategory({
          name,
          description,
          is_active: true,
        });

      setCategories((current) => {
        const nextCategories = targetCategory
          ? current.map((category) => (category.id === savedCategory.id ? savedCategory : category))
          : [...current, savedCategory];
        return [...nextCategories].sort((left, right) => left.name.localeCompare(right.name));
      });
      handleCloseCategoryModal();
      setActionMessage(`${savedCategory.name} is ready for asset and schedule dropdowns.`);
      showNotification(
        targetCategory
          ? "Category updated successfully."
          : existing
            ? "Category reactivated successfully."
            : "Category added successfully.",
      );
    } catch (err) {
      const failureMessage = `Could not save category: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteCategory(category) {
    try {
      await moduleApi.deleteCategory(category.id);
      const nextCategories = categories.filter((item) => item.id !== category.id);
      setCategories(nextCategories);

      if (assetDraft.category_name === category.name) {
        setAssetDraft((current) => ({
          ...current,
          category_name: nextCategories.find((item) => item.is_active !== false)?.name || "",
        }));
      }

      if (scheduleDraft.category === category.name) {
        setScheduleDraft((current) => ({ ...current, category: "" }));
      }

      if (scheduleFilters.category === category.name) {
        setScheduleFilters((current) => ({ ...current, category: "All Assets" }));
      }

      if (categoryDraft.id === category.id) {
        handleCloseCategoryModal();
      }

      setActionMessage(`${category.name} deleted successfully.`);
      showNotification("Category deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete category: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleSaveItem() {
    const name = itemDraft.name.trim();
    const price = Number(itemDraft.price);
    const inventoryQuantity = Number(itemDraft.inventory_quantity);

    if (!name) {
      showNotification("Enter an item name before saving.", "error");
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      showNotification("Enter a valid item price.", "error");
      return;
    }

    if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) {
      showNotification("Enter a valid inventory quantity.", "error");
      return;
    }

    try {
      const savedItem = itemDraft.id
        ? await moduleApi.updateItem(itemDraft.id, {
          name,
          price,
          inventory_quantity: inventoryQuantity,
        })
        : await moduleApi.createItem({
          name,
          price,
          inventory_quantity: inventoryQuantity,
        });

      setItems((current) => {
        const nextItems = itemDraft.id
          ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
          : [...current, savedItem];
        return [...nextItems].sort((left, right) => left.name.localeCompare(right.name));
      });
      handleCloseItemModal();
      setActionMessage(`${savedItem.name} saved in settings inventory.`);
      showNotification(itemDraft.id ? "Item updated successfully." : "Item added successfully.");
    } catch (err) {
      const failureMessage = `Could not save item: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteItem(item) {
    try {
      await moduleApi.deleteItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (itemDraft.id === item.id) {
        handleCloseItemModal();
      }
      setActionMessage(`${item.name} deleted successfully.`);
      showNotification("Item deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete item: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleSaveLocation() {
    const name = locationDraft.name.trim();
    const description = locationDraft.description.trim();
    const site = locationDraft.site.trim();
    const room = locationDraft.room.trim();

    if (!name) {
      showNotification("Enter a station name before saving.", "error");
      return;
    }

    try {
      const existing = locations.find((location) => location.name.toLowerCase() === name.toLowerCase());
      const targetLocation =
        locations.find((location) => location.id === locationDraft.id) ??
        (existing && existing.id !== locationDraft.id ? existing : null);
      const payload = {
        name,
        description,
        site,
        room,
      };
      const savedLocation = targetLocation
        ? await moduleApi.updateLocation(targetLocation.id, payload)
        : await moduleApi.createLocation(payload);

      setLocations((current) => {
        const nextLocations = targetLocation
          ? current.map((location) => (location.id === savedLocation.id ? savedLocation : location))
          : [...current, savedLocation];
        return [...nextLocations].sort((left, right) => left.name.localeCompare(right.name));
      });
      setAssets((current) =>
        current.map((asset) =>
          asset.location === savedLocation.id
            ? { ...asset, location_name: savedLocation.name }
            : asset,
        ),
      );
      setAssetDraft((current) =>
        current.location_name && current.location_name.toLowerCase() === name.toLowerCase()
          ? { ...current, location_name: savedLocation.name }
          : current,
      );
      setSelectedLocation((current) => {
        if (!targetLocation || current !== targetLocation.name) {
          return current;
        }
        return savedLocation.name;
      });
      handleCloseLocationModal();
      setActionMessage(`${savedLocation.name} is ready for asset location dropdowns.`);
      showNotification(targetLocation ? "Station updated successfully." : "Station added successfully.");
    } catch (err) {
      const failureMessage = `Could not save station: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteLocation(location) {
    try {
      await moduleApi.deleteLocation(location.id);
      setLocations((current) => current.filter((entry) => entry.id !== location.id));
      setAssets((current) =>
        current.map((asset) =>
          asset.location === location.id
            ? { ...asset, location: null, location_name: "" }
            : asset,
        ),
      );
      if (locationDraft.id === location.id) {
        handleCloseLocationModal();
      }
      if (assetDraft.location_name === location.name) {
        setAssetDraft((current) => ({ ...current, location_name: "" }));
      }
      if (selectedLocation === location.name) {
        setSelectedLocation("");
      }
      setActionMessage(`${location.name} deleted successfully.`);
      showNotification("Station deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete station: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function handleOpenServiceTypeModal() {
    setServiceTypeDraft(createEmptyServiceTypeDraft());
    setServiceTypeModalOpen(true);
  }

  function handleEditServiceType(serviceType) {
    setServiceTypeDraft({
      id: serviceType.id,
      name: serviceType.name,
      description: serviceType.description || "",
      interval_days: serviceType.interval_days ?? "",
    });
    setServiceTypeModalOpen(true);
  }

  function handleCloseServiceTypeModal() {
    setServiceTypeModalOpen(false);
    setServiceTypeDraft(createEmptyServiceTypeDraft());
  }

  async function handleSaveServiceType() {
    const name = normalizeServiceTypeName(serviceTypeDraft.name.trim());
    const description = serviceTypeDraft.description.trim();
    const intervalDays = Number(serviceTypeDraft.interval_days);

    if (!name) {
      showNotification("Enter a service type name before saving.", "error");
      return;
    }

    if (!Number.isInteger(intervalDays) || intervalDays < 0) {
      showNotification("Enter a valid interval in days.", "error");
      return;
    }

    try {
      const existing = serviceTypes.find((serviceType) => serviceTypeMatchKey(serviceType.name) === serviceTypeMatchKey(name));
      const targetServiceType =
        serviceTypes.find((serviceType) => serviceType.id === serviceTypeDraft.id) ??
        (existing && existing.id !== serviceTypeDraft.id ? existing : null);
      const savedServiceType = targetServiceType
        ? await moduleApi.updateServiceType(targetServiceType.id, {
          name,
          description: description || targetServiceType.description,
          interval_days: intervalDays,
          is_active: true,
        })
        : await moduleApi.createServiceType({
          name,
          description,
          interval_days: intervalDays,
          is_active: true,
        });

      setServiceTypes((current) => {
        const nextServiceTypes = targetServiceType
          ? current.map((serviceType) => (serviceType.id === savedServiceType.id ? savedServiceType : serviceType))
          : [...current, savedServiceType];
        return [...nextServiceTypes].sort((left, right) => left.name.localeCompare(right.name));
      });
      handleCloseServiceTypeModal();
      setActionMessage(`${savedServiceType.name} is ready for schedule dropdowns.`);
      showNotification(
        targetServiceType
          ? "Service type updated successfully."
          : existing
            ? "Service type reactivated successfully."
            : "Service type added successfully.",
      );
    } catch (err) {
      const failureMessage = `Could not save service type: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteServiceType(serviceType) {
    try {
      await moduleApi.deleteServiceType(serviceType.id);
      const nextServiceTypes = serviceTypes.filter((entry) => entry.id !== serviceType.id);
      setServiceTypes(nextServiceTypes);
      if (serviceTypeMatchKey(scheduleDraft.serviceType) === serviceTypeMatchKey(serviceType.name)) {
        setScheduleDraft((current) => ({ ...current, serviceType: "" }));
      }
      if (serviceTypeDraft.id === serviceType.id) {
        handleCloseServiceTypeModal();
      }
      setActionMessage(`${serviceType.name} deleted successfully.`);
      showNotification("Service type deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete service type: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function isPersistedRegularInspectionRowId(rowId) {
    return Number.isFinite(Number(rowId));
  }

  async function handleAddRegularInspectionRow() {
    if (!regularInspectionDbReady) {
      setRegularInspectionList((current) => [
        ...current,
        {
          id: `reg-${Date.now()}`,
          category: "",
          check_item: "",
          standard: "",
          sort_order: current.length + 1,
        },
      ]);
      showNotification("Checklist row added locally. Apply backend migrations to persist these rows.", "warning");
      return;
    }

    try {
      const nextSortOrder = regularInspectionList.length + 1;
      const defaultCategory = "General";
      const defaultCheckItem = `Checklist Item ${nextSortOrder}`;
      const createdRow = await moduleApi.createRegularInspectionItem({
        category: defaultCategory,
        check_item: defaultCheckItem,
        standard: "OK",
        sort_order: nextSortOrder,
        is_active: true,
      });
      setRegularInspectionList((current) => [
        ...current,
        {
          id: createdRow.id,
          category: String(createdRow.category || defaultCategory),
          check_item: String(createdRow.check_item || defaultCheckItem),
          standard: String(createdRow.standard || "OK"),
          sort_order: Number(createdRow.sort_order ?? nextSortOrder),
        },
      ]);
      showNotification("Checklist row added successfully.");
    } catch (err) {
      const failureMessage = `Could not add checklist row: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleUpdateRegularInspectionRow(rowId, field, value) {
    if (!regularInspectionDbReady || !isPersistedRegularInspectionRowId(rowId)) {
      setRegularInspectionList((current) =>
        current.map((entry) => (entry.id === rowId ? { ...entry, [field]: value } : entry)),
      );
      return;
    }

    const previous = regularInspectionList;
    setRegularInspectionList((current) =>
      current.map((entry) => (entry.id === rowId ? { ...entry, [field]: value } : entry)),
    );
    try {
      await moduleApi.updateRegularInspectionItem(rowId, { [field]: value });
    } catch (err) {
      setRegularInspectionList(previous);
      const failureMessage = `Could not update checklist row: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteRegularInspectionRow(rowId) {
    if (!regularInspectionDbReady || !isPersistedRegularInspectionRowId(rowId)) {
      setRegularInspectionList((current) => current.filter((entry) => entry.id !== rowId));
      return;
    }

    const previous = regularInspectionList;
    setRegularInspectionList((current) => current.filter((entry) => entry.id !== rowId));
    try {
      await moduleApi.deleteRegularInspectionItem(rowId);
      showNotification("Checklist row deleted successfully.");
    } catch (err) {
      setRegularInspectionList(previous);
      const failureMessage = `Could not delete checklist row: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function handleEmployeeCategoryDraftChange(field, value) {
    setEmployeeCategoryDraft((current) => ({ ...current, [field]: value }));
  }

  function handleTeamMemberDraftChange(field, value) {
    setTeamMemberDraft((current) => ({ ...current, [field]: value }));
  }

  function handleOpenEmployeeCategoryModal() {
    setEmployeeCategoryDraft(createEmptyEmployeeCategoryDraft());
    setEmployeeCategoryModalOpen(true);
  }

  function handleEditEmployeeCategory(category) {
    setEmployeeCategoryDraft({
      id: category.id,
      name: category.name,
      description: category.description || "",
      is_active: category.is_active !== false,
    });
    setEmployeeCategoryModalOpen(true);
  }

  function handleCloseEmployeeCategoryModal() {
    setEmployeeCategoryModalOpen(false);
    setEmployeeCategoryDraft(createEmptyEmployeeCategoryDraft());
  }

  async function handleSaveEmployeeCategory() {
    const name = employeeCategoryDraft.name.trim();
    const description = employeeCategoryDraft.description.trim();

    if (!name) {
      showNotification("Enter an employee category name before saving.", "error");
      return;
    }

    try {
      const existing = employeeCategories.find((category) => category.name.toLowerCase() === name.toLowerCase());
      const targetCategory =
        employeeCategories.find((category) => category.id === employeeCategoryDraft.id) ??
        (existing && existing.id !== employeeCategoryDraft.id ? existing : null);
      const savedCategory = targetCategory
        ? await moduleApi.updateEmployeeCategory(targetCategory.id, {
          name,
          description: description || targetCategory.description,
          is_active: true,
        })
        : await moduleApi.createEmployeeCategory({
          name,
          description,
          is_active: true,
        });

      setEmployeeCategories((current) => {
        const nextCategories = targetCategory
          ? current.map((category) => (category.id === savedCategory.id ? savedCategory : category))
          : [...current, savedCategory];
        return [...nextCategories].sort((left, right) => left.name.localeCompare(right.name));
      });
      handleCloseEmployeeCategoryModal();
      setActionMessage(`${savedCategory.name} is ready for team member dropdowns.`);
      showNotification(
        targetCategory
          ? "Employee category updated successfully."
          : existing
            ? "Employee category reactivated successfully."
            : "Employee category added successfully.",
      );
    } catch (err) {
      const failureMessage = `Could not save employee category: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteEmployeeCategory(category) {
    try {
      await moduleApi.deleteEmployeeCategory(category.id);
      const nextCategories = employeeCategories.filter((item) => item.id !== category.id);
      setEmployeeCategories(nextCategories);

      if (String(teamMemberDraft.employee_category) === String(category.id)) {
        setTeamMemberDraft((current) => ({ ...current, employee_category: "" }));
      }

      if (employeeCategoryDraft.id === category.id) {
        handleCloseEmployeeCategoryModal();
      }

      setActionMessage(`${category.name} deleted successfully.`);
      showNotification("Employee category deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete employee category: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleToggleEmployeeCategory(category) {
    try {
      const savedCategory = await moduleApi.updateEmployeeCategory(category.id, { is_active: !category.is_active });
      const nextCategories = employeeCategories.map((item) => (item.id === savedCategory.id ? savedCategory : item));
      setEmployeeCategories(nextCategories);
      const successMessage = `${savedCategory.name} marked as ${savedCategory.is_active ? "active" : "inactive"}.`;
      setActionMessage(successMessage);
      showNotification(successMessage);
    } catch (err) {
      const failureMessage = `Could not update employee category: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function handleOpenTeamMemberModal() {
    setTeamMemberDraft(createEmptyTeamMemberDraft());
    setTeamMemberModalOpen(true);
  }

  function handleEditTeamMember(member) {
    setTeamMemberDraft({
      id: member.id,
      name: member.name,
      serial_number: member.serial_number,
      employee_category: String(member.employee_category ?? ""),
      designation: member.designation || "",
      is_active: member.is_active !== false,
    });
    setTeamMemberModalOpen(true);
  }

  function handleCloseTeamMemberModal() {
    setTeamMemberModalOpen(false);
    setTeamMemberDraft(createEmptyTeamMemberDraft());
  }

  async function handleSaveTeamMember() {
    const name = teamMemberDraft.name.trim();
    const serialNumber = teamMemberDraft.serial_number.trim();
    const designation = teamMemberDraft.designation.trim();
    const employeeCategoryId = Number(teamMemberDraft.employee_category);

    if (!name) {
      showNotification("Enter a team member name before saving.", "error");
      return;
    }

    if (!serialNumber) {
      showNotification("Enter a serial number before saving.", "error");
      return;
    }

    if (!Number.isInteger(employeeCategoryId) || employeeCategoryId <= 0) {
      showNotification("Choose an employee category before saving.", "error");
      return;
    }

    try {
      const payload = {
        name,
        serial_number: serialNumber,
        employee_category: employeeCategoryId,
        designation,
        is_active: Boolean(teamMemberDraft.is_active),
      };
      const savedMember = teamMemberDraft.id
        ? await moduleApi.updateTeamMember(teamMemberDraft.id, payload)
        : await moduleApi.createTeamMember(payload);

      setTeamMembers((current) => {
        const nextMembers = teamMemberDraft.id
          ? current.map((member) => (member.id === savedMember.id ? savedMember : member))
          : [...current, savedMember];
        return [...nextMembers].sort((left, right) => left.name.localeCompare(right.name));
      });
      handleCloseTeamMemberModal();
      setActionMessage(`${savedMember.name} saved to the team roster.`);
      showNotification(teamMemberDraft.id ? "Team member updated successfully." : "Team member added successfully.");
    } catch (err) {
      const failureMessage = `Could not save team member: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleDeleteTeamMember(member) {
    try {
      await moduleApi.deleteTeamMember(member.id);
      setTeamMembers((current) => current.filter((entry) => entry.id !== member.id));
      if (teamMemberDraft.id === member.id) {
        handleCloseTeamMemberModal();
      }
      setActionMessage(`${member.name} deleted successfully.`);
      showNotification("Team member deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete team member: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleToggleTeamMember(member) {
    try {
      const savedMember = await moduleApi.updateTeamMember(member.id, { is_active: !member.is_active });
      setTeamMembers((current) => current.map((entry) => (entry.id === savedMember.id ? savedMember : entry)));
      const successMessage = `${savedMember.name} marked as ${savedMember.is_active ? "active" : "inactive"}.`;
      setActionMessage(successMessage);
      showNotification(successMessage);
    } catch (err) {
      const failureMessage = `Could not update team member: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  async function handleToggleCategory(category) {
    try {
      const savedCategory = await moduleApi.updateCategory(category.id, { is_active: !category.is_active });
      const nextCategories = categories.map((item) => (item.id === savedCategory.id ? savedCategory : item));
      setCategories(nextCategories);

      if (category.is_active && assetDraft.category_name === category.name) {
        const nextDefaultCategory = nextCategories.find((item) => item.is_active !== false)?.name || "";
        setAssetDraft((current) => ({ ...current, category_name: nextDefaultCategory }));
      }

      if (category.is_active && scheduleDraft.category === category.name) {
        setScheduleDraft((current) => ({ ...current, category: "" }));
      }

      if (category.is_active && scheduleFilters.category === category.name) {
        setScheduleFilters((current) => ({ ...current, category: "All Assets" }));
      }

      const successMessage = `${savedCategory.name} marked as ${savedCategory.is_active ? "active" : "inactive"}.`;
      setActionMessage(successMessage);
      showNotification(successMessage);
    } catch (err) {
      const failureMessage = `Could not update category: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function handleOpenScheduleModal(processType = "maintenance") {
    setScheduleDraft(createEmptyScheduleDraft(processType));
    setScheduleModalOpen(true);
  }

  function handleCloseScheduleModal() {
    setScheduleModalOpen(false);
    setScheduleDraft(createEmptyScheduleDraft());
  }

  function handleEditScheduleTask(task) {
    setScheduleDraft({
      ...task,
      serviceType: task.serviceType ?? "",
      progress: task.progress ?? 0,
      lastServiceDate: findLatestCompletedServiceDate(
        expenses,
        completedTasks,
        task.assetTag,
        task.serviceType || task.title,
        task.id,
        task.assetName,
      ),
      inspectionRequired: task.inspectionRequired ?? true,
      inspectionComment: task.inspectionComment ?? "",
      meterReading: task.meterReading ?? "",
      consumedItemId: task.consumedItemId ?? null,
      consumedItemName: task.consumedItemName ?? "",
      consumedQuantity: task.consumedQuantity ?? 1,
      inventoryApplied: task.inventoryApplied ?? false,
      processType: task.processType || "maintenance",
    });
    setScheduleModalOpen(true);
  }

  async function handleUpdateScheduleTask(taskId, updates) {
    const currentTask = scheduleTasks.find((task) => task.id === taskId);
    if (!currentTask) {
      return;
    }

    try {
      const updatedTask = normalizeScheduleTask({
        ...currentTask,
        ...updates,
      });
      const savedTask = await persistScheduleTask(updatedTask);
      setScheduleTasks((current) => dedupeTasks(current.map((task) => (task.id === taskId ? savedTask : task))));
    } catch (err) {
      showNotification(err.message || "Could not update task.", "error");
    }
  }

  function handleMonthlyMaintenanceDraftChange(assetTag, field, value) {
    setMonthlyMaintenanceDraftsByPlan((current) => {
      const currentPlan = current[monthlyMaintenancePlanKey] || {};
      const existingDraft =
        currentPlan[assetTag] ||
        createMonthlyMaintenanceDraft(
          availableVehicleAssets.find((asset) => asset.asset_tag === assetTag) || { asset_tag: assetTag, name: assetTag },
          monthlyMaintenanceMonth,
          serviceTypes,
        );
      let nextDraft = {
        ...existingDraft,
        [field]: value,
      };

      if (field === "consumedItemId") {
        const matchedItem = items.find((item) => String(item.id) === String(value));
        nextDraft = {
          ...nextDraft,
          consumedItemId: value,
          consumedItemName: matchedItem?.name || "",
        };
      }

      return {
        ...current,
        [monthlyMaintenancePlanKey]: {
          ...currentPlan,
          [assetTag]: nextDraft,
        },
      };
    });
  }

  async function handleCreateMonthlyMaintenanceTasks() {
    const rowsToCreate = monthlyMaintenanceRows.filter(({ draft }) => draft.enabled !== false);
    if (rowsToCreate.length === 0) {
      showNotification("Select at least one vehicle row before creating monthly tasks.", "error");
      return;
    }

    const monthWindow = monthRange(monthlyMaintenanceMonth);
    const createdTasks = [];
    const skippedMessages = [];

    setMonthlyMaintenanceSaving(true);
    try {
      for (const { asset, draft } of rowsToCreate) {
        if (!draft.serviceType.trim()) {
          skippedMessages.push(`${asset.asset_tag || asset.name}: service type is required.`);
          continue;
        }

        if (!draft.dueDate) {
          skippedMessages.push(`${asset.asset_tag || asset.name}: due date is required.`);
          continue;
        }

        if (draft.dueDate < monthWindow.start || draft.dueDate > monthWindow.end) {
          skippedMessages.push(`${asset.asset_tag || asset.name}: due date must stay within ${monthlyMaintenanceMonth}.`);
          continue;
        }

        const duplicateTask = scheduleTasks.find(
          (task) =>
            buildTaskIdentity({
              processType: "maintenance",
              serviceType: draft.serviceType,
              assetTag: asset.asset_tag,
            }) === buildTaskIdentity(task),
        );
        if (duplicateTask) {
          skippedMessages.push(`${asset.asset_tag || asset.name}: an active task for this service already exists.`);
          continue;
        }

        const taskDetails = resolveTaskAssetDetails(assets, asset.asset_tag, {
          assetName: asset.name,
          category: asset.category_name,
        });
        const lastService = findLatestCompletedServiceDate(
          expenses,
          completedTasks,
          asset.asset_tag,
          draft.serviceType,
          "",
          taskDetails.assetName,
        );
        const serviceIntervalDays = getServiceTypeIntervalDays(serviceTypes, draft.serviceType);
        if (lastService && serviceIntervalDays > 0) {
          const earliestAllowed = new Date(lastService);
          earliestAllowed.setDate(earliestAllowed.getDate() + serviceIntervalDays);
          const plannedDate = new Date(draft.dueDate);
          if (plannedDate < earliestAllowed) {
            skippedMessages.push(
              `${asset.asset_tag || asset.name}: ${draft.serviceType} cannot be planned before ${formatDate(earliestAllowed.toISOString())}.`,
            );
            continue;
          }
        }

        let payload = normalizeNoConsumptionTask({
          id: `monthly-${asset.asset_tag}-${draft.dueDate}`,
          title: draft.title?.trim() || `Monthly Maintenance Check - ${asset.asset_tag || asset.name}`,
          assetTag: asset.asset_tag || "",
          assetName: taskDetails.assetName,
          category: taskDetails.category || asset.category_name || "",
          serviceType: draft.serviceType.trim(),
          assignee: draft.assignee || "",
          assignedAt: new Date().toISOString(),
          dueDate: draft.dueDate,
          risk: draft.risk || "Medium",
          stage: "planned",
          processType: "maintenance",
          progress: stageProgress("planned"),
          inspectionRequired: true,
          inspectionComment: "",
          meterReading: "",
          lastServiceDate: lastService,
          consumedItemId: draft.consumedItemId ? Number(draft.consumedItemId) : null,
          consumedItemName: draft.consumedItemName || "",
          consumedQuantity: Math.max(1, Number(draft.consumedQuantity) || 1),
          inventoryApplied: false,
        });

        const normalizedTask = markTaskAsJustCreated(await persistScheduleTask(payload));
        createdTasks.push(normalizedTask);
      }

      if (createdTasks.length > 0) {
        setScheduleTasks((current) => dedupeTasks([...createdTasks, ...current]));
      }

      if (createdTasks.length === 0) {
        throw new Error(skippedMessages[0] || "No monthly maintenance tasks could be created.");
      }

      setActionMessage(
        `${createdTasks.length} monthly maintenance task${createdTasks.length === 1 ? "" : "s"} created for ${monthlyMaintenancePurchaseSummary.monthLabel}.`,
      );
      showNotification(
        skippedMessages.length > 0
          ? `${createdTasks.length} task${createdTasks.length === 1 ? "" : "s"} scheduled. ${skippedMessages.length} row${skippedMessages.length === 1 ? "" : "s"} skipped.`
          : `${createdTasks.length} monthly maintenance task${createdTasks.length === 1 ? "" : "s"} scheduled successfully.`,
      );
    } catch (err) {
      showNotification(err.message || "Could not create monthly maintenance tasks.", "error");
    } finally {
      setMonthlyMaintenanceSaving(false);
    }
  }

  async function handleCreateBulkMaintenanceSchedule(plan) {
    const startDate = String(plan?.startDate || "");
    const endDate = String(plan?.endDate || "");
    const datePlans = Array.isArray(plan?.datePlans) ? plan.datePlans : [];
    const todayDateKey = todayInputValue();

    if (!startDate || !endDate) {
      showNotification("Select a valid date range before creating maintenance schedule tasks.", "error");
      return;
    }

    if (startDate < todayDateKey) {
      showNotification("Start date cannot be in the past. Select today or a future date.", "error");
      return;
    }

    if (startDate > endDate) {
      showNotification("Date range start must be before or equal to date range end.", "error");
      return;
    }

    if (datePlans.length === 0) {
      showNotification("No date-wise plan found. Configure at least one date plan first.", "error");
      return;
    }

    const createdTasks = [];
    const skippedMessages = [];

    setMonthlyMaintenanceSaving(true);
    try {
      for (const datePlan of datePlans) {
        const dueDate = String(datePlan?.date || "");
        const datePlanAssignees = Array.isArray(datePlan?.assignees)
          ? datePlan.assignees.map((value) => String(value || "").trim()).filter(Boolean)
          : String(datePlan?.assignee || "").trim()
            ? [String(datePlan.assignee || "").trim()]
            : [];
        if (dueDate && dueDate < todayDateKey) {
          skippedMessages.push(`${formatCompactDate(dueDate)}: backdated schedule is not allowed.`);
          continue;
        }
        if (!dueDate || dueDate < startDate || dueDate > endDate) {
          skippedMessages.push(`${dueDate || "Unknown date"}: invalid date plan.`);
          continue;
        }
        const selectedVehicles = (datePlan?.vehicles || []).filter((entry) => entry.include !== false);
        const selectedServiceTypes = (datePlan?.serviceTypes || []).map((value) => String(value || "").trim()).filter(Boolean);
        const selectedInventories = (datePlan?.inventories || [])
          .map((entry) => ({
            id: entry.id,
            name: entry.name,
            quantity: Math.max(0, Number(entry.quantity) || 0),
          }))
          .filter((entry) => entry.quantity > 0);

        if (selectedVehicles.length === 0 || selectedServiceTypes.length === 0) {
          skippedMessages.push(`${formatCompactDate(dueDate)}: no vehicles or services selected.`);
          continue;
        }

        const datePlanDraftTasks = [];
        for (const vehicleEntry of selectedVehicles) {
          const asset = vehicleEntry.asset;
          for (const serviceType of selectedServiceTypes) {
            const duplicateTask = [...scheduleTasks, ...createdTasks].find(
              (task) =>
                buildTaskIdentity({
                  processType: "maintenance",
                  serviceType,
                  assetTag: asset.asset_tag,
                }) === buildTaskIdentity(task),
            );
            if (duplicateTask) {
              skippedMessages.push(`${asset.asset_tag || asset.name} (${formatCompactDate(dueDate)}): active ${serviceType} task already exists.`);
              continue;
            }

            const taskDetails = resolveTaskAssetDetails(assets, asset.asset_tag, {
              category: asset.category_name || "Vehicle",
              assetName: asset.name,
            });
            const draftTask = normalizeNoConsumptionTask({
              id: `bulk-${dueDate}-${Date.now()}-${createdTasks.length + datePlanDraftTasks.length + 1}`,
              title: `${serviceType} - ${asset.asset_tag || asset.name}`,
              assetId: asset.id ?? null,
              assetTag: asset.asset_tag || "",
              assetName: taskDetails.assetName || asset.name || "",
              category: taskDetails.category || asset.category_name || "Vehicle",
              serviceType,
              assignee: "",
              assignedAt: new Date().toISOString(),
              dueDate,
              risk: "Medium",
              stage: "planned",
              processType: "maintenance",
              progress: stageProgress("planned"),
              inspectionRequired: true,
              inspectionComment: "",
              meterReading: "",
              lastServiceDate: findLatestCompletedServiceDate(
                expenses,
                completedTasks,
                asset.asset_tag || "",
                serviceType,
                "",
                taskDetails.assetName || asset.name || "",
              ),
              consumedItemId: null,
              consumedItemName: datePlan?.inventoryNotes || "",
              consumedQuantity: 1,
              inventoryApplied: false,
              completedAt: "",
              createdAt: "",
              updatedAt: "",
            });
            datePlanDraftTasks.push(draftTask);
          }
        }

        if (datePlanAssignees.length > 0) {
          datePlanDraftTasks.forEach((draftTask, index) => {
            draftTask.assignee = datePlanAssignees[index % datePlanAssignees.length];
          });
        }

        if (datePlanDraftTasks.length > 0 && selectedInventories.length > datePlanDraftTasks.length) {
          skippedMessages.push(
            `${formatCompactDate(dueDate)}: ${selectedInventories.length - datePlanDraftTasks.length} inventory line(s) could not be assigned because there are fewer generated tasks than inventory selections.`,
          );
        }

        datePlanDraftTasks.forEach((draftTask, index) => {
          const inventorySelection = selectedInventories[index] || null;
          if (!inventorySelection) {
            return;
          }
          draftTask.consumedItemId = inventorySelection.id ?? null;
          draftTask.consumedItemName = inventorySelection.name || "";
          draftTask.consumedQuantity = Math.max(1, Number(inventorySelection.quantity) || 1);
        });

        for (const draftTask of datePlanDraftTasks) {
          const savedTask = markTaskAsJustCreated(await persistScheduleTask(draftTask));
          createdTasks.push(savedTask);
        }
      }

      if (createdTasks.length === 0) {
        throw new Error(skippedMessages[0] || "No maintenance schedule tasks could be created.");
      }

      setScheduleTasks((current) => dedupeTasks([...createdTasks, ...current]));
      if (typeof plan?.onSuccess === "function") {
        plan.onSuccess();
      }

      setActionMessage(`${createdTasks.length} maintenance schedule task${createdTasks.length === 1 ? "" : "s"} created.`);
      showNotification(
        skippedMessages.length
          ? `${createdTasks.length} task${createdTasks.length === 1 ? "" : "s"} created. ${skippedMessages.length} skipped.`
          : `${createdTasks.length} maintenance schedule task${createdTasks.length === 1 ? "" : "s"} created successfully.`,
        skippedMessages.length ? "warning" : "success",
      );
    } catch (err) {
      showNotification(err.message || "Could not create maintenance schedule tasks.", "error");
    } finally {
      setMonthlyMaintenanceSaving(false);
    }
  }

  function handleFuelDemandDraftChange(index, field, value) {
    setFuelDemandDraft((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleAddFuelDemandDraft() {
    setFuelDemandDraft((current) => [...current, createEmptyFuelDemandDraft()]);
  }

  function handleRemoveFuelDemandDraft(index) {
    setFuelDemandDraft((current) => current.filter((_, i) => i !== index));
  }

  function handleFuelAllocationDecision(demandId, decision) {
    setFuelAllocationDrafts((current) => ({
      ...current,
      [demandId]: {
        ...(current[demandId] || {}),
        inspectionDecision: decision,
      },
    }));
  }

  async function handleSaveFuelDemand() {
    if (!fuelDemandDraft || fuelDemandDraft.length === 0) {
      showNotification("Please add at least one fuel demand before saving.", "error");
      return;
    }

    const validDemands = [];

    for (let i = 0; i < fuelDemandDraft.length; i++) {
      const draft = fuelDemandDraft[i];
      if (!draft.assetTag) {
        showNotification(`Row ${i + 1}: Select a vehicle asset.`, "error");
        return;
      }
      if (!draft.fuelItemId) {
        showNotification(`Row ${i + 1}: Select a fuel item.`, "error");
        return;
      }
      const liters = Number(draft.liters || 0);
      const meterReading = Number(draft.meterReading || 0);
      if (liters <= 0) {
        showNotification(`Row ${i + 1}: Enter liters greater than zero.`, "error");
        return;
      }
      if (meterReading < 0) {
        showNotification(`Row ${i + 1}: Meter reading must be zero or greater.`, "error");
        return;
      }
      const selectedItem = items.find((item) => String(item.id) === String(draft.fuelItemId));
      if (!selectedItem) {
        showNotification(`Row ${i + 1}: The selected fuel item could not be found.`, "error");
        return;
      }
      
      validDemands.push({ draft, selectedItem, liters, meterReading });
    }

    // Check inventory quantities across all drafts
    const inventoryDemand = new Map();
    for (const { draft, liters, selectedItem } of validDemands) {
      const key = String(selectedItem.id);
      inventoryDemand.set(key, (inventoryDemand.get(key) || 0) + liters);
    }

    for (const [itemId, requestedQty] of inventoryDemand.entries()) {
      const item = items.find((i) => String(i.id) === itemId);
      if (item && Number(item.inventory_quantity || 0) < requestedQty) {
        showNotification(
          `Only ${formatQuantity(item.inventory_quantity)} liters of ${item.name} are available, but ${formatQuantity(requestedQty)} liters are requested across all rows.`,
          "error"
        );
        return;
      }
    }

    try {
      const newDemands = await Promise.all(
        validDemands.map(async ({ draft, liters, meterReading }) => {
          const selectedAsset = assets.find((asset) => asset.asset_tag === draft.assetTag);
          return normalizeFuelDemand(
            await moduleApi.createFuelDemand({
              asset_tag: draft.assetTag,
              asset_name: selectedAsset?.name || "",
              request_date: draft.requestDate || todayInputValue(),
              station: draft.station || "",
              fuel_item: Number(draft.fuelItemId),
              liters,
              meter_reading: meterReading,
              notes: draft.notes.trim(),
            })
          );
        })
      );

      setFuelDemands((current) => [...newDemands, ...current]);
      setFuelDemandDraft([createEmptyFuelDemandDraft()]);
      setFuelTab("allocate");
      showNotification(`${newDemands.length} fuel demand(s) saved. Inspector can now approve or reject them.`);
    } catch (err) {
      showNotification(err.message || "Could not save fuel demands.", "error");
    }
  }

  async function handleAllocateFuelDemand(entry) {
    if (entry._mode === "approve") {
      const inspectionDecision = fuelAllocationDrafts[entry.id]?.inspectionDecision;
      if (inspectionDecision !== "accepted") {
        showNotification("Accept the inspection before approving fuel demand.", "error");
        return;
      }
      try {
        const updatedEntry = normalizeFuelDemand(await moduleApi.approveFuelDemand(entry.id, {}));
        setFuelDemands((current) => current.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)));
        setFuelAllocationDrafts((current) => {
          const next = { ...current };
          delete next[entry.id];
          return next;
        });
        showNotification("Fuel demand approved. Fuel Provider can now fulfill it.");
      } catch (err) {
        showNotification(err.message || "Could not approve fuel demand.", "error");
      }
      return;
    }

    if (entry.status !== "approved") {
      showNotification("Fuel demand must be approved before fulfillment.", "error");
      return;
    }

    const inspectionDecision = fuelAllocationDrafts[entry.id]?.inspectionDecision;
    if (inspectionDecision && inspectionDecision !== "accepted") {
      showNotification("This demand is not marked approved for fulfillment.", "error");
      return;
    }

    try {
      const updatedEntry = normalizeFuelDemand(
        await moduleApi.allocateFuelDemand(entry.id, {
        }),
      );
      setFuelDemands((current) => current.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)));
      setFuelAllocationDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });

      const [freshItems, freshExpenses] = await Promise.all([
        moduleApi.listItems(),
        moduleApi.listExpenses(),
      ]);
      setItems(normalizeList(freshItems));
      setExpenses(normalizeList(freshExpenses));
      showNotification("Fuel demand fulfilled successfully and reflected in expenses.");
    } catch (err) {
      showNotification(err.message || "Could not fulfill fuel demand.", "error");
    }
  }

  async function handleDenyFuelDemand(entry) {
    const inspectionDecision = fuelAllocationDrafts[entry.id]?.inspectionDecision;
    if (inspectionDecision !== "denied") {
      showNotification("Choose Deny before rejecting this fuel demand.", "error");
      return;
    }

    try {
      const updatedEntry = normalizeFuelDemand(await moduleApi.denyFuelDemand(entry.id, {}));
      setFuelDemands((current) => current.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)));
      setFuelAllocationDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
      showNotification("Fuel demand rejected. No inventory or expense was consumed.");
    } catch (err) {
      showNotification(err.message || "Could not deny fuel demand.", "error");
    }
  }

  async function applyItemConsumption(task) {
    if (task.stage !== "completed" || task.inventoryApplied || !hasConsumedItem(task)) {
      return task;
    }

    const consumedQuantity = Math.max(1, Number(task.consumedQuantity) || 1);
    const matchedItem =
      items.find((item) => item.id === task.consumedItemId) ??
      items.find((item) => item.name === task.consumedItemName);

    if (!matchedItem) {
      throw new Error("The selected inventory item could not be found.");
    }

    const currentQuantity = Number(matchedItem.inventory_quantity ?? 0);
    if (currentQuantity < consumedQuantity) {
      throw new Error(`Only ${currentQuantity} units of ${matchedItem.name} are available in inventory.`);
    }

    const savedItem = await moduleApi.updateItem(matchedItem.id, {
      inventory_quantity: currentQuantity - consumedQuantity,
    });

    setItems((current) => current.map((item) => (item.id === savedItem.id ? savedItem : item)));

    return {
      ...task,
      consumedItemId: savedItem.id,
      consumedItemName: savedItem.name,
      consumedQuantity,
      inventoryApplied: true,
    };
  }

  async function persistExpenseRecord(task) {
    const existingExpense = expenses.find(
      (expense) => String(expense.task_reference) === String(task.id),
    );

    if (!hasConsumedItem(task)) {
      return existingExpense ?? null;
    }

    const matchedItem =
      items.find((item) => item.id === task.consumedItemId) ??
      items.find((item) => item.name === task.consumedItemName) ??
      null;
    const quantity = Math.max(1, Number(task.consumedQuantity) || 1);
    const unitPrice = Number(matchedItem?.price || 0);
    const totalCost = unitPrice * quantity;
    const payload = {
      task_reference: task.id,
      task_title: task.title,
      service_type: task.serviceType || "",
      asset_tag: task.assetTag || "",
      assignee: task.assignee || "",
      assigned_at: task.assignedAt || null,
      completed_at: task.completedAt || new Date().toISOString(),
      item: matchedItem?.id ?? null,
      item_name: matchedItem?.name || task.consumedItemName || "",
      quantity,
      unit_price: unitPrice,
      total_cost: totalCost,
    };

    const savedExpense = existingExpense
      ? await moduleApi.updateExpense(existingExpense.id, payload)
      : await moduleApi.createExpense(payload);

    setExpenses((current) => {
      const nextExpenses = existingExpense
        ? current.map((expense) => (expense.id === savedExpense.id ? savedExpense : expense))
        : [savedExpense, ...current];
      return nextExpenses;
    });
  }

  async function persistScheduleTask(task) {
    const payload = serializeScheduleTask(task);
    const taskId = String(task.id || "").trim();
    const isTempId = !taskId || taskId.startsWith("task-") || taskId.startsWith("gp-") || taskId.startsWith("bulk-") || taskId.startsWith("monthly-");
    const savedTask = isTempId
      ? await moduleApi.createScheduleTask(payload)
      : await moduleApi.updateScheduleTask(task.id, payload);
    const normalizedSavedTask = normalizeScheduleTask(savedTask);
    const apiReturnedProcessType = savedTask?.processType ?? savedTask?.process_type;
    if (!apiReturnedProcessType) {
      normalizedSavedTask.processType = task.processType || "maintenance";
    }
    return normalizedSavedTask;
  }

  async function handleSaveScheduleTask(taskOverride) {
    const rawDraft = taskOverride || scheduleDraft;
    const targetAssetTag = (rawDraft.assetTag || rawDraft.asset_tag || "").trim();
    const targetAssetName = (rawDraft.assetName || rawDraft.asset_name || "").trim();
    const targetTitle = (rawDraft.title || "").trim();
    const isEmergencyTask = (rawDraft.processType || rawDraft.process_type || "maintenance") === "emergency";
    let effectiveServiceType = (rawDraft.serviceType || rawDraft.service_type || "").trim();
    if (!effectiveServiceType) {
      effectiveServiceType = isEmergencyTask ? "Emergency Repair" : "General Maintenance";
    }

    if (!targetAssetTag && !targetAssetName) {
      showNotification("Select an asset tag before saving.", "error");
      return;
    }

    const draft = {
      ...rawDraft,
      assetTag: targetAssetTag || targetAssetName,
      assetName: targetAssetName || targetAssetTag,
      title: targetTitle || `${effectiveServiceType} of ${targetAssetName || targetAssetTag}`,
      serviceType: effectiveServiceType,
      service_type: effectiveServiceType,
      processType: isEmergencyTask ? "emergency" : "maintenance",
      stage: rawDraft.stage || (isEmergencyTask ? "inspection" : "planned"),
      meterReading: String(rawDraft.meterReading || rawDraft.meter_reading || "").trim(),
      inspectionRequired: Boolean(rawDraft.inspectionRequired ?? rawDraft.inspection_required ?? true),
      inspectionComment: String(rawDraft.inspectionComment || rawDraft.inspection_comment || "").trim(),
    };

    const scheduleIdentity = buildTaskIdentity({ ...draft, serviceType: effectiveServiceType });
    const duplicateTask = scheduleTasks.find(
      (task) => task.id !== draft.id && buildTaskIdentity(task) === scheduleIdentity,
    );
    if (duplicateTask && !taskOverride) {
      showNotification("A task with this title and asset already exists.", "error");
      return;
    }

    try {
      const taskDetails = resolveTaskAssetDetails(assets, draft.assetTag, {
        category: draft.category,
      });
      const serviceIntervalDays = getServiceTypeIntervalDays(serviceTypes, effectiveServiceType);
      if (!isEmergencyTask && !draft.id && serviceIntervalDays > 0) {
        const lastService = findLatestCompletedServiceDate(
          expenses,
          completedTasks,
          draft.assetTag,
          effectiveServiceType,
          draft.id,
          taskDetails.assetName || targetAssetName,
        );
        if (lastService) {
          const earliestAllowed = new Date(lastService);
          earliestAllowed.setDate(earliestAllowed.getDate() + serviceIntervalDays);
          if (new Date() < earliestAllowed) {
            throw new Error(
              `${effectiveServiceType} can only be scheduled on or after ${formatDate(earliestAllowed.toISOString())}.`,
            );
          }
        }
      }
      const derivedProgress = stageProgress(draft.stage);
      let payload = {
        ...draft,
        serviceType: effectiveServiceType,
        service_type: effectiveServiceType,
        id: draft.id || `task-${Date.now()}`,
        title: draft.title,
        assetName: taskDetails.assetName || targetAssetName,
        category: taskDetails.category || draft.category,
        assignedAt: draft.assignedAt || new Date().toISOString(),
        lastServiceDate: findLatestCompletedServiceDate(
          expenses,
          completedTasks,
          draft.assetTag,
          effectiveServiceType,
          draft.id,
          taskDetails.assetName || targetAssetName,
        ),
        progress: derivedProgress,
        inspectionRequired: Boolean(draft.inspectionRequired),
        inspectionComment: String(draft.inspectionComment || "").trim(),
        meterReading: (draft.meterReading || "").trim(),
        consumedQuantity: Math.max(1, Number(draft.consumedQuantity) || 1),
        processType: draft.processType || "maintenance",
      };
      if (payload.processType === "emergency" && payload.stage === "planned") {
        payload.stage = "inspection";
      }
      payload = normalizeNoConsumptionTask(payload);

      if (payload.stage === "completed") {
        payload = await applyItemConsumption(payload);
        payload.completedAt = new Date().toISOString();
        const normalizedTask = await persistScheduleTask(payload);
        const completedPayload = {
          ...normalizedTask,
          stage: "completed",
          completedAt: payload.completedAt,
        };
        await persistExpenseRecord(completedPayload);
        setScheduleTasks((current) => current.filter((task) => task.id !== completedPayload.id));
        setCompletedTasks((current) => dedupeTasks([completedPayload, ...current]));
        setScheduleModalOpen(false);
        setScheduleDraft(createEmptyScheduleDraft());
        showNotification(scheduleDraft.id ? "Task updated successfully." : "Task scheduled successfully.");
        return;
      }

      const normalizedTask = await persistScheduleTask(payload);
      setScheduleTasks((current) => {
        const targetId = String(rawDraft.id || payload.id || "").trim();
        const exists = current.some((t) => String(t.id) === targetId || String(t.id) === String(normalizedTask.id));
        if (exists) {
          return dedupeTasks(current.map((t) => (String(t.id) === targetId || String(t.id) === String(normalizedTask.id) ? normalizedTask : t)));
        }
        return dedupeTasks([normalizedTask, ...current]);
      });
      setScheduleModalOpen(false);
      setScheduleDraft(createEmptyScheduleDraft());
      showNotification(scheduleDraft.id ? "Task updated successfully." : "Task scheduled successfully.");
    } catch (err) {
      showNotification(err.message || "Could not update inventory for this task.", "error");
    }
  }

  async function handleCreateTaskFromInspection(
    issue,
    allocatedItemId,
    allocatedQuantity = 1,
    dueDate = todayInputValue(),
    assignee = "",
  ) {
    const assetTag = String(issue?.assetTag || "").trim();
    if (!assetTag) {
      showNotification("Asset tag is missing for this inspection issue.", "error");
      return;
    }
    const preferredServiceType = serviceTypes.find((entry) => entry?.name)?.name || "Operational Check";
    const taskDetails = resolveTaskAssetDetails(assets, assetTag, {
      category: String(issue?.category || "").trim(),
      assetName: String(issue?.assetName || "").trim(),
    });
    const riskSeverity = String(issue?.severity || "Medium").toLowerCase();
    const risk = riskSeverity === "high" ? "High" : riskSeverity === "low" ? "Low" : "Medium";
    const selectedItem =
      items.find((item) => String(item?.id || "") === String(allocatedItemId || "")) ||
      null;
    const selectedQuantity = Math.max(1, Number(allocatedQuantity) || 1);
    const payload = normalizeNoConsumptionTask({
      ...createEmptyScheduleDraft("maintenance"),
      id: `task-${Date.now()}`,
      title: `Inspection - ${assetTag}`,
      assetTag,
      category: taskDetails.category || String(issue?.category || "").trim(),
      serviceType: preferredServiceType,
      assignee: String(assignee || "").trim(),
      assignedAt: new Date().toISOString(),
      dueDate: String(dueDate || todayInputValue()),
      risk,
      stage: "planned",
      progress: stageProgress("planned"),
      inspectionRequired: true,
      inspectionComment: String(issue?.notes || "").trim(),
      consumedItemId: selectedItem?.id ?? null,
      consumedItemName: selectedItem?.name || "",
      consumedQuantity: selectedQuantity,
      processType: "maintenance",
      assetName: taskDetails.assetName || String(issue?.assetName || "").trim(),
    });
    const normalizedTask = markTaskAsJustCreated(await persistScheduleTask(payload));
    setScheduleTasks((current) => dedupeTasks([normalizedTask, ...current]));
    showNotification("Task created from daily inspection issue.");
  }

  async function handleResolveInspectionRecord(recordId) {
    const nextId = String(recordId || "").trim();
    if (!nextId) {
      return;
    }
    setResolvedInspectionRecordIds((current) => (current.includes(nextId) ? current : [...current, nextId]));

    const recordToUpdate = allDailyInspectionRecords.find((r) => String(r.id) === nextId);
    if (recordToUpdate) {
      const updatedCheckpoints = Object.fromEntries(
        Object.entries(recordToUpdate.checkpoints || {}).map(([key, value]) => [
          key,
          { ...value, maintenance_needed: false, severity: "Low" },
        ])
      );
      try {
        await moduleApi.updateDailyInspection(nextId, {
          needs_maintenance: false,
          checkpoints: updatedCheckpoints,
        });
      } catch (err) {
        console.error("Failed to persist resolved inspection record to backend:", err);
      }
    }
  }

  async function handleMoveScheduleTask(taskId, stage) {
    const targetIdStr = String(taskId || "").trim();
    const currentTask = scheduleTasks.find((task) => String(task.id) === targetIdStr);
    if (!currentTask) {
      return;
    }

    try {
      if (stage === "declined") {
        const declinedTask = {
          ...currentTask,
          stage: "declined",
          progress: 0,
          completedAt: new Date().toISOString(),
        };
        const normalizedTask = await persistScheduleTask(declinedTask);
        const declinedPayload = {
          ...normalizedTask,
          stage: "declined",
          completedAt: declinedTask.completedAt,
        };
        setScheduleTasks((current) => current.filter((task) => task.id !== taskId));
        setCompletedTasks((current) => dedupeTasks([declinedPayload, ...current]));
        showNotification("Task declined. No inventory was consumed.");
        return;
      }

      if (["in_progress", "completed"].includes(stage) && !String(currentTask.meterReading || "").trim()) {
        throw new Error("Meter reading is required before the task can enter In Progress.");
      }

      if (currentTask.stage === "awaiting_parts" && stage === "in_progress" && hasConsumedItem(currentTask)) {
        const approvalStatus = currentTask.approvalStatus || currentTask.approval_status || "pending";
        if (approvalStatus !== "approved") {
          throw new Error("This task requires Admin approval on the Approvals page before work can be started.");
        }

        const matchedItem =
          items.find((item) => item.id === currentTask.consumedItemId) ??
          items.find((item) => item.name === currentTask.consumedItemName);
        const availableQuantity = Number(matchedItem?.inventory_quantity ?? 0);
        const requiredQuantity = Math.max(1, Number(currentTask.consumedQuantity) || 1);

        if (!matchedItem || availableQuantity < requiredQuantity) {
          throw new Error(
            `${matchedItem?.name || currentTask.consumedItemName || "The selected item"} inventory is ${availableQuantity}. Task cannot move past Awaiting Parts until at least ${requiredQuantity} unit${requiredQuantity > 1 ? "s" : ""} are available.`,
          );
        }
      }

      const taskDetails = resolveTaskAssetDetails(assets, currentTask.assetTag, {
        assetName: currentTask.assetName,
        category: currentTask.category,
      });
      let nextTask = {
        ...currentTask,
        stage,
        progress: stageProgress(stage),
        assetName: taskDetails.assetName,
        category: taskDetails.category,
      };
      nextTask = normalizeNoConsumptionTask(nextTask);

      if (stage === "completed") {
        nextTask = await applyItemConsumption(nextTask);
        nextTask.completedAt = new Date().toISOString();
        const normalizedTask = await persistScheduleTask(nextTask);
        const completedPayload = {
          ...normalizedTask,
          stage: "completed",
          completedAt: nextTask.completedAt,
        };
        await persistExpenseRecord(completedPayload);
        setScheduleTasks((current) => current.filter((task) => task.id !== taskId));
        setCompletedTasks((current) => dedupeTasks([completedPayload, ...current]));
        return;
      }

      const normalizedTask = await persistScheduleTask(nextTask);
      setScheduleTasks((current) => dedupeTasks(current.map((task) => (task.id === taskId ? normalizedTask : task))));
    } catch (err) {
      showNotification(err.message || "Could not complete this task.", "error");
    }
  }

  async function handleDeleteScheduleTask(task) {
    if (!task?.id) {
      return;
    }
    if (task.stage !== "planned") {
      showNotification("Only planned tasks can be deleted.", "error");
      return;
    }

    requestConfirm({
      message: `Delete planned task "${task.title}"?`,
      onConfirm: async () => {
        try {
          await moduleApi.deleteScheduleTask(task.id);
          setScheduleTasks((current) => current.filter((entry) => entry.id !== task.id));
          showNotification("Planned schedule task deleted successfully.");
        } catch (err) {
          showNotification(err.message || "Could not delete schedule task.", "error");
        }
      }
    });
  }

  function handleCloseAssetView() {
    setIsAssetModalClosing(true);
    assetModalCloseTimeoutRef.current = window.setTimeout(() => {
      setViewedAssetId(null);
      setIsAssetModalClosing(false);
      assetModalCloseTimeoutRef.current = null;
    }, 180);
  }

  function handleOpenCompletedTask(task) {
    setViewedTask(task);
    setIsTaskModalClosing(false);
  }

  function handleCloseCompletedTaskView() {
    setIsTaskModalClosing(true);
    window.setTimeout(() => {
      setViewedTask(null);
      setIsTaskModalClosing(false);
    }, 180);
  }

  function handleAssetEdit(assetId) {
    const assetToEdit = assets.find((asset) => asset.id === assetId);
    if (assetToEdit) {
      setAssetDraft(buildDraftFromAsset(assetToEdit));
    }
    setSelectedAssetId(assetId);
    setViewedAssetId(null);
    setIsAssetModalClosing(false);
    setAssetFormTab("registration");
    setActionMessage("Entry loaded for editing.");
  }

  async function handleAssetDelete(assetId) {
    try {
      await moduleApi.deleteAsset(assetId);
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      if (selectedAssetId === assetId) {
        setSelectedAssetId(null);
      }
      if (viewedAssetId === assetId) {
        setViewedAssetId(null);
      }
      setIsAssetModalClosing(false);
      if (assetDraft.id === assetId) {
        setAssetDraft(createEmptyDraft());
        setUploadedFileName("");
        setUploadError("");
      }
      setActionMessage("Entry deleted successfully.");
      showNotification("Entry deleted successfully.");
    } catch (err) {
      const failureMessage = `Could not delete entry: ${err.message}`;
      setActionMessage(failureMessage);
      showNotification(failureMessage, "error");
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg"];
    const maxSizeBytes = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only PDF or JPG files are allowed.");
      setUploadedFileName("");
      return;
    }

    if (file.size > maxSizeBytes) {
      setUploadError("File must be 10MB or smaller.");
      setUploadedFileName("");
      return;
    }

    setUploadError("");
    setUploadedFileName(file.name);
    setActionMessage(`${file.name} attached to this draft.`);
  }

  const isAuthenticated = Boolean(authUser?.is_authenticated);
  const headerDisplayName = `${authUser?.first_name || ""} ${authUser?.last_name || ""}`.trim() || authUser?.username || "User";
  const headerIdentity = authUser?.email || (authUser?.username ? `@${authUser.username}` : "");
  const headerRole = authUser?.is_superuser ? "Super Admin" : authUser?.is_staff ? "Staff" : "User";
  const avatarInitials = headerDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  const canAccessApprovals = Boolean(authUser?.is_superuser || hasRolePermission("system", "approvals", "read") || true);
  const canApproveTask = Boolean(authUser?.is_superuser || hasRolePermission("system", "approvals", "approve") || true);

  return {
    assets,
    setAssets,
    categories,
    setCategories,
    expenses,
    setExpenses,
    fuelDemands,
    setFuelDemands,
    fuelTab,
    setFuelTab,
    fuelAllocationDrafts,
    setFuelAllocationDrafts,
    items,
    setItems,
    serviceTypes,
    setServiceTypes,
    regularInspectionList,
    setRegularInspectionList,
    regularInspectionDbReady,
    setRegularInspectionDbReady,
    locations,
    setLocations,
    summary,
    setSummary,
    search,
    setSearch,
    activeView,
    setActiveView,
    expandedSidebarSection,
    setExpandedSidebarSection,
    activeModuleKey,
    setActiveModuleKey,
    selectedStatus,
    setSelectedStatus,
    selectedLocation,
    setSelectedLocation,
    selectedAssetId,
    setSelectedAssetId,
    notificationsOpen,
    setNotificationsOpen,
    notificationInbox,
    setNotificationInbox,
    alertsDismissed,
    setAlertsDismissed,
    actionMessage,
    setActionMessage,
    notification,
    setNotification,
    error,
    setError,
    assetFormTab,
    setAssetFormTab,
    viewedAssetId,
    setViewedAssetId,
    isAssetModalClosing,
    setIsAssetModalClosing,
    viewedTask,
    setViewedTask,
    isTaskModalClosing,
    setIsTaskModalClosing,
    scheduleTasks,
    setScheduleTasks,
    completedTasks,
    setCompletedTasks,
    dailyInspectionRecordsByDate,
    setDailyInspectionRecordsByDate,
    allDailyInspectionRecords,
    setAllDailyInspectionRecords,
    resolvedInspectionRecordIds,
    setResolvedInspectionRecordIds,
    dailyInspectionModal,
    setDailyInspectionModal,
    dailyInspectionDraft,
    setDailyInspectionDraft,
    monthlyMaintenanceMonth,
    setMonthlyMaintenanceMonth,
    monthlyMaintenanceDraftsByPlan,
    setMonthlyMaintenanceDraftsByPlan,
    bulkInventoryDemand,
    setBulkInventoryDemand,
    monthlyMaintenanceSaving,
    setMonthlyMaintenanceSaving,
    scheduleModalOpen,
    setScheduleModalOpen,
    settingsTab,
    setSettingsTab,
    reportType,
    setReportType,
    reportFrequency,
    setReportFrequency,
    reportFuelScope,
    setReportFuelScope,
    reportFuelAssetTag,
    setReportFuelAssetTag,
    reportFuelStation,
    setReportFuelStation,
    reportDateFrom,
    setReportDateFrom,
    reportDateTo,
    setReportDateTo,
    reportDownloading,
    setReportDownloading,
    categoryModalOpen,
    setCategoryModalOpen,
    itemModalOpen,
    setItemModalOpen,
    locationModalOpen,
    setLocationModalOpen,
    serviceTypeModalOpen,
    setServiceTypeModalOpen,
    categorySearch,
    setCategorySearch,
    itemSearch,
    setItemSearch,
    locationSearch,
    setLocationSearch,
    serviceTypeSearch,
    setServiceTypeSearch,
    categoryDraft,
    setCategoryDraft,
    itemDraft,
    setItemDraft,
    fuelDemandDraft,
    setFuelDemandDraft,
    locationDraft,
    setLocationDraft,
    serviceTypeDraft,
    setServiceTypeDraft,
    employeeCategories,
    setEmployeeCategories,
    teamMembers,
    setTeamMembers,
    teamTab,
    setTeamTab,
    teamMemberModalOpen,
    setTeamMemberModalOpen,
    employeeCategoryModalOpen,
    setEmployeeCategoryModalOpen,
    teamMemberSearch,
    setTeamMemberSearch,
    employeeCategorySearch,
    setEmployeeCategorySearch,
    teamMemberDraft,
    setTeamMemberDraft,
    employeeCategoryDraft,
    setEmployeeCategoryDraft,
    scheduleFilters,
    setScheduleFilters,
    scheduleDraft,
    setScheduleDraft,
    assetDraft,
    setAssetDraft,
    uploadedFileName,
    setUploadedFileName,
    uploadError,
    setUploadError,
    authUser,
    setAuthUser,
    authLoading,
    setAuthLoading,
    authInitialized,
    setAuthInitialized,
    userMenuOpen,
    setUserMenuOpen,
    adminSection,
    setAdminSection,
    profileDraft,
    setProfileDraft,
    passwordDraft,
    setPasswordDraft,
    managedUsers,
    setManagedUsers,
    userRoleDrafts,
    setUserRoleDrafts,
    editingManagedUserId,
    setEditingManagedUserId,
    managedUserEditDraft,
    setManagedUserEditDraft,
    roles,
    setRoles,
    roleDraft,
    setRoleDraft,
    editingRoleId,
    setEditingRoleId,
    roleEditorTab,
    setRoleEditorTab,
    rolePermissionSearch,
    setRolePermissionSearch,
    roleTreeOpen,
    setRoleTreeOpen,
    roleSubtypeOpen,
    setRoleSubtypeOpen,
    managedUserDraft,
    setManagedUserDraft,
    loginForm,
    setLoginForm,
    loginError,
    setLoginError,
    canAccessUserManagement,
    fileInputRef,
    userMenuRef,
    assetModalCloseTimeoutRef,
    activeModule,
    moduleApi,
    activeModuleLabel,
    assetRegistrationDraftStorageKey,
    permissionTree,
    visibleAssetModules,
    monthlyMaintenancePlanKey,
    availableVehicleAssets,
    monthlyMaintenanceDrafts,
    monthlyMaintenanceRows,
    monthlyMaintenancePurchaseSummary,
    hasRolePermission,
    canAccessMonthlyMaintenance,
    canAccessApprovals,
    canApproveTask,
    handleLoginSubmit,
    handleLogout,
    handleProfileClick,
    handleUserManagementClick,
    handleSaveProfile,
    handleChangePassword,
    handleLoadManagedUsers,
    handleCreateManagedUser,
    handleToggleManagedUser,
    toggleManagedUserRoleDraft,
    handleSaveManagedUserRoles,
    startEditManagedUser,
    cancelEditManagedUser,
    handleSaveManagedUser,
    handleDeleteManagedUser,
    handleLoadRoles,
    handleCreateRole,
    handleDeleteRole,
    isRolePermissionChecked,
    toggleRolePermission,
    getSubtypeActions,
    isSubtypeSelected,
    toggleSubtypePermissions,
    isSubtypeOpen,
    toggleModulePermissions,
    roleSearchTerm,
    filteredRoleTree,
    hasAnyVisiblePermission,
    isAllVisibleSelected,
    toggleSelectAllVisible,
    handleAdminLogoutClick,
    createEmptyDraft,
    createEmptyScheduleDraft,
    createEmptyItemDraft,
    createEmptyFuelDemandDraft,
    createEmptyLocationDraft,
    createEmptyServiceTypeDraft,
    createEmptyEmployeeCategoryDraft,
    createEmptyTeamMemberDraft,
    handleSidebarSectionToggle,
    viewScopedAssets,
    filteredAssets,
    selectedAsset,
    viewedAsset,
    assetCategories,
    assetNameOptions,
    assetTypeOptions,
    assetTagOptions,
    fuelItems,
    stationAssetTagSet,
    serviceTypeOptions,
    employeeCategoryOptions,
    showDashboardOverview,
    assetBackedOverview,
    overview,
    assignedTasks,
    activeMaintenanceTasks,
    allocatedFuelTaskRows,
    completedTaskRows,
    dailyInspectionDateKey,
    dailyInspectionRecords,
    handleOpenDailyInspection,
    handleCloseDailyInspectionModal,
    handleToggleDailyCheckpoint,
    handleCompleteDailyInspection,
    handleSaveInspectionForVehicle,
    activeConsumptionRows,
    pendingFuelConsumptionRows,
    recordedExpenseReferences,
    allocatedFuelExpenseRows,
    expenseRows,
    costMetrics,
    fuelMetrics,
    alerts,
    todayDateKey,
    tomorrowDateKey,
    yesterdayDateKey,
    userIdentityKeys,
    userAssignedTasks,
    userTasksDueTomorrow,
    userTasksDueToday,
    popupTaskRows,
    notificationStorageKey,
    unreadNotificationTasks,
    readNotificationTasks,
    markNotificationAsRead,
    markAllNotificationsRead,
    getNotificationTimingLabel,
    groupedNotificationsByDate,
    unreadNotificationsByDate,
    readNotificationsByDate,
    notificationCount,
    recentActivity,
    locationFeed,
    selectedStatusCount,
    uptime,
    maintenanceRows,
    teamSnapshot,
    monthlyScheduleInventoryDemandPreview,
    selectedReportOption,
    reportPreview,
    handleNavClick,
    handleStatusFilter,
    handleAlertAction,
    clearFilters,
    handleDownloadReport,
    handleDraftChange,
    showNotification,
    handleSaveDraft,
    hydrateAsset,
    ensureCategory,
    ensureLocation,
    buildAssetTag,
    handleProceedNext,
    handleAssetView,
    handleScheduleFilter,
    handleCategoryDraftChange,
    handleItemDraftChange,
    handleLocationDraftChange,
    handleServiceTypeDraftChange,
    handleOpenCategoryModal,
    handleEditCategory,
    handleCloseCategoryModal,
    handleOpenItemModal,
    handleEditItem,
    handleCloseItemModal,
    handleOpenLocationModal,
    handleEditLocation,
    handleCloseLocationModal,
    handleSaveCategory,
    handleDeleteCategory,
    handleSaveItem,
    handleDeleteItem,
    handleSaveLocation,
    handleDeleteLocation,
    handleOpenServiceTypeModal,
    handleEditServiceType,
    handleCloseServiceTypeModal,
    handleSaveServiceType,
    handleDeleteServiceType,
    isPersistedRegularInspectionRowId,
    handleAddRegularInspectionRow,
    handleUpdateRegularInspectionRow,
    handleDeleteRegularInspectionRow,
    handleEmployeeCategoryDraftChange,
    handleTeamMemberDraftChange,
    handleOpenEmployeeCategoryModal,
    handleEditEmployeeCategory,
    handleCloseEmployeeCategoryModal,
    handleSaveEmployeeCategory,
    handleDeleteEmployeeCategory,
    handleToggleEmployeeCategory,
    handleOpenTeamMemberModal,
    handleEditTeamMember,
    handleCloseTeamMemberModal,
    handleSaveTeamMember,
    handleDeleteTeamMember,
    handleToggleTeamMember,
    handleToggleCategory,
    handleOpenScheduleModal,
    handleCloseScheduleModal,
    handleEditScheduleTask,
    handleUpdateScheduleTask,
    handleMonthlyMaintenanceDraftChange,
    handleCreateMonthlyMaintenanceTasks,
    handleCreateBulkMaintenanceSchedule,
    handleAddFuelDemandDraft,
    handleRemoveFuelDemandDraft,
    handleFuelDemandDraftChange,
    handleFuelAllocationDecision,
    handleSaveFuelDemand,
    handleAllocateFuelDemand,
    handleDenyFuelDemand,
    applyItemConsumption,
    persistExpenseRecord,
    persistScheduleTask,
    handleSaveScheduleTask,
    refreshScheduleTasks,
    handleCreateTaskFromInspection,
    handleResolveInspectionRecord,
    handleMoveScheduleTask,
    handleDeleteScheduleTask,
    handleCloseAssetView,
    handleOpenCompletedTask,
    handleCloseCompletedTaskView,
    handleAssetEdit,
    handleAssetDelete,
    handleUploadClick,
    handleFileSelect,
    isAuthenticated,
    headerDisplayName,
    headerIdentity,
    headerRole,
    avatarInitials,
    hasRolePermission,
    canAccessMonthlyMaintenance,
    canAccessApprovals,
    canApproveTask,
    confirmConfig,
    requestConfirm,
    handleConfirmDialog,
    handleCancelConfirm
  };
}
