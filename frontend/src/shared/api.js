// API helper for backend integration
let baseUrl = import.meta.env.VITE_API_URL || "/api";
if (baseUrl.startsWith("http") && !baseUrl.endsWith("/api") && !baseUrl.includes("/api/")) {
  baseUrl = baseUrl.replace(/\/?$/, "/api");
}
const API_BASE = baseUrl;
const TOKEN_KEY = "crm_auth_token";

// ── Token helpers ──────────────────────────────────────────
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Generic fetch wrapper ──────────────────────────────────
async function request(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// ── Auth API ───────────────────────────────────────────────
export async function apiSignup(payload) {
  // payload shape expected by backend:
  // { companyName, companyEmail, address, phoneNumber, website,
  //   industryType, employeeCount, companyLogo, gstId, timezone,
  //   adminName, adminEmail, adminPhone, password, profilePicture }
  return request("POST", "/auth/signup", payload);
}

export async function apiLogin(payload) {
  // payload: { role, identifier, password }
  return request("POST", "/auth/login", payload);
}

export async function apiGetMe() {
  return request("GET", "/auth/me");
}

export async function apiChangeOnboardingPassword(payload) {
  return request("POST", "/auth/change-password", payload);
}
