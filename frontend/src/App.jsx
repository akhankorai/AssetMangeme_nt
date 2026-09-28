import { useAppManager } from './hooks/useAppManager';
/* eslint-disable no-unused-vars, react-refresh/only-export-components */
import "./pages/AdminWorkspace/AdminWorkspace.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Bell, Boxes, CalendarDays, CalendarRange, CheckCheck,
  ChevronDown, ChevronRight, ClipboardList, Cog, FileBarChart2, FileUp,
  Folder, Fuel, HandCoins, HardDrive, MapPinned, MoreVertical, Plus,
  Search, ShieldCheck, SlidersHorizontal, Users, Wrench,
} from "lucide-react";

import { assetModules, defaultAssetModule, findAssetModule } from "./modules";
import {
  changePassword, deleteAdminUser, deleteAdminRole, createAdminUser, createAdminRole,
  getCurrentUser, listAdminRoles, listAdminUsers, login, logout,
  updateAdminUser, updateAdminRole, updateProfile,
  listOutsideMaintenanceRecords, updateOutsideMaintenanceRecord,
  listScheduleTasks, updateScheduleTask,
} from "./api";

import { navigation, viewDescriptions, reportOptions, ROLE_ACTIONS, ROLE_SUBTYPES, ROLE_SUBTYPE_ACTIONS, DEFAULT_REGULAR_INSPECTION_LIST, scheduleStages } from "./constants";
import { formatDate, formatCurrency, formatQuantity, formatPersonDisplayName } from "./utils/formatting";
import { todayInputValue, monthInputValue, dateToInputValue, parseInputDate, formatCompactDate, addDaysDateKey, addDaysToDate, monthLabel, addMonths, monthRange, buildMonthDays, matchesReportPeriod } from "./utils/dateHelpers";
import { downloadExcelCompatibleCsv, downloadModernNotificationExcel } from "./utils/csvExport";
import { normalizeIdentityValue, canonicalIdentityValue, isTaskAssignedToCurrentUser } from "./utils/identity";
import { buildPriority, statusLabel, parseAssetNotes, buildCategoryPrefix, extractAssetIdentifierParts, buildAssetTagFromValues, buildDraftFromAsset } from "./utils/assetHelpers";
import { normalizeScheduleTask, serializeScheduleTask, splitScheduleTasks, stageProgress, resolveTaskAssetDetails, dedupeTasks, buildTaskIdentity, normalizeServiceTypeName, serviceTypeMatchKey, getServiceTypeIntervalDays, findLatestCompletedServiceDate, hasConsumedItem, normalizeNoConsumptionTask, markTaskAsJustCreated, getScheduleRiskTone } from "./normalizers/scheduleNormalizers";
import { normalizeFuelDemand } from "./normalizers/fuelNormalizers";
import { normalizeList, emptyDashboardSummaryFallback, buildNotificationTaskEntry, getMonthlyMaintenanceDefaultServiceType, createMonthlyMaintenanceDraft } from "./normalizers/commonNormalizers";

import SearchableDropdown from "./components/SearchableDropdown";
import StatBlock from "./components/StatBlock";
import ReportRangePicker from "./components/ReportRangePicker";
import DailyInspectionWorkspace from "./pages/DailyInspectionWorkspace/DailyInspectionWorkspace";
import ScheduleWorkspace from "./pages/ScheduleWorkspace/ScheduleWorkspace";
import MonthlyMaintenanceWorkspace from "./pages/MonthlyMaintenanceWorkspace/MonthlyMaintenanceWorkspace";
import CompletedTasksWorkspace from "./pages/CompletedTasksWorkspace/CompletedTasksWorkspace";
import ExpenseWorkspace from "./pages/ExpenseWorkspace/ExpenseWorkspace";
import FuelDemandWorkspace from "./pages/FuelDemandWorkspace/FuelDemandWorkspace";
import SettingsWorkspace from "./pages/SettingsWorkspace/SettingsWorkspace";
import TeamWorkspace from "./pages/TeamWorkspace/TeamWorkspace";
import AssetsWorkspace from "./pages/AssetsWorkspace/AssetsWorkspace";
import ReportsWorkspace from "./pages/ReportsWorkspace/ReportsWorkspace";
import GatePassWorkspace from "./pages/GatePassWorkspace/GatePassWorkspace";
import ApprovalsWorkspace from "./pages/ApprovalsWorkspace/ApprovalsWorkspace";
import UserPortalWorkspace from "./pages/UserPortalWorkspace/UserPortalWorkspace";

import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import TaskModal from "./components/Modals/TaskModal";
import DailyInspectionModal from "./components/Modals/DailyInspectionModal";
import NotificationModal from "./components/Modals/NotificationModal";
import DashboardOverview from "./components/DashboardOverview";

import "./app.css"

export default function App() {
  const {
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
    confirmConfig,
    handleConfirmDialog,
    handleCancelConfirm,
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
    avatarInitials
  } = useAppManager();

  // Local search state for User Management table
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const filteredManagedUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return managedUsers;
    const term = userSearchTerm.toLowerCase().trim();
    return managedUsers.filter((user) => {
      const username = (user.username || "").toLowerCase();
      const firstName = (user.first_name || "").toLowerCase();
      const lastName = (user.last_name || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const idStr = String(user.id || "");
      return username.includes(term) || firstName.includes(term) || lastName.includes(term) || fullName.includes(term) || idStr.includes(term);
    });
  }, [managedUsers, userSearchTerm]);

  // Local state for Role Edit Modal
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Gate Pass state
  const [gatePassRecords, setGatePassRecords] = useState([]);
  const [gatePassLoading, setGatePassLoading] = useState(false);

  async function loadGatePasses() {
    setGatePassLoading(true);
    try {
      const data = await listOutsideMaintenanceRecords(activeModuleKey);
      setGatePassRecords(Array.isArray(data) ? data : (data?.results || []));
    } catch (e) {
      console.error("Failed to load gate passes:", e);
    } finally {
      setGatePassLoading(false);
    }
  }

  useEffect(() => {
    loadGatePasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleKey]);

  useEffect(() => {
    if (activeView === "Gate Pass") {
      loadGatePasses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Global Approvals state
  const [globalApprovalTasks, setGlobalApprovalTasks] = useState([]);
  const [globalApprovalsLoading, setGlobalApprovalsLoading] = useState(false);

  async function loadGlobalApprovals() {
    setGlobalApprovalsLoading(true);
    try {
      const data = await listScheduleTasks(null);
      setGlobalApprovalTasks(Array.isArray(data) ? data : (data?.results || []));
    } catch (e) {
      console.error("Failed to load global approvals:", e);
    } finally {
      setGlobalApprovalsLoading(false);
    }
  }

  const normalizedGlobalApprovalTasks = useMemo(() => {
    return globalApprovalTasks.map(t => normalizeScheduleTask(t, assets, categories, items, regularInspectionList));
  }, [globalApprovalTasks, assets, categories, items, regularInspectionList]);

  useEffect(() => {
    if (activeView === "Approvals") {
      loadGlobalApprovals();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  async function handleGlobalUpdateTask(taskId, payload) {
    try {
      const updated = await updateScheduleTask(taskId, payload);
      setGlobalApprovalTasks((current) => current.map((t) => t.id === taskId ? { ...t, ...updated } : t));
      refreshScheduleTasks();
      return updated;
    } catch (err) {
      throw err;
    }
  }

  const openRoleModal = (role, tab = "details") => {
    setEditingRoleId(role.id);
    setRoleDraft({
      name: role.name || "",
      description: role.description || "",
      permissions: role.permissions || {},
    });
    setRoleEditorTab(tab);
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setEditingRoleId(null);
    setRoleDraft({ name: "", description: "", permissions: {} });
  };

  if (!authInitialized) {
    return (
      <div className="authGateScreen">
        <section className="authGateCard">
          <h1>Precision Assets</h1>
          <p>Checking your session...</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="authGateScreen">
        <section className="authGateCard" role="dialog" aria-modal="true" aria-label="Login">
          <h1>Login</h1>
          <p>Sign in to access the Operations Console.</p>
          <form onSubmit={handleLoginSubmit} className="authForm" autoComplete="off">
            <label>
              Username
              <input
                type="text"
                autoComplete="off"
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="new-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
            {loginError ? <div className="authError">{loginError}</div> : null}
            <div className="authActions">
               <button type="submit" disabled={authLoading}>
                {authLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className={`dashboardShell ${showDashboardOverview ? "dashboardReferenceShell" : ""}`}>
      {notification ? (
        <div className={`notificationToast ${notification.tone}`}>{notification.message}</div>
      ) : null}
      <Sidebar
        visibleAssetModules={visibleAssetModules}
        canAccessMonthlyMaintenance={canAccessMonthlyMaintenance}
        handleSidebarSectionToggle={handleSidebarSectionToggle}
        handleNavClick={handleNavClick} activeView={activeView} expandedSidebarSection={expandedSidebarSection}
        canAccessApprovals={canAccessApprovals}
      />

      <main
        className={`mainPane ${showDashboardOverview ? "dashboardReferencePane" : ""} ${activeModuleKey === "vehicle-assets" ? "vehicleAssetsMode" : ""
          }`}
      >
        <Header
          search={search}
          setSearch={setSearch}
          notificationCount={notificationCount}
          headerDisplayName={headerDisplayName}
          headerIdentity={headerIdentity}
          headerRole={headerRole}
          avatarInitials={avatarInitials}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          userMenuRef={userMenuRef}
          handleProfileClick={handleProfileClick}
          handleUserManagementClick={handleUserManagementClick}
          handleAdminLogoutClick={handleAdminLogoutClick} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} canAccessUserManagement={canAccessUserManagement}
        />

        {activeView === "Admin" ? (
          <>
            <section className="heroPanel">
              <div className="heroIcon">
                <Cog size={28} />
              </div>
              <div className="heroBody">
                <div className="heroTitleRow">
                  <h1>Admin</h1>
                  <span className="heroPill">Parent workspace</span>
                </div>
                <p>{viewDescriptions.Admin}</p>
                <div className="filterChips">
                  <button
                    className={`filterChip ${adminSection === "Profile" ? "active" : ""}`}
                    type="button"
                    onClick={() => setAdminSection("Profile")}
                  >
                    Profile
                  </button>
                  {canAccessUserManagement ? (
                    <button
                      className={`filterChip ${adminSection === "User Management" ? "active" : ""}`}
                      type="button"
                      onClick={() => setAdminSection("User Management")}
                    >
                      User Management
                    </button>
                  ) : null}
                  <button
                    className={`filterChip ${adminSection === "Logout" ? "active" : ""}`}
                    type="button"
                    onClick={() => setAdminSection("Logout")}
                  >
                    Logout
                  </button>
                  <button
                    className={`filterChip ${adminSection === "Roles" ? "active" : ""}`}
                    type="button"
                    onClick={() => setAdminSection("Roles")}
                  >
                    Roles
                  </button>
                </div>
              </div>
              <div className="heroMetric">
                <strong>{authUser?.username || "admin"}</strong>
                <span>Global admin</span>
              </div>
            </section>

            <section className="panel sidePanel adminPanel">
              {adminSection === "Profile" ? (
                <>
                  <h2>Profile</h2>
                  <div className="activityList adminFormGrid">
                    <label className="adminField">
                      First Name
                      <input
                        type="text"
                        value={profileDraft.first_name}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, first_name: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      Last Name
                      <input
                        type="text"
                        value={profileDraft.last_name}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, last_name: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      Email
                      <input
                        type="email"
                        value={profileDraft.email}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>
                    <div className="buttonRow adminActionRow">
                      <button type="button" onClick={handleSaveProfile}>
                        Save Profile
                      </button>
                    </div>
                    <label className="adminField">
                      Current Password
                      <input
                        type="password"
                        value={passwordDraft.current_password}
                        onChange={(event) =>
                          setPasswordDraft((current) => ({ ...current, current_password: event.target.value }))
                        }
                      />
                    </label>
                    <label className="adminField">
                      New Password
                      <input
                        type="password"
                        value={passwordDraft.new_password}
                        onChange={(event) =>
                          setPasswordDraft((current) => ({ ...current, new_password: event.target.value }))
                        }
                      />
                    </label>
                    <div className="buttonRow adminActionRow">
                      <button type="button" onClick={handleChangePassword}>
                        Change Password
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {adminSection === "User Management" && canAccessUserManagement ? (
                <>
                  <h2>User Management</h2>
                  <p className="reportPanelLead">Create users and control what modules/tasks they can access.</p>
                  <div className="activityList adminFormGrid">
                    <label className="adminField">
                      Username
                      <input
                        type="text"
                        value={managedUserDraft.username}
                        onChange={(event) => setManagedUserDraft((current) => ({ ...current, username: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      Password
                      <input
                        type="password"
                        value={managedUserDraft.password}
                        onChange={(event) => setManagedUserDraft((current) => ({ ...current, password: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      First Name
                      <input
                        type="text"
                        value={managedUserDraft.first_name}
                        onChange={(event) => setManagedUserDraft((current) => ({ ...current, first_name: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      Last Name
                      <input
                        type="text"
                        value={managedUserDraft.last_name}
                        onChange={(event) => setManagedUserDraft((current) => ({ ...current, last_name: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      Email
                      <input
                        type="email"
                        value={managedUserDraft.email}
                        onChange={(event) => setManagedUserDraft((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>
                    <label className="adminField">
                      Roles (multi-select)
                      <div className="multiSelectDropdown hoverDropdown" style={{width: '100%', position: 'relative'}}>
                        <div className="multiSelectSummary" style={{
                            padding: '10px 14px',
                            border: '1.5px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface)',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}>
                          {(managedUserDraft.assigned_role_ids || []).length > 0
                            ? roles
                              .filter((role) => (managedUserDraft.assigned_role_ids || []).includes(role.id))
                              .map((role) => role.name)
                              .join(", ")
                            : "Select roles..."}
                        </div>
                        <div className="multiSelectDropdownMenu hoverDropdownContent" style={{left: 0, width: '100%'}}>
                          {roles.map((role) => {
                            const checked = (managedUserDraft.assigned_role_ids || []).includes(role.id);
                            return (
                              <label key={role.id} className="multiSelectOption" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer'}}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    setManagedUserDraft((current) => {
                                      const currentIds = current.assigned_role_ids || [];
                                      const nextIds = event.target.checked
                                        ? [...new Set([...currentIds, role.id])]
                                        : currentIds.filter((id) => id !== role.id);
                                      return { ...current, assigned_role_ids: nextIds };
                                    });
                                  }}
                                />
                                {role.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </label>
                    <div className="buttonRow adminActionRow">
                      <button type="button" onClick={handleCreateManagedUser}>
                        Create User
                      </button>
                      <button type="button" onClick={handleLoadManagedUsers}>
                        Refresh
                      </button>
                    </div>
                    <div className="adminUsersList">
                      {/* Search Bar */}
                      <div className="adminUserSearchBar">
                        <Search size={18} style={{color: '#94a3b8', flexShrink: 0}} />
                        <input
                          type="text"
                          placeholder="Search by Username, Name, or ID..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="adminUserSearchInput"
                        />
                        {userSearchTerm && (
                          <button type="button" onClick={() => setUserSearchTerm("")} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: '0 4px'}}>✕</button>
                        )}
                        <span className="adminUserSearchCount">{filteredManagedUsers.length} of {managedUsers.length} users</span>
                      </div>
                      {/* Table Header Row */}
                      <div className="adminUserRow adminUserRowHeader">
                        <div className="adminTableCol">USERNAME</div>
                        <div className="adminTableCol">NAME</div>
                        <div className="adminTableCol">ROLES</div>
                        <div className="adminTableCol">MODULES</div>
                        <div className="adminTableCol">ACTIONS</div>
                      </div>
                      {filteredManagedUsers.map((user) => (
                        editingManagedUserId === user.id ? (
                          <div key={user.id} className="teamRow adminUserRow adminUserRowEditing">
                            <div className="adminEditFullRow">
                              <strong style={{fontSize: '1rem', marginBottom: '12px', display: 'block'}}>Editing: {user.username}</strong>
                              <div className="adminFormGrid">
                                <label className="adminField">
                                  First Name
                                  <input type="text" value={managedUserEditDraft.first_name}
                                    onChange={(e) => setManagedUserEditDraft((c) => ({ ...c, first_name: e.target.value }))} />
                                </label>
                                <label className="adminField">
                                  Last Name
                                  <input type="text" value={managedUserEditDraft.last_name}
                                    onChange={(e) => setManagedUserEditDraft((c) => ({ ...c, last_name: e.target.value }))} />
                                </label>
                                <label className="adminField">
                                  Email
                                  <input type="email" value={managedUserEditDraft.email}
                                    onChange={(e) => setManagedUserEditDraft((c) => ({ ...c, email: e.target.value }))} />
                                </label>
                                <label className="adminField">
                                  New Password (optional)
                                  <input type="password" value={managedUserEditDraft.new_password}
                                    onChange={(e) => setManagedUserEditDraft((c) => ({ ...c, new_password: e.target.value }))} />
                                </label>
                                <label className="multiSelectOption" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                  <input type="checkbox" checked={managedUserEditDraft.is_superuser}
                                    onChange={(e) => setManagedUserEditDraft((c) => ({ ...c, is_superuser: e.target.checked }))} />
                                  Superuser
                                </label>
                              </div>
                              <div className="adminUserCardActions" style={{marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0'}}>
                                <button type="button" className="adminActionBtn adminActionBtn--save" onClick={() => handleSaveManagedUser(user.id)}>Save</button>
                                <button type="button" className="adminActionBtn adminActionBtn--cancel" onClick={cancelEditManagedUser}>Cancel</button>
                                <button type="button" className="adminActionBtn adminActionBtn--delete" onClick={() => handleDeleteManagedUser(user)}>Delete</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={user.id} className="teamRow adminUserRow">
                            {/* USERNAME */}
                            <div className="adminTableCol"><strong>{user.username}</strong></div>
                            {/* NAME */}
                            <div className="adminTableCol">{user.first_name || ''} {user.last_name || ''}</div>
                            {/* ROLES */}
                            <div className="adminTableCol">
                              <div className="customMultiSelect hoverDropdown" style={{position: 'relative'}}>
                                <div className="roleChip" style={{cursor: 'pointer', background: '#e2e8f0', color: '#1e293b'}}>
                                  {user.is_superuser ? "Superuser" : ((user.assigned_role_ids || []).length > 0 ? `${(user.assigned_role_ids || []).length} Roles ▼` : "No Roles ▼")}
                                </div>
                                <div className="customMultiSelectMenu hoverDropdownContent" style={{left: 0, width: '250px', padding: '12px'}}>
                                  <div style={{marginBottom: '12px', fontSize: '0.9rem', fontWeight: 700}}>Manage Roles</div>
                                  {roles.map((role) => {
                                    const selected = (userRoleDrafts[user.id] || user.assigned_role_ids || []).includes(role.id);
                                    return (
                                      <label key={`${user.id}-${role.id}`} className={`customMultiSelectOption ${selected ? 'selected' : ''}`} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px'}}>
                                        <input type="checkbox" checked={selected}
                                          onChange={(event) => toggleManagedUserRoleDraft(user, role.id, event.target.checked)} />
                                        <span style={{fontSize: '0.9rem'}}>{role.name}</span>
                                      </label>
                                    );
                                  })}
                                  <button type="button" onClick={() => handleSaveManagedUserRoles(user.id)} className="primary" style={{ marginTop: '12px', width: '100%', padding: '8px' }}>
                                    Save Roles
                                  </button>
                                </div>
                              </div>
                            </div>
                            {/* MODULES */}
                            <div className="adminTableCol">
                              <div className="customMultiSelect hoverDropdown" style={{position: 'relative'}}>
                                <div className="roleChip" style={{cursor: 'pointer', background: '#e2e8f0', color: '#1e293b'}}>
                                  {user.is_superuser ? "All Modules" : ((user.allowed_modules && user.allowed_modules.length > 0) ? `${user.allowed_modules.length} Modules ▼` : "None ▼")}
                                </div>
                                <div className="customMultiSelectMenu hoverDropdownContent" style={{left: 0, width: '200px', padding: '12px'}}>
                                  <div style={{marginBottom: '12px', fontSize: '0.9rem', fontWeight: 700}}>Assigned Modules</div>
                                  {user.is_superuser ? <div style={{fontSize: '0.85rem', color: '#64748b'}}>Superusers have access to all modules.</div> : (
                                    (user.allowed_modules && user.allowed_modules.length > 0) ? user.allowed_modules.map((m) => (
                                      <div key={m} style={{padding: '4px 8px', fontSize: '0.9rem', background: '#f1f5f9', marginBottom: '4px', borderRadius: '4px'}}>{m}</div>
                                    )) : <div style={{fontSize: '0.85rem', color: '#64748b'}}>No modules assigned.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* ACTIONS */}
                            <div className="adminTableCol adminTableColActions">
                              <button type="button" className="adminActionBtn adminActionBtn--edit" onClick={() => startEditManagedUser(user)}>Edit</button>
                              <button type="button" className="adminActionBtn adminActionBtn--disable" onClick={() => handleToggleManagedUser(user, "is_active")}>
                                {user.is_active ? "Disable" : "Enable"}
                              </button>
                              <button type="button" className="adminActionBtn adminActionBtn--delete" onClick={() => handleDeleteManagedUser(user)}>Delete</button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  <div className="buttonRow">
                    <button type="button" onClick={() => setActiveView("Team")}>
                      Open Team Workspace
                    </button>
                  </div>
                </>
              ) : null}

              {adminSection === "Logout" ? (
                <>
                  <h2>Logout</h2>
                  <p className="reportPanelLead">Sign out of the Operations Console.</p>
                  <div className="buttonRow">
                    <button type="button" onClick={handleLogout} disabled={authLoading}>
                      {authLoading ? "Signing out..." : "Logout"}
                    </button>
                  </div>
                </>
              ) : null}

              {adminSection === "Roles" ? (
                <>
                  <div className="buttonRow" style={{marginBottom: '20px'}}>
                    <button type="button" onClick={() => openRoleModal({ id: null }, "details")}>
                      Create Role
                    </button>
                    <button type="button" onClick={handleLoadRoles}>
                      Refresh Roles
                    </button>
                  </div>
                    <div className="adminUsersList">
                      {/* Table Header Row */}
                      <div className="adminUserRow adminRoleRowHeader">
                        <div className="adminTableCol">ROLE NAME</div>
                        <div className="adminTableCol">DESCRIPTION</div>
                        <div className="adminTableCol">MODULES / PERMS</div>
                        <div className="adminTableCol">ACTIONS</div>
                      </div>
                      {roles.map((role) => (
                        <div key={role.id} className="adminUserRow adminRoleRow">
                          <div className="adminTableCol" style={{fontWeight: '700', color: '#1e293b'}}>
                            {role.name}
                          </div>
                          <div className="adminTableCol" style={{color: '#64748b', fontWeight: '500'}}>
                            {role.description || "No description"}
                          </div>
                          <div className="adminTableCol">
                            <div className="hoverDropdown">
                              <span className="infoChip" style={{cursor: 'pointer', background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700'}}>
                                {(role.allowed_modules || []).length} Modules ▼
                              </span>
                              <div className="hoverDropdownContent" style={{padding: '10px', minWidth: '180px'}}>
                                <div style={{fontWeight: '700', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '6px', color: '#475569'}}>
                                  PERMISSIONS: {Object.keys(role.permissions || {}).length}
                                </div>
                                {(role.allowed_modules || []).length > 0 ? (
                                  <ul style={{margin: 0, paddingLeft: '16px', fontSize: '0.85rem', color: '#334155'}}>
                                    {(role.allowed_modules || []).map(mod => <li key={mod}>{mod.replace('-', ' ')}</li>)}
                                  </ul>
                                ) : (
                                  <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>No modules</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="adminTableCol adminTableColActions">
                            <button type="button" className="adminActionBtn adminActionBtn--save" onClick={() => openRoleModal(role, "details")}>Edit</button>
                            <button type="button" className="adminActionBtn adminActionBtn--edit" onClick={() => openRoleModal(role, "permissions")}>Perms</button>
                            <button type="button" className={`adminActionBtn ${role.is_active ? 'adminActionBtn--disable' : 'adminActionBtn--save'}`} onClick={async () => {
                              await updateAdminRole(role.id, { is_active: !role.is_active });
                              await handleLoadRoles();
                            }}>
                              {role.is_active ? "Disable" : "Enable"}
                            </button>
                            <button type="button" className="adminActionBtn adminActionBtn--delete" onClick={() => handleDeleteRole(role)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  {/* Role Edit Modal */}
                  {showRoleModal && (
                    <div className="modalOverlay" onClick={closeRoleModal}>
                      <div className="roleEditorModal" onClick={e => e.stopPropagation()}>
                        <button className="roleEditorModalClose" onClick={closeRoleModal}>✕</button>
                        <div className="roleEditorModalHeader">
                          {editingRoleId ? `Edit Role: ${roleDraft.name}` : "Create Role"}
                        </div>
                        <div className="roleEditorModalBody">
                          <div className="roleEditorTabs">
                            <button className={roleEditorTab === "details" ? "active" : ""} onClick={() => setRoleEditorTab("details")}>Details</button>
                            <button className={roleEditorTab === "permissions" ? "active" : ""} onClick={() => setRoleEditorTab("permissions")}>Permissions</button>
                          </div>
                          {roleEditorTab === "details" ? (
                            <div className="adminFormGrid" style={{gridTemplateColumns: '1fr', gap: '16px'}}>
                              <label className="adminField">
                                Role Name
                                <input type="text" value={roleDraft.name} onChange={(e) => setRoleDraft(c => ({ ...c, name: e.target.value }))} style={{marginTop: '6px'}} />
                              </label>
                              <label className="adminField">
                                Description
                                <input type="text" value={roleDraft.description} onChange={(e) => setRoleDraft(c => ({ ...c, description: e.target.value }))} style={{marginTop: '6px'}} />
                              </label>
                            </div>
                          ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                              <label className="adminField rolePermissionField">
                                Search permissions
                                <input type="text" placeholder="Search permissions..." value={rolePermissionSearch} onChange={(e) => setRolePermissionSearch(e.target.value)} style={{marginTop: '6px'}} />
                              </label>
                              <div className="roleSelectAllRow">
                                <label>
                                  <input type="checkbox" checked={isAllVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} />
                                  Select All
                                </label>
                              </div>
                              <div className="rolePermissionTree">
                                {filteredRoleTree.map(({ moduleDefinition, visibleSubtypes }) => {
                                  if (visibleSubtypes.length === 0) return null;
                                  const isOpen = roleTreeOpen[moduleDefinition.key] === true;
                                  const moduleChecked = visibleSubtypes.every(subtype => isSubtypeSelected(moduleDefinition.key, subtype));
                                  return (
                                    <div key={moduleDefinition.key} className="roleTreeModule">
                                      <div className="roleTreeModuleHeader">
                                        <button type="button" className={`roleTreeToggle ${isOpen ? "open" : ""}`} onClick={() => setRoleTreeOpen(c => ({ ...c, [moduleDefinition.key]: !isOpen }))}>
                                          <ChevronRight size={14} />
                                        </button>
                                        <label>
                                          <input type="checkbox" checked={moduleChecked} onChange={(e) => toggleModulePermissions(moduleDefinition.key, e.target.checked)} />
                                          <span className="roleTreeFolder"><Folder size={14} /> {moduleDefinition.label}</span>
                                        </label>
                                      </div>
                                      {isOpen && (
                                        <div className="roleTreeSubtypeList">
                                          {visibleSubtypes.map(subtype => {
                                            const subtypeChecked = isSubtypeSelected(moduleDefinition.key, subtype);
                                            return (
                                              <div key={`${moduleDefinition.key}-${subtype}`} className="roleTreeSubtypeRow">
                                                <label>
                                                  <input type="checkbox" checked={subtypeChecked} onChange={(e) => toggleSubtypePermissions(moduleDefinition.key, subtype, e.target.checked)} />
                                                  <span className="roleTreeFolder"><Folder size={14} /> [{subtype.replaceAll("_", " ")}]</span>
                                                </label>
                                                <button type="button" className={`roleTreeToggle ${isSubtypeOpen(moduleDefinition.key, subtype) ? "open" : ""}`} onClick={() => setRoleSubtypeOpen(c => ({ ...c, [`${moduleDefinition.key}:${subtype}`]: !isSubtypeOpen(moduleDefinition.key, subtype) }))}>
                                                  <ChevronRight size={14} />
                                                </button>
                                                {isSubtypeOpen(moduleDefinition.key, subtype) && (
                                                  <div className="rolePermissionActionList treeActions">
                                                    {getSubtypeActions(subtype).map(action => (
                                                      <label key={`${moduleDefinition.key}-${subtype}-${action}`} className={isRolePermissionChecked(moduleDefinition.key, subtype, action) ? "active" : ""}>
                                                        <input type="checkbox" checked={isRolePermissionChecked(moduleDefinition.key, subtype, action)} onChange={() => toggleRolePermission(moduleDefinition.key, subtype, action)} />
                                                        <Folder size={14} /> [{action.replaceAll("_", " ")}]
                                                      </label>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="buttonRow" style={{justifyContent: 'flex-end', marginTop: '20px'}}>
                            <button type="button" onClick={() => { closeRoleModal(); }} style={{background: '#f1f5f9', color: '#475569'}}>Cancel</button>
                            <button type="button" onClick={() => { handleCreateRole(); closeRoleModal(); }} style={{background: '#2563eb', color: '#fff'}}>{editingRoleId ? "Update Role" : "Save Role"}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* End Role Edit Modal */}
                </>
              ) : null}
            </section>
          </>
        ) : activeView === "Assets" ? (
          <>
            <input
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
              hidden
              type="file"
              onChange={handleFileSelect}
            />
            <AssetsWorkspace
              assetDirectory={filteredAssets || assets}
              assetDraft={assetDraft}
              assetFormTab={assetFormTab}
              assetNameOptions={assetNameOptions}
              assetTypeOptions={assetTypeOptions}
              filteredAssets={assets}
              isAssetModalClosing={isAssetModalClosing}
              locations={locations}
              viewedAsset={viewedAsset}
              viewedAssetId={viewedAssetId}
              onAssetView={handleAssetView}
              onAssetDelete={handleAssetDelete}
              onAssetEdit={handleAssetEdit}
              onCloseAssetView={handleCloseAssetView}
              onDraftChange={handleDraftChange}
              onFileSelect={handleUploadClick}
              onFormTabChange={setAssetFormTab}
              onProceedNext={handleProceedNext}
              onSaveDraft={handleSaveDraft}
              selectedAsset={selectedAsset}
              uploadedFileName={uploadedFileName}
              uploadError={uploadError}
            />
          </>
        ) : activeView === "Daily Inspection" ? (
          <DailyInspectionWorkspace
            assets={assets}
            locations={locations}
            teamMembers={teamMembers}
            tasks={scheduleTasks}
            completedTasks={completedTasks}
            inspectionRecords={dailyInspectionRecords}
            allInspectionRecords={allDailyInspectionRecords}
            resolvedInspectionRecordIds={resolvedInspectionRecordIds}
            regularInspectionList={regularInspectionList}
            serviceTypes={serviceTypes}
            onSaveInspectionForVehicle={handleSaveInspectionForVehicle}
            onOpenInspection={handleOpenDailyInspection}
            onOpenTask={handleEditScheduleTask}
            onOpenSchedule={() => setActiveView("Schedule")}
            canViewSchedule={hasRolePermission(activeModuleKey, "schedule", "view")}
            monthlyMaintenanceProps={{
              activeModuleKey,
              canCreateTask: hasRolePermission(activeModuleKey, "schedule_workflow", "create_task"),
              canViewSchedule: hasRolePermission(activeModuleKey, "schedule", "view"),
              itemOptions: items,
              locationOptions: locations.map((location) => location.name).filter(Boolean),
              monthlyMaintenanceMonth,
              monthlyMaintenanceRows,
              onBulkInventoryDemandChange: setBulkInventoryDemand,
              onCreateBulkMaintenanceSchedule: handleCreateBulkMaintenanceSchedule,
              onCreateTasks: handleCreateMonthlyMaintenanceTasks,
              onDraftChange: handleMonthlyMaintenanceDraftChange,
              onOpenReports: () => setActiveView("Reports"),
              onOpenSchedule: () => setActiveView("Schedule"),
              onPlanMonthChange: setMonthlyMaintenanceMonth,
              purchaseSummary: monthlyMaintenancePurchaseSummary,
              saving: monthlyMaintenanceSaving,
              serviceTypeOptions,
              teamMembers,
            }}
          />
        ) : activeView === "Schedule" ? (
          <ScheduleWorkspace
            activeModuleKey={activeModuleKey}
            assets={assets}
            locations={locations}
            assetTagOptions={assetTagOptions}
            assetCategories={assetCategories}
            expenses={expenses}
            completedTasks={completedTasks}
            filters={scheduleFilters}
            globalSearch={search}
            itemOptions={items}
            onChangeFilter={handleScheduleFilter}
            onClearFilters={() => setScheduleFilters({ category: "All Assets", station: "All Stations", dateFrom: "", dateTo: "" })}
            onCloseModal={handleCloseScheduleModal}
            onEditTask={handleEditScheduleTask}
            onDeleteTask={handleDeleteScheduleTask}
            onMoveTask={handleMoveScheduleTask}
            onOpenModal={handleOpenScheduleModal}
            onSaveTask={handleSaveScheduleTask}
            onUpdateTask={handleUpdateScheduleTask}
            scheduleDraft={scheduleDraft}
            scheduleModalOpen={scheduleModalOpen}
            setScheduleDraft={setScheduleDraft}
            teamMembers={teamMembers}
            serviceTypes={serviceTypes}
            serviceTypeOptions={serviceTypeOptions}
            tasks={scheduleTasks}
            allInspectionRecords={allDailyInspectionRecords}
            onCreateTaskFromInspection={handleCreateTaskFromInspection}
            resolvedInspectionRecordIds={resolvedInspectionRecordIds}
            onResolveInspectionRecord={handleResolveInspectionRecord}
            canViewSchedule={hasRolePermission(activeModuleKey, "schedule", "view")}
            canCreateTask={hasRolePermission(activeModuleKey, "schedule_workflow", "create_task")}
            canInspectTask={hasRolePermission(activeModuleKey, "schedule_workflow", "inspect_task")}
            canPerformTask={hasRolePermission(activeModuleKey, "schedule_workflow", "perform_task")}
            gatePassRecords={gatePassRecords}
            inwardGatePassRecords={gatePassRecords.filter(r => r.status === "inside_gate")}
            onRefreshGatePasses={loadGatePasses}
          />
        ) : activeView === "Approvals" ? (
          <ApprovalsWorkspace
            tasks={normalizedGlobalApprovalTasks}
            completedTasks={[]}
            items={items}
            assets={assets}
            categories={categories}
            locations={locations}
            serviceTypes={serviceTypeOptions}
            teamMembers={teamMembers}
            onUpdateTask={handleGlobalUpdateTask}
            showNotification={showNotification}
            isSuperuser={canApproveTask}
            currentUser={authUser}
            fuelDemands={fuelDemands}
            onAllocateFuelDemand={handleAllocateFuelDemand}
            onDenyFuelDemand={handleDenyFuelDemand}
          />
        ) : activeView === "Schedule Monthly Maintenance Task" ? (
          canAccessMonthlyMaintenance ? (
            <MonthlyMaintenanceWorkspace
              activeModuleKey={activeModuleKey}
              canCreateTask={hasRolePermission(activeModuleKey, "schedule_workflow", "create_task")}
              canViewSchedule={hasRolePermission(activeModuleKey, "schedule", "view")}
              itemOptions={items}
              locationOptions={locations.map((location) => location.name).filter(Boolean)}
              monthlyMaintenanceMonth={monthlyMaintenanceMonth}
              monthlyMaintenanceRows={monthlyMaintenanceRows}
              onBulkInventoryDemandChange={setBulkInventoryDemand}
              onCreateBulkMaintenanceSchedule={handleCreateBulkMaintenanceSchedule}
              onCreateTasks={handleCreateMonthlyMaintenanceTasks}
              onDraftChange={handleMonthlyMaintenanceDraftChange}
              onOpenReports={() => setActiveView("Reports")}
              onOpenSchedule={() => setActiveView("Schedule")}
              onPlanMonthChange={setMonthlyMaintenanceMonth}
              purchaseSummary={monthlyMaintenancePurchaseSummary}
              saving={monthlyMaintenanceSaving}
              serviceTypeOptions={serviceTypeOptions}
              teamMembers={teamMembers}
            />
          ) : (
            <section className="panel scheduleFilterPanel">
              <div className="emptyState">
                Monthly maintenance planning is available only for superuser and creator roles.
              </div>
            </section>
          )
        ) : activeView === "Team" ? (
          <>


            <TeamWorkspace
              employeeCategories={employeeCategories}
              employeeCategoryOptions={employeeCategoryOptions}
              employeeCategoryDraft={employeeCategoryDraft}
              employeeCategoryModalOpen={employeeCategoryModalOpen}
              employeeCategorySearch={employeeCategorySearch}
              onDeleteEmployeeCategory={handleDeleteEmployeeCategory}
              onDeleteTeamMember={handleDeleteTeamMember}
              onEmployeeCategoryDraftChange={handleEmployeeCategoryDraftChange}
              onEmployeeCategorySearchChange={setEmployeeCategorySearch}
              onCloseEmployeeCategoryModal={handleCloseEmployeeCategoryModal}
              onCloseTeamMemberModal={handleCloseTeamMemberModal}
              onEditEmployeeCategory={handleEditEmployeeCategory}
              onEditTeamMember={handleEditTeamMember}
              onOpenEmployeeCategoryModal={handleOpenEmployeeCategoryModal}
              onOpenTeamMemberModal={handleOpenTeamMemberModal}
              onSaveEmployeeCategory={handleSaveEmployeeCategory}
              onSaveTeamMember={handleSaveTeamMember}
              onTabChange={setTeamTab}
              onTeamMemberDraftChange={handleTeamMemberDraftChange}
              onTeamMemberSearchChange={setTeamMemberSearch}
              onToggleEmployeeCategory={handleToggleEmployeeCategory}
              onToggleTeamMember={handleToggleTeamMember}
              teamMemberDraft={teamMemberDraft}
              teamMemberModalOpen={teamMemberModalOpen}
              teamMemberSearch={teamMemberSearch}
              teamMembers={teamMembers}
              teamTab={teamTab}
            />
          </>
        ) : activeView === "Gate Pass" ? (
          <GatePassWorkspace
            records={gatePassRecords}
            loading={gatePassLoading}
            onRefresh={loadGatePasses}
            onMarkReturned={async (recordId, payment) => {
              // 1. Update the gate pass record as returned with payment info
              const record = gatePassRecords.find(r => r.id === recordId);
              await updateOutsideMaintenanceRecord(recordId, {
                status: "inside_gate",
                in_time: new Date().toISOString(),
                payment_amount: payment?.amount || "",
                payment_method: payment?.method || "",
                payment_notes: payment?.notes || "",
              }, activeModuleKey);
              await loadGatePasses();
              // Reload schedule tasks so new emergency inspection task appears
              await refreshScheduleTasks();
            }}
          />
        ) : activeView === "Fuel Demand" ? (
          <>
            <FuelDemandWorkspace
              assets={assets}
              allocationDrafts={fuelAllocationDrafts}
              fuelDemandDraft={fuelDemandDraft}
              fuelDemands={fuelDemands}
              fuelItems={fuelItems}
              fuelMetrics={fuelMetrics}
              locations={locations}
              fuelTab={fuelTab}
              onAllocateFuelDemand={handleAllocateFuelDemand}
              onDenyFuelDemand={handleDenyFuelDemand}
              onDraftChange={handleFuelDemandDraftChange}
              onAddDraftRow={handleAddFuelDemandDraft}
              onRemoveDraftRow={handleRemoveFuelDemandDraft}
              onSaveFuelDemand={handleSaveFuelDemand}
              onTabChange={setFuelTab}
              onSetInspectionDecision={handleFuelAllocationDecision}
              canViewFuelDemand={hasRolePermission(activeModuleKey, "fuel_demand", "view")}
              canCreateFuelDemand={hasRolePermission(activeModuleKey, "fuel_workflow", "create_request")}
              canInspectFuelDemand={hasRolePermission(activeModuleKey, "fuel_workflow", "inspect_fuel")}
              canAllocateFuelDemand={hasRolePermission(activeModuleKey, "fuel_workflow", "allocate_fuel")}
              canDenyFuelDemand={hasRolePermission(activeModuleKey, "fuel_workflow", "deny_fuel")}
            />
          </>
        ) : activeView === "User Portal" ? (
          <UserPortalWorkspace
            assets={assets}
            fuelItems={fuelItems}
            locations={locations}
            categories={categories}
            serviceTypes={serviceTypes}
            items={items}
            teamMembers={teamMembers}
            fuelDemandDraft={fuelDemandDraft}
            onFuelDraftChange={handleFuelDemandDraftChange}
            onAddDraftRow={handleAddFuelDemandDraft}
            onRemoveDraftRow={handleRemoveFuelDemandDraft}
            onSaveFuelDemand={handleSaveFuelDemand}
            onSaveTask={handleSaveScheduleTask}
            showNotification={showNotification}
            currentUser={authUser}
          />
        ) : activeView === "Reports" ? (
          <>
            <section className="heroPanel">
              <div className="heroIcon">
                <FileBarChart2 size={28} />
              </div>
              <div className="heroBody">
                <div className="heroTitleRow">
                  <h1>{activeView}</h1>
                  <span className="heroPill">{selectedReportOption.label}</span>
                </div>
                <p>{viewDescriptions[activeView]}</p>
                <div className="filterChips">
                  <select
                    className="filterChip"
                    value={reportFrequency}
                    onChange={(e) => setReportFrequency(e.target.value)}
                  >
                    <option value="daily">Frequency: Daily</option>
                    <option value="monthly">Frequency: Monthly</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      className="filterChip"
                      value={reportDateFrom}
                      onChange={(e) => setReportDateFrom(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      style={{ padding: '0 12px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>to</span>
                    <input
                      type="date"
                      className="filterChip"
                      value={reportDateTo}
                      onChange={(e) => setReportDateTo(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      style={{ padding: '0 12px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    />
                  </div>
                  <button
                    className="filterChip"
                    type="button"
                    onClick={() => {
                      setReportType("assets");
                      setReportFrequency("monthly");
                      setReportFuelScope("overall");
                      setReportFuelAssetTag("");
                      setReportFuelStation("");
                      setReportDateFrom(todayInputValue());
                      setReportDateTo(todayInputValue());
                      setActionMessage("Reports workspace reset.");
                    }}
                  >
                    Reset workspace
                  </button>
                </div>
              </div>
              <div className="heroMetric">
                <strong>{reportOptions.length}</strong>
                <span>Report packs</span>
              </div>
            </section>

            <ReportsWorkspace
              assetTagOptions={assetTagOptions}
              locationOptions={locations.map((location) => location.name).filter(Boolean)}
              moduleLabel={activeModuleLabel}
              reportType={reportType}
              reportFrequency={reportFrequency}
              reportFuelAssetTag={reportFuelAssetTag}
              reportFuelScope={reportFuelScope}
              reportFuelStation={reportFuelStation}
              reportDateFrom={reportDateFrom}
              reportDateTo={reportDateTo}
              reportPreview={reportPreview}
              reportDownloading={reportDownloading}
              onFuelAssetTagChange={setReportFuelAssetTag}
              onFuelScopeChange={setReportFuelScope}
              onFuelStationChange={setReportFuelStation}
              onDownload={handleDownloadReport}
              onReportTypeChange={setReportType}
              onDateFromChange={setReportDateFrom}
              onDateToChange={setReportDateTo}
            />
          </>
        ) : activeView === "Expense" ? (
          <>
            <section className="heroPanel">
              <div className="heroIcon">
                <ShieldCheck size={28} />
              </div>
              <div className="heroBody">
                <div className="heroTitleRow">
                  <h1>{activeView}</h1>
                  <span className="heroPill">{selectedStatus ? statusLabel(selectedStatus) : "All statuses"}</span>
                </div>
                <p>{viewDescriptions[activeView]}</p>
                <div className="filterChips">
                  <select 
                    className="filterChip" 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">Status: All</option>
                    {Array.from(new Set(assets.map(a => a.status).filter(Boolean))).map(status => (
                      <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                    ))}
                  </select>
                  <select 
                    className="filterChip" 
                    value={selectedLocation} 
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    <option value="">Location: All</option>
                    {locations.map(loc => {
                      const name = typeof loc === 'string' ? loc : loc.name;
                      return name ? <option key={name} value={name}>{name}</option> : null;
                    })}
                  </select>
                  <button className="filterChip" type="button" onClick={clearFilters}>
                    Reset workspace
                  </button>
                </div>
              </div>
            </section>

            <ExpenseWorkspace
              costMetrics={costMetrics}
              expenseRows={expenseRows.filter(row => {
                if (!selectedStatus && !selectedLocation) return true;
                
                const rowAssetTitle = String(row.assetTitle || "").toLowerCase().trim();
                const asset = assets.find(a => {
                  const tag = String(a.asset_tag || "").toLowerCase().trim();
                  const name = String(a.name || "").toLowerCase().trim();
                  if (tag && (rowAssetTitle === tag || rowAssetTitle.includes(tag) || tag.includes(rowAssetTitle))) return true;
                  if (name && (rowAssetTitle === name || rowAssetTitle.includes(name) || name.includes(rowAssetTitle))) return true;
                  return false;
                });
                
                if (!asset) {
                  // If asset is not found at all, we hide it because it doesn't match the selected location/status
                  return false;
                }

                let matchStatus = true;
                let matchLocation = true;
                
                if (selectedStatus) {
                  matchStatus = String(asset.status).toLowerCase().trim() === String(selectedStatus).toLowerCase().trim();
                }
                if (selectedLocation) {
                  matchLocation = String(asset.location_name).toLowerCase().trim() === String(selectedLocation).toLowerCase().trim();
                }
                
                return matchStatus && matchLocation;
              })}
              onOpenSchedule={() => {
                setActiveView("Schedule");
                setActionMessage("Schedule view opened.");
              }}
            />
          </>
        ) : activeView === "Tasks" ? (
          <CompletedTasksWorkspace
            completedTasks={completedTaskRows}
            onOpenTask={handleOpenCompletedTask}
          />
        ) : activeView === "Settings" ? (
          <SettingsWorkspace
            categories={categories}
            categoryDraft={categoryDraft}
            categoryModalOpen={categoryModalOpen}
            categorySearch={categorySearch}
            itemDraft={itemDraft}
            itemModalOpen={itemModalOpen}
            itemSearch={itemSearch}
            locationDraft={locationDraft}
            locationModalOpen={locationModalOpen}
            locationSearch={locationSearch}
            locations={locations}
            onDeleteServiceType={handleDeleteServiceType}
            onDeleteCategory={handleDeleteCategory}
            onDeleteItem={handleDeleteItem}
            onDeleteLocation={handleDeleteLocation}
            onCategoryDraftChange={handleCategoryDraftChange}
            onCategorySearchChange={setCategorySearch}
            onCloseCategoryModal={handleCloseCategoryModal}
            onCloseItemModal={handleCloseItemModal}
            onCloseLocationModal={handleCloseLocationModal}
            onCloseServiceTypeModal={handleCloseServiceTypeModal}
            onEditCategory={handleEditCategory}
            onEditItem={handleEditItem}
            onEditLocation={handleEditLocation}
            onEditServiceType={handleEditServiceType}
            onOpenCategoryModal={handleOpenCategoryModal}
            onOpenItemModal={handleOpenItemModal}
            onOpenLocationModal={handleOpenLocationModal}
            onOpenServiceTypeModal={handleOpenServiceTypeModal}
            onAddRegularInspectionRow={handleAddRegularInspectionRow}
            onSaveCategory={handleSaveCategory}
            onSaveItem={handleSaveItem}
            onSaveLocation={handleSaveLocation}
            onItemDraftChange={handleItemDraftChange}
            onItemSearchChange={setItemSearch}
            onLocationDraftChange={handleLocationDraftChange}
            onLocationSearchChange={setLocationSearch}
            onSaveServiceType={handleSaveServiceType}
            onServiceTypeDraftChange={handleServiceTypeDraftChange}
            onServiceTypeSearchChange={setServiceTypeSearch}
            onUpdateRegularInspectionRow={handleUpdateRegularInspectionRow}
            onDeleteRegularInspectionRow={handleDeleteRegularInspectionRow}
            onTabChange={setSettingsTab}
            items={items}
            regularInspectionList={regularInspectionList}
            serviceTypeDraft={serviceTypeDraft}
            serviceTypeModalOpen={serviceTypeModalOpen}
            serviceTypeSearch={serviceTypeSearch}
            serviceTypes={serviceTypes}
            onToggleCategory={handleToggleCategory}
            settingsTab={settingsTab}
          />
        ) : null}

        {actionMessage ? <div className="actionBanner">{actionMessage}</div> : null}
        {error ? <div className="errorBanner">{error}</div> : null}

        {confirmConfig && (
          <div className="modalOverlay" onClick={handleCancelConfirm}>
            <div className="modalCard" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modalHeader">
                <h3 style={{ margin: 0 }}>Confirm Action</h3>
                <button type="button" onClick={handleCancelConfirm} className="iconButton">
                  &times;
                </button>
              </div>
              <div className="modalBody" style={{ padding: '24px 20px', fontSize: '1rem', color: '#334155' }}>
                {confirmConfig.message}
              </div>
              <div className="modalFooter" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={handleCancelConfirm}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleConfirmDialog}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <TaskModal 
          viewedTask={viewedTask}
          isTaskModalClosing={isTaskModalClosing}
          onClose={handleCloseCompletedTaskView}
        />

        <DailyInspectionModal 
          dailyInspectionModal={dailyInspectionModal}
          dailyInspectionDraft={dailyInspectionDraft}
          handleCloseDailyInspectionModal={handleCloseDailyInspectionModal}
          handleToggleDailyCheckpoint={handleToggleDailyCheckpoint}
          setDailyInspectionDraft={setDailyInspectionDraft}
          handleCompleteDailyInspection={handleCompleteDailyInspection}
        />

        <NotificationModal 
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          unreadNotificationTasks={unreadNotificationTasks}
          markAllNotificationsRead={markAllNotificationsRead}
          notificationInbox={notificationInbox}
          unreadNotificationsByDate={unreadNotificationsByDate}
          readNotificationsByDate={readNotificationsByDate}
          getNotificationTimingLabel={getNotificationTimingLabel}
          downloadModernNotificationExcel={downloadModernNotificationExcel}
          markNotificationAsRead={markNotificationAsRead}
        />

        {showDashboardOverview ? (
          <DashboardOverview
            activeModuleLabel={activeModuleLabel}
            uptime={uptime}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            clearFilters={clearFilters}
            overview={overview}
            filteredAssets={filteredAssets}
            activeView={activeView}
            setActiveView={setActiveView}
            setActionMessage={setActionMessage}
            assignedTasks={assignedTasks}
            scheduleTasks={scheduleTasks}
            handleStatusFilter={handleStatusFilter}
            alerts={alerts}
            setAlertsDismissed={setAlertsDismissed}
            handleAlertAction={handleAlertAction}
            teamSnapshot={teamSnapshot}
            setSearch={setSearch}
            maintenanceRows={maintenanceRows}
            selectedAsset={selectedAsset}
            setSelectedAssetId={setSelectedAssetId}
            locations={locations}
            sidePanel={
              <aside className="panel sidePanel dashboardSidePanel">
                <h2>{activeView === "Assets" ? "Selected Asset" : "Recent Activity"}</h2>

                {activeView === "Assets" && selectedAsset ? (
                  <div className="assetDetail">
                    <div className="detailHeader">
                      <strong>{selectedAsset.name}</strong>
                      <span>{selectedAsset.asset_tag}</span>
                    </div>
                    <dl className="detailGrid">
                      <div>
                        <dt>Status</dt>
                        <dd>{statusLabel(selectedAsset.status)}</dd>
                      </div>
                      <div>
                        <dt>Category</dt>
                        <dd>{selectedAsset.category_name || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>{selectedAsset.location_name || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Assigned To</dt>
                        <dd>{selectedAsset.assigned_to || "Unassigned"}</dd>
                      </div>
                      <div>
                        <dt>Serial</dt>
                        <dd>{selectedAsset.serial_number || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Purchased</dt>
                        <dd>{formatDate(selectedAsset.purchase_date)}</dd>
                      </div>
                    </dl>
                    <button
                      className="wideButton"
                      type="button"
                      onClick={() => {
                        setSelectedStatus(selectedAsset.status);
                        setActionMessage(`Applied ${statusLabel(selectedAsset.status)} filter from the selected asset.`);
                      }}
                    >
                      Filter by this status
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="activityList">
                      {recentActivity.map((item, index) => (
                        <button
                          key={item.id ? `recent-${item.id}` : `recent-${item.person}-${item.time}-${item.asset_id}-${index}`}
                          className="activityItem activityButton"
                          type="button"
                          onClick={() => {
                            setSelectedAssetId(item.asset_id);
                            setActiveView("Assets");
                            setActionMessage(`${item.person} activity opened.`);
                          }}
                        >
                          <div className="activityAvatar">{item.person.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <strong>{item.person}</strong>
                            <p>{item.action}</p>
                            <span>{item.time}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button className="wideButton" type="button" onClick={() => handleNavClick("Reports")}>
                      View Audit Log
                    </button>
                  </>
                )}

                <div className="feedHeader">
                  <span>Live Location Feed</span>
                  <strong>{selectedLocation || "Live"}</strong>
                </div>
                <div className="locationList">
                  {locationFeed.map((location) => (
                    <button
                      key={location.id}
                      className={`locationButton ${selectedLocation === location.name ? "active" : ""}`}
                      type="button"
                      onClick={() => {
                        setSelectedLocation((current) => (current === location.name ? "" : location.name));
                        setActionMessage(`${location.name} feed loaded.`);
                      }}
                    >
                      <span>{location.name}</span>
                      <strong>{location.asset_count}</strong>
                    </button>
                  ))}
                </div>
                <div className="mapPanel">
                  <MapPinned size={26} />
                </div>
              </aside>
            }
            assetsPanel={
              <section className="panel assetsPanel dashboardAssetsPanel">
                <div className="panelHeader">
                  <h2>
                    {selectedStatus ? `${statusLabel(selectedStatus)} assets` : "Asset browser"}
                  </h2>
                  <button type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>

                <div className="assetBrowserSummary">
                  <span>{filteredAssets.length} matching assets</span>
                  <span>{selectedStatusCount} in current status bucket</span>
                </div>

                {filteredAssets.length === 0 ? (
                  <div className="emptyState">No assets match the current search and filter combination.</div>
                ) : (
                  <div className="assetBrowserList">
                    {filteredAssets.slice(0, 12).map((asset) => (
                      <button
                        key={asset.id}
                        className={`assetBrowserCard ${selectedAsset?.id === asset.id ? "active" : ""}`}
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setActiveView("Assets");
                        }}
                      >
                        <strong>{asset.name}</strong>
                        <span>{asset.asset_tag}</span>
                        <span>{asset.location_name || "No location assigned"}</span>
                        <span>{asset.assigned_to || "Unassigned"}</span>
                        <span className={`priorityTag ${buildPriority(asset.status).toLowerCase()}`}>
                          {statusLabel(asset.status)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            }
          />
        ) : null}
      </main>
    </div>
  );
}
