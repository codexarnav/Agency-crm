// Topbar component
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { ROLE_META, NAV_CONFIG, LS_KEYS } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { SvgIcon, Avatar } from "../shared/components";
import { markNotificationRead } from "../services/api";

function Topbar({ page, setMobileOpen, setPage }) {
  const { notifications: rawNotifs, session, logout, refreshNotifications } = useApp();
  const role = session?.role || "employee";
  const roleMeta = ROLE_META[role] || {};

  const notifs = (rawNotifs || []).map(n => ({
    id: n.id,
    title: n.title || (n.type ? n.type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") : "Notification"),
    message: n.content,
    read: n.isRead,
    type: (() => {
      const t = (n.type || "").toLowerCase();
      if (t.includes("task")) return "task";
      if (t.includes("announcement")) return "announcement";
      if (t.includes("report")) return "feedback";
      if (t.includes("approval")) return "approval";
      return "info";
    })(),
    createdAt: n.createdAt
  }));

  const unread = notifs.filter(n => !n.read).length;

  const [searchVal, setSearchVal] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);

  // Refresh notifs when panel opens
  useEffect(() => {
    if (showNotifs) {
      refreshNotifications();
    }
  }, [showNotifs, refreshNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setShowNotifs(false); setShowUser(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const stopProp = e => e.stopPropagation();

  const markAllRead = async (e) => {
    e.stopPropagation();
    try {
      const unreads = (rawNotifs || []).filter(n => !n.isRead);
      await Promise.all(unreads.map(n => markNotificationRead(n.id)));
      await refreshNotifications();
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const markOneRead = async (id) => {
    try {
      await markNotificationRead(id);
      await refreshNotifications();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleNotifClick = async (n) => {
    await markOneRead(n.id);
    setShowNotifs(false);
    // Navigate to related page if possible
    if (n.type === "approval" || n.type === "task") setPage && setPage("approvals");
    else if (n.type === "deadline") setPage && setPage("tasks");
    else if (n.type === "announcement") setPage && setPage("announcements");
    else if (n.type === "feedback") setPage && setPage("approvals");
  };

  // Compute page title from NAV_CONFIG
  const allItems = (NAV_CONFIG[role] || []).flatMap(s => s.items);
  const currentItem = allItems.find(i => i.id === page);
  const pageTitle = currentItem?.label || page.charAt(0).toUpperCase() + page.slice(1);

  const notifMeta = {
    task: { iconName: "checklist", color: "#1D4ED8", bg: "#DBEAFE" },
    feedback: { iconName: "chat", color: "#059669", bg: "#DCFCE7" },
    deadline: { iconName: "clock", color: "#F59E0B", bg: "#FEF9C3" },
    approval: { iconName: "check", color: "#16A34A", bg: "#DCFCE7" },
    announcement: { iconName: "megaphone", color: "#FF6A00", bg: "#FFF3E8" },
    overdue: { iconName: "alert", color: "#DC2626", bg: "#FEE2E2" },
    info: { iconName: "alert", color: "#6B7280", bg: "#F3F4F6" },
  };

  const displayNotifs = [...notifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);

  return (
    <div className="topbar" style={{ gap: 12 }}>
      {/* Mobile hamburger */}
      <button
        className="btn btn-ghost btn-icon mobile-menu-btn"
        onClick={() => setMobileOpen(v => !v)}
        style={{ flexShrink: 0 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </button>

      {/* Page title */}
      <div className="topbar-title hide-mobile">{pageTitle}</div>

      <div style={{ flex: 1 }} />

      {/* Global search */}
      <div className="global-search" onClick={e => e.currentTarget.querySelector("input")?.focus()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search anything..."
        />
        <span className="search-shortcut hide-mobile">CmdK</span>
      </div>

      {/* Topbar actions */}
      <div className="topbar-actions">

        {/* Role badge */}
        <div
          className="hide-mobile"
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 11px",
            borderRadius: 99, fontSize: 11.5, fontWeight: 700,
            background: roleMeta.bg || "#F3F4F6", color: roleMeta.color || "var(--muted)",
            border: `1px solid ${roleMeta.color}33`,
          }}
        >
          <SvgIcon name={roleMeta.iconName || "user"} size={13} color={roleMeta.color || "var(--muted)"} />
          {roleMeta.label}
        </div>

        {/* Notification bell */}
        <div className="user-dropdown-wrap" onClick={stopProp}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => { setShowNotifs(v => !v); setShowUser(false); }}
            style={{ position: "relative" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            {unread > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4, background: "var(--danger)", color: "#fff",
                fontSize: 9, fontWeight: 800, borderRadius: 99, padding: "1px 4px",
                minWidth: 16, textAlign: "center", lineHeight: 1.4, animation: unread > 0 ? "pulse 2s infinite" : "none",
              }}>{unread > 9 ? "9+" : unread}</span>
            )}
          </button>
          {showNotifs && (
            <div className="notif-panel" style={{ animation: "slideUp 0.18s ease" }}>
              {/* Header */}
              <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  {unread > 0 && <span className="badge badge-danger" style={{ fontSize: 10 }}>{unread} new</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11.5, color: "var(--primary)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      Mark all read
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setShowNotifs(false); setPage && setPage("notifications"); }} style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    View all
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ overflowY: "auto", maxHeight: 400 }}>
                {displayNotifs.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--light-orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                      <SvgIcon name="bell" size={20} color="var(--primary)" />
                    </div>
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>You're all caught up!</p>
                  </div>
                ) : displayNotifs.map(n => {
                  const m = notifMeta[n.type] || notifMeta.info;
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(n.createdAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return "just now";
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    return `${Math.floor(hrs / 24)}d ago`;
                  })();
                  return (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? "unread" : ""}`}
                      onClick={() => handleNotifClick(n)}
                      style={{ display: "flex", gap: 10, cursor: "pointer" }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <SvgIcon name={m.iconName} size={15} color={m.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: !n.read ? 700 : 600, color: "var(--dark)", marginBottom: 2, lineHeight: 1.3 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.message}</div>
                        <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 3 }}>{timeAgo}</div>
                      </div>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="user-dropdown-wrap" onClick={stopProp}>
          <div
            className="user-dropdown-trigger"
            onClick={() => { setShowUser(v => !v); setShowNotifs(false); }}
          >
            <Avatar name={session?.name || "User"} size="sm" />
            <div className="hide-mobile" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110 }}>
                {session?.name?.split(" ")[0] || "User"}
              </div>
            </div>
            <svg className="hide-mobile" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>

          {showUser && (
            <div className="user-dropdown-menu">
              {/* User info header */}
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={session?.name || "User"} size="md" />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--dark)" }}>{session?.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{session?.email}</div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: roleMeta.bg, color: roleMeta.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <SvgIcon name={roleMeta.iconName || "user"} size={11} color={roleMeta.color} />
                        {roleMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button className="dropdown-item">
                <SvgIcon name="user" size={15} color="var(--muted)" /> My Profile
              </button>
              <button className="dropdown-item">
                <SvgIcon name="lock" size={15} color="var(--muted)" /> Change Password
              </button>
              <button className="dropdown-item">
                <SvgIcon name="palette" size={15} color="var(--muted)" /> Preferences
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={logout}>
                <SvgIcon name="logout" size={15} color="var(--danger)" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Topbar;
