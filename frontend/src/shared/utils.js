// Utility functions extracted from AgencyCRM.jsx
import { LS_KEYS } from './constants';

const LSUtils = {
  getData: (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setData: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch { return false; }
  },
  updateData: (key, updater) => {
    try {
      const existing = LSUtils.getData(key);
      const updated = typeof updater === "function" ? updater(existing) : { ...existing, ...updater };
      LSUtils.setData(key, updated);
      return updated;
    } catch { return null; }
  },
  createActivityLog: (action, entityType, entityId, userId, details = {}) => {
    const logs = LSUtils.getData(LS_KEYS.ACTIVITY_LOGS) || [];
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action, entityType, entityId, userId, details,
      timestamp: new Date().toISOString(),
    };
    LSUtils.setData(LS_KEYS.ACTIVITY_LOGS, [entry, ...logs].slice(0, 500));

    // Persist to database in background
    import("../services/api").then(api => {
      api.createActivityLog({ action, entityType, entityId, userId, details }).catch(err => {
        console.error("Failed to persist activity log to database:", err);
      });
    }).catch(err => console.error(err));

    return entry;
  },
  createNotification: (userId, type, title, message, link = null) => {
    const notifs = LSUtils.getData(LS_KEYS.NOTIFICATIONS) || [];
    const entry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId, type, title, message, link,
      read: false,
      createdAt: new Date().toISOString(),
    };
    LSUtils.setData(LS_KEYS.NOTIFICATIONS, [entry, ...notifs].slice(0, 200));

    // Persist to database in background
    let beType = "SYSTEM";
    const t = (type || "").toUpperCase();
    if (t.includes("TASK_ASSIGNED")) beType = "TASK_ASSIGNED";
    else if (t.includes("TASK_COMPLETED")) beType = "TASK_COMPLETED";
    else if (t.includes("TASK_APPROVED")) beType = "TASK_APPROVED";
    else if (t.includes("TASK_REJECTED")) beType = "TASK_REJECTED";
    else if (t.includes("CLIENT_CREATED")) beType = "CLIENT_CREATED";
    else if (t.includes("CLIENT_UPDATED")) beType = "CLIENT_UPDATED";
    else if (t.includes("EMPLOYEE_CREATED")) beType = "EMPLOYEE_CREATED";
    else if (t.includes("ANNOUNCEMENT")) beType = "ANNOUNCEMENT";
    else if (t.includes("REPORT_GENERATED")) beType = "REPORT_GENERATED";
    else if (t.includes("SYSTEM")) beType = "SYSTEM";
    else if (t.includes("APPROVAL")) beType = "TASK_APPROVED";
    else if (t.includes("TASK")) beType = "TASK_ASSIGNED";

    const session = LSUtils.getCurrentSession();
    const senderId = session?.id || userId;

    import("../services/api").then(api => {
      api.createNotification({
        senderId,
        receiverId: userId,
        type: beType,
        content: message
      }).catch(err => {
        console.error("Failed to persist notification to database:", err);
      });
    }).catch(err => console.error(err));

    return entry;
  },
  getCurrentSession: () => {
    const session = LSUtils.getData(LS_KEYS.SESSION);
    if (session && session.role) {
      session.role = session.role.toLowerCase();
    }
    return session;
  },
  setCurrentSession: (sessionData) => {
    const normalized = { ...sessionData };
    if (normalized.role) {
      normalized.role = normalized.role.toLowerCase();
    }
    return LSUtils.setData(LS_KEYS.SESSION, {
      ...normalized, loginAt: new Date().toISOString(),
    });
  },
  logoutUser: () => {
    localStorage.removeItem(LS_KEYS.SESSION);
  },
  seedIfEmpty: (key, data) => {
    if (!localStorage.getItem(key)) LSUtils.setData(key, data);
  },
};

export { LSUtils };
