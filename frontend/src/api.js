const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "/api";

function buildUrl(path, moduleKey) {
  if (!moduleKey) {
    return `${API_BASE_URL}${path}`;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE_URL}${path}${separator}module=${encodeURIComponent(moduleKey)}`;
}

function appendQueryParams(path, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }
    searchParams.set(key, String(value).trim());
  });

  const queryString = searchParams.toString();
  if (!queryString) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${queryString}`;
}

function normalizeDepartmentValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function filterRecordsByDepartment(payload, department) {
  const normalizedDepartment = normalizeDepartmentValue(department);
  if (!normalizedDepartment) {
    return payload;
  }

  const departmentKeys = ["department", "Department", "department_name", "departmentName", "dept", "Dept"];
  const filterFn = (entry) =>
    departmentKeys.some((key) => normalizeDepartmentValue(entry?.[key]) === normalizedDepartment);

  if (Array.isArray(payload)) {
    return payload.filter(filterFn);
  }

  if (payload && Array.isArray(payload.results)) {
    return {
      ...payload,
      results: payload.results.filter(filterFn),
    };
  }

  return payload;
}

function withModulePayload(payload, moduleKey) {
  if (!payload || !moduleKey) {
    return payload;
  }

  return {
    ...payload,
    module: moduleKey,
  };
}

function getCookie(name) {
  if (!document.cookie) {
    return "";
  }
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const prefix = `${name}=`;
  const match = parts.find((entry) => entry.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

async function request(path, options = {}) {
  const { module: moduleKey, payload, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const csrfToken = getCookie("csrftoken");
  const response = await fetch(buildUrl(path, moduleKey), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(isWriteMethod && csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...fetchOptions.headers,
    },
    ...fetchOptions,
    body: payload ? JSON.stringify(withModulePayload(payload, moduleKey)) : fetchOptions.body,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const rawMessage = await response.text();
    const normalizedMessage = rawMessage.toLowerCase();

    if (contentType.includes("text/html")) {
      if (normalizedMessage.includes("invalid column name") && normalizedMessage.includes("active")) {
        throw new Error("Database schema is out of date. Run backend migrations, then restart the Django server.");
      }

      throw new Error(`Server error on ${path}. Check the backend server logs for details.`);
    }

    if (contentType.includes("application/json")) {
      try {
        const jsonError = JSON.parse(rawMessage);
        const errorText = jsonError.detail || jsonError.error || jsonError.message || 
          (typeof jsonError === 'object' ? Object.values(jsonError).map(val => Array.isArray(val) ? val.join(' ') : val).join(' ') : rawMessage);
        throw new Error(errorText || `Request failed with ${response.status}`);
      } catch (e) {
        if (e.message !== "Unexpected end of JSON input" && !e.message.startsWith("Unexpected token")) {
           throw e;
        }
      }
    }

    throw new Error(rawMessage || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function listAssets(moduleKey, options = {}) {
  const { department } = options;
  const path = appendQueryParams("/assets/", { department });
  const response = await request(path, { module: moduleKey });
  return filterRecordsByDepartment(response, department);
}

export function getDashboardSummary(moduleKey) {
  return request("/dashboard/", { module: moduleKey });
}

export function listApiRoot(moduleKey) {
  return request("/", { module: moduleKey });
}

export async function downloadReport(reportType, frequency, dateFrom, dateTo, moduleKey, extraParams = {}) {
  const searchParams = new URLSearchParams({
    type: reportType,
    frequency,
    date_from: dateFrom,
    date_to: dateTo,
  });
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });
  const response = await fetch(
    buildUrl(`/reports/export/?${searchParams.toString()}`, moduleKey),
    {
      headers: {
        Accept: "application/pdf, application/json, text/plain, */*",
      },
    },
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      throw new Error(payload.detail || `Report request failed with ${response.status}`);
    }

    throw new Error((await response.text()) || `Report request failed with ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const contentDisposition = response.headers.get("content-disposition") || "";
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  link.href = url;
  link.download = filenameMatch?.[1] || `${reportType}-${frequency}-${dateFrom}-to-${dateTo}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function createAsset(payload, moduleKey) {
  return request("/assets/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateAsset(assetId, payload, moduleKey) {
  return request(`/assets/${assetId}/`, {
    method: "PUT",
    module: moduleKey,
    payload,
  });
}

export function patchAsset(assetId, payload, moduleKey) {
  return request(`/assets/${assetId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteAsset(assetId, moduleKey) {
  return request(`/assets/${assetId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function listCategories(moduleKey) {
  return request("/categories/", { module: moduleKey });
}

export function createCategory(payload, moduleKey) {
  return request("/categories/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateCategory(categoryId, payload, moduleKey) {
  return request(`/categories/${categoryId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteCategory(categoryId, moduleKey) {
  return request(`/categories/${categoryId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function listItems(moduleKey) {
  return request("/items/", { module: moduleKey });
}

export function listServiceTypes(moduleKey) {
  return request("/service-types/", { module: moduleKey });
}

export function listRegularInspectionItems(moduleKey) {
  return request("/regular-inspection-items/", { module: moduleKey });
}

export function listEmployeeCategories(moduleKey) {
  return request("/employee-categories/", { module: moduleKey });
}

export function listTeamMembers(moduleKey) {
  return request("/team-members/", { module: moduleKey });
}

export function listExpenses(moduleKey) {
  return request("/expenses/", { module: moduleKey });
}

export function listFuelDemands(moduleKey) {
  return request("/fuel-demands/", { module: moduleKey });
}

export function listScheduleTasks(moduleKey) {
  return request("/schedule-tasks/", { module: moduleKey });
}

export function clearPlannedScheduleTasks(moduleKey) {
  return request("/schedule-tasks/clear-planned/", { method: "POST", module: moduleKey });
}

export function listDailyInspections(moduleKey, inspectionDate) {
  return request(appendQueryParams("/daily-inspections/", { inspection_date: inspectionDate }), { module: moduleKey });
}

export function createDailyInspection(payload, moduleKey) {
  return request("/daily-inspections/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateDailyInspection(recordId, payload, moduleKey) {
  return request(`/daily-inspections/${recordId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function createItem(payload, moduleKey) {
  return request("/items/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateItem(itemId, payload, moduleKey) {
  return request(`/items/${itemId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteItem(itemId, moduleKey) {
  return request(`/items/${itemId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function createServiceType(payload, moduleKey) {
  return request("/service-types/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function createRegularInspectionItem(payload, moduleKey) {
  return request("/regular-inspection-items/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateServiceType(serviceTypeId, payload, moduleKey) {
  return request(`/service-types/${serviceTypeId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function updateRegularInspectionItem(itemId, payload, moduleKey) {
  return request(`/regular-inspection-items/${itemId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteServiceType(serviceTypeId, moduleKey) {
  return request(`/service-types/${serviceTypeId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function deleteRegularInspectionItem(itemId, moduleKey) {
  return request(`/regular-inspection-items/${itemId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function createEmployeeCategory(payload, moduleKey) {
  return request("/employee-categories/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateEmployeeCategory(categoryId, payload, moduleKey) {
  return request(`/employee-categories/${categoryId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteEmployeeCategory(categoryId, moduleKey) {
  return request(`/employee-categories/${categoryId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function createTeamMember(payload, moduleKey) {
  return request("/team-members/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateTeamMember(memberId, payload, moduleKey) {
  return request(`/team-members/${memberId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteTeamMember(memberId, moduleKey) {
  return request(`/team-members/${memberId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function createExpense(payload, moduleKey) {
  return request("/expenses/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function createFuelDemand(payload, moduleKey) {
  return request("/fuel-demands/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function allocateFuelDemand(fuelDemandId, payload, moduleKey) {
  return request(`/fuel-demands/${fuelDemandId}/allocate/`, {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function approveFuelDemand(fuelDemandId, payload, moduleKey) {
  return request(`/fuel-demands/${fuelDemandId}/approve/`, {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function denyFuelDemand(fuelDemandId, payload, moduleKey) {
  return request(`/fuel-demands/${fuelDemandId}/deny/`, {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function createScheduleTask(payload, moduleKey) {
  return request("/schedule-tasks/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateExpense(expenseId, payload, moduleKey) {
  return request(`/expenses/${expenseId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function updateScheduleTask(taskId, payload, moduleKey) {
  return request(`/schedule-tasks/${taskId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteScheduleTask(taskId, moduleKey) {
  return request(`/schedule-tasks/${taskId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function listOutsideMaintenanceRecords(moduleKey) {
  return request("/outside-maintenance/", { module: moduleKey });
}

export function createOutsideMaintenanceRecord(payload, moduleKey) {
  return request("/outside-maintenance/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateOutsideMaintenanceRecord(recordId, payload, moduleKey) {
  return request(`/outside-maintenance/${recordId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}


export function listLocations(moduleKey) {
  return request("/locations/", { module: moduleKey });
}

export function createLocation(payload, moduleKey) {
  return request("/locations/", {
    method: "POST",
    module: moduleKey,
    payload,
  });
}

export function updateLocation(locationId, payload, moduleKey) {
  return request(`/locations/${locationId}/`, {
    method: "PATCH",
    module: moduleKey,
    payload,
  });
}

export function deleteLocation(locationId, moduleKey) {
  return request(`/locations/${locationId}/`, {
    method: "DELETE",
    module: moduleKey,
  });
}

export function login(payload) {
  return request("/auth/login/", {
    method: "POST",
    payload,
  });
}

export function logout() {
  return request("/auth/logout/", {
    method: "GET",
  });
}

export function getCurrentUser() {
  return request("/auth/me/", {
    method: "GET",
  });
}

export function updateProfile(payload) {
  return request("/auth/profile/", {
    method: "PATCH",
    payload,
  });
}

export function changePassword(payload) {
  return request("/auth/change-password/", {
    method: "POST",
    payload,
  });
}

export function listAdminUsers() {
  return request("/admin/users/", {
    method: "GET",
  });
}

export function createAdminUser(payload) {
  return request("/admin/users/", {
    method: "POST",
    payload,
  });
}

export function updateAdminUser(userId, payload) {
  return request(`/admin/users/${userId}/`, {
    method: "PATCH",
    payload,
  });
}

export function deleteAdminUser(userId) {
  return request(`/admin/users/${userId}/`, {
    method: "DELETE",
  });
}

export function listAdminRoles() {
  return request("/admin/roles/", {
    method: "GET",
  });
}

export function createAdminRole(payload) {
  return request("/admin/roles/", {
    method: "POST",
    payload,
  });
}

export function updateAdminRole(roleId, payload) {
  return request(`/admin/roles/${roleId}/`, {
    method: "PATCH",
    payload,
  });
}

export function deleteAdminRole(roleId) {
  return request(`/admin/roles/${roleId}/`, {
    method: "DELETE",
  });
}
