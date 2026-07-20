// Centralized API Service Layer
// Base URL is relative — Vite proxy forwards /api → http://localhost:5000
let baseUrl = import.meta.env.VITE_API_URL || "/api";
if (baseUrl.startsWith("http") && !baseUrl.endsWith("/api") && !baseUrl.includes("/api/")) {
  baseUrl = baseUrl.replace(/\/?$/, "/api");
}
const API_BASE = baseUrl;
const TOKEN_KEY = "crm_auth_token";

// ── Token helpers ──────────────────────────────────────────
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Generic fetch wrapper with centralized error handling ───
async function request(method, path, body = null) {
  const headers = {};

  // Only set application/json for non-FormData payloads
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
    });
  } catch (err) {
    throw new Error("Network error. Please check your connection.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      removeToken();
    }
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// ── Auth API ───────────────────────────────────────────────
export async function getCurrentUser() {
  return request("GET", "/auth/me");
}

export async function loginUser(payload) {
  return request("POST", "/auth/login", payload);
}

export async function signupUser(payload) {
  return request("POST", "/auth/signup", payload);
}

export async function changePassword(payload) {
  return request("POST", "/users/change-password", payload);
}

export async function apiChangeOnboardingPassword(payload) {
  return request("POST", "/auth/change-password", payload);
}

// ── User / Employee Management API ─────────────────────────
export async function createManager(payload) {
  return request("POST", "/users/create-manager", payload);
}

export async function createEmployee(payload) {
  return request("POST", "/users/create-employee", payload);
}

export async function getManagers() {
  return request("GET", "/users/managers");
}

export async function getEmployees() {
  return request("GET", "/users/employees");
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("POST", "/upload", formData);
}

// ── Client Management API ──────────────────────────────────
export async function createClient(payload) {
  return request("POST", "/clients/create", payload);
}

export async function getClients() {
  return request("GET", "/clients");
}

export async function updateClient(id, payload) {
  return request("PUT", `/clients/${id}`, payload);
}

export async function deleteClient(id) {
  return request("DELETE", `/clients/${id}`);
}

// ── Task Management API ────────────────────────────────────
export async function getTasks() {
  return request("GET", "/task-dashboard");
}

export async function getTaskStats() {
  return request("GET", "/task-dashboard/dashboard");
}

export async function createTask(payload) {
  return request("POST", "/task/task-manager", payload);
}

export async function updateTask(id, payload) {
  return request("PUT", `/task/${id}`, payload);
}

export async function deleteTask(id) {
  return request("DELETE", `/task/${id}`);
}

export async function updateTaskStatus(taskId, updates) {
  // updates: e.g., { productionStatus, progress }
  return request("PATCH", `/task-dashboard/${taskId}/status`, updates);
}

// ── Monthly Content Planner API ────────────────────────────
export async function getPlanner(clientId, planMonth) {
  return request("GET", `/planner?clientId=${clientId}&planMonth=${planMonth}`);
}

export async function savePlanner(payload) {
  // payload: { clientId, planMonth, tasks: [...] }
  return request("POST", "/planner/save", payload);
}

export async function importPlannerExcel(file, clientId, month, year) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("clientId", clientId);
  formData.append("month", month);
  formData.append("year", year);
  return request("POST", "/planner/import-excel", formData);
}

// ── Announcements API ──────────────────────────────────────
export async function getAnnouncements() {
  return request("GET", "/announcements");
}

export async function createAnnouncement(payload) {
  return request("POST", "/announcements/create-announcement", payload);
}

export async function updateAnnouncement(id, payload) {
  return request("PUT", `/announcements/${id}`, payload);
}

export async function deleteAnnouncement(id) {
  return request("DELETE", `/announcements/${id}`);
}

// ── Employee Availability API ──────────────────────────────
export async function getAvailability() {
  return request("GET", "/availability");
}

export async function getAvailabilityStats() {
  return request("GET", "/availability/stats");
}

export async function createAvailability(payload) {
  return request("POST", "/availability", payload);
}

export async function updateAvailability(id, payload) {
  return request("PUT", `/availability/${id}`, payload);
}

export async function deleteAvailability(id) {
  return request("DELETE", `/availability/${id}`);
}


// ── Brand Assets API ───────────────────────────────────────
export async function getBrandAssets() {
  return request("GET", "/assets/company");
}

export async function getBrandAssetByClient(clientId) {
  return request("GET", `/assets/client/${clientId}`);
}

export async function createBrandAsset(formData) {
  // formData is a FormData object containing file clientLogo, fonts, driveLink, etc.
  return request("POST", "/assets", formData);
}

export async function updateBrandAsset(clientId, formData) {
  return request("PUT", `/assets/${clientId}`, formData);
}

export async function deleteBrandAsset(clientId) {
  return request("DELETE", `/assets/${clientId}`);
}

// ── Approvals API ──────────────────────────────────────────
export async function getApprovalQueue() {
  return request("GET", "/approvals");
}

export async function getApprovalDashboard() {
  return request("GET", "/approvals/dashboard");
}

export async function managerApproveTask(taskId) {
  return request("PATCH", `/approvals/${taskId}/manager-approve`);
}

export async function sendTaskToClient(taskId) {
  return request("PATCH", `/approvals/${taskId}/send-client`);
}

export async function clientApproveTask(taskId) {
  return request("PATCH", `/approvals/${taskId}/client-approve`);
}

export async function clientRejectTask(taskId, comment) {
  return request("PATCH", `/approvals/${taskId}/request-changes`, { comment });
}

// ── Notifications API ──────────────────────────────────────
export async function getNotifications(userId) {
  return request("GET", `/notifications/${userId}`);
}

export async function getUnreadNotificationCount(userId) {
  return request("GET", `/notifications/${userId}/unread-count`);
}

export async function markNotificationRead(notificationId) {
  return request("PUT", `/notifications/${notificationId}/read`);
}

export async function deleteNotification(notificationId) {
  return request("DELETE", `/notifications/${notificationId}`);
}

export async function createNotification(payload) {
  return request("POST", "/notifications", payload);
}

// ── Reports Analytics API ──────────────────────────────────
export async function getReportDashboard() {
  return request("GET", "/reports/dashboard");
}

// ── Users Update & Delete API ──────────────────────────────
export async function updateUser(id, payload) {
  return request("PUT", `/users/${id}`, payload);
}

export async function deleteUser(id) {
  return request("DELETE", `/users/${id}`);
}

// ── Activity Logs API ──────────────────────────────────────
export async function getActivityLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request("GET", `/activity-logs${query ? "?" + query : ""}`);
}

export async function createActivityLog(payload) {
  return request("POST", "/activity-logs", payload);
}

// ── Revisions API ──────────────────────────────────────────
export async function getRevisions(taskId) {
  return request("GET", `/revisions/${taskId}`);
}

export async function createRevision(taskId, payload) {
  return request("POST", `/revisions/${taskId}`, payload);
}

// ── Shoots API ──────────────────────────────────────────────
export async function getShoots() {
  return request("GET", "/shoots");
}

export async function getShootById(id) {
  return request("GET", `/shoots/${id}`);
}

export async function createShootBrief(payload) {
  return request("POST", "/shoots", payload);
}

export async function scheduleShoot(id, payload) {
  return request("PATCH", `/shoots/${id}/schedule`, payload);
}

export async function updateShootStatus(id, status) {
  return request("PATCH", `/shoots/${id}/status`, { status });
}

export async function assignShootCrew(id, crew) {
  return request("POST", `/shoots/${id}/crew`, { crew });
}

export async function getShootCrew(id) {
  return request("GET", `/shoots/${id}/crew`);
}

export async function draftScript(shootId, payload) {
  return request("POST", `/shoots/${shootId}/script/draft`, payload);
}

export async function submitScript(shootId, payload) {
  return request("POST", `/shoots/${shootId}/script/submit`, payload);
}

export async function approveScript(shootId) {
  return request("PATCH", `/shoots/${shootId}/script/approve`);
}

export async function requestScriptChanges(shootId, feedback) {
  return request("PATCH", `/shoots/${shootId}/script/changes`, { feedback });
}

export async function uploadShootAsset(shootId, formData) {
  return request("POST", `/shoots/${shootId}/assets`, formData);
}

export async function getShootAssets(shootId) {
  return request("GET", `/shoots/${shootId}/assets`);
}

export async function deleteShootAsset(assetId) {
  return request("DELETE", `/shoots/assets/${assetId}`);
}

export async function generateEditingTasks(shootId, tasks) {
  return request("POST", `/shoots/${shootId}/generate-tasks`, { tasks });
}

export async function submitShootDraft(shootId, formData) {
  return request("POST", `/shoots/${shootId}/draft`, formData);
}

// ── Publishing Engine API ──────────────────────────────────
export async function schedulePost(payload) {
  return request("POST", "/publishing/schedule", payload);
}

export async function getPublishingQueue(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.platform) params.append("platform", filters.platform);
  if (filters.clientId) params.append("clientId", filters.clientId);
  if (filters.search) params.append("search", filters.search);
  const query = params.toString();
  return request("GET", `/publishing/queue${query ? `?${query}` : ""}`);
}

export async function getPublishingCalendar(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const query = params.toString();
  return request("GET", `/publishing/calendar${query ? `?${query}` : ""}`);
}

export async function reschedulePost(id, scheduledAt) {
  return request("PUT", `/publishing/${id}/reschedule`, { scheduledAt });
}

export async function cancelPost(id) {
  return request("PUT", `/publishing/${id}/cancel`);
}

export async function getPublishingJobById(id) {
  return request("GET", `/publishing/${id}`);
}

export async function retryPublishingJob(id) {
  return request("POST", `/publishing/${id}/retry`);
}

export async function deletePublishingJob(id) {
  return request("DELETE", `/publishing/${id}`);
}

export async function getClientSocialConnection(clientId) {
  return request("GET", `/publishing/social-status/${clientId}`);
}

// ── Settings Module API ──────────────────────────────────────
export async function getCompanySettings() {
  return request("GET", "/settings/company");
}

export async function updateCompanySettings(payload) {
  return request("PUT", "/settings/company", payload);
}

export async function getPermissionsSettings() {
  return request("GET", "/settings/permissions");
}

export async function updatePermissionsSettings(payload) {
  return request("PUT", "/settings/permissions", payload);
}

export async function getPublishingSettings() {
  return request("GET", "/settings/publishing");
}

export async function connectPublishingPlatform(payload) {
  return request("POST", "/settings/publishing/connect", payload);
}

export async function disconnectPublishingPlatform(payload) {
  return request("DELETE", "/settings/publishing/disconnect", payload);
}

export async function getNotificationsSettings() {
  return request("GET", "/settings/notifications");
}

export async function updateNotificationsSettings(payload) {
  return request("PUT", "/settings/notifications", payload);
}

// ── Workspace Manager Performance API ────────────────────────
export async function getManagersPerformance() {
  return request("GET", "/users/managers/performance");
}

// ── Social Integrations API ──────────────────────────────────
export async function getSocialConnections() {
  return request("GET", "/social/connections");
}

export async function disconnectFacebook() {
  return request("DELETE", "/social/connections/facebook");
}

export async function disconnectInstagram() {
  return request("DELETE", "/social/connections/instagram");
}

export async function disconnectPlatform(platform, clientId = null) {
  const query = clientId ? `?clientId=${clientId}` : "";
  return request("DELETE", `/social/connections/${platform.toLowerCase()}${query}`);
}

