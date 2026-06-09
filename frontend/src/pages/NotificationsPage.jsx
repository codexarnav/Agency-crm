// Notifications Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, StatusBadge,
} from "../shared/components";
import { markNotificationRead, deleteNotification } from "../services/api";

function NotificationsPage() {
  const { session, notifications, refreshNotifications, showToast } = useApp();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const notifs = (notifications || []).map(n => ({
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
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const refresh = async () => {
    try {
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      const unreads = (notifications || []).filter(n => !n.isRead);
      await Promise.all(unreads.map(n => markNotificationRead(n.id)));
      await refreshNotifications();
    } catch (err) {
      showToast("Failed to mark notifications read.", "danger");
    }
  };

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await deleteNotification(id);
      await refreshNotifications();
      showToast("Notification deleted.", "success");
    } catch (err) {
      showToast("Failed to delete notification.", "danger");
    }
  };

  const typeFilters = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "task", label: "Tasks" },
    { value: "approval", label: "Approvals" },
    { value: "deadline", label: "Deadlines" },
    { value: "overdue", label: "Overdue" },
    { value: "feedback", label: "Feedback" },
    { value: "announcement", label: "Announcements" },
  ];

  const notifMeta = {
    task: { iconName: "checklist", color: "#1D4ED8", bg: "#DBEAFE", label: "Task" },
    feedback: { iconName: "chat", color: "#059669", bg: "#DCFCE7", label: "Feedback" },
    deadline: { iconName: "clock", color: "#F59E0B", bg: "#FEF9C3", label: "Deadline" },
    overdue: { iconName: "alert", color: "#DC2626", bg: "#FEE2E2", label: "Overdue" },
    approval: { iconName: "check", color: "#16A34A", bg: "#DCFCE7", label: "Approval" },
    announcement: { iconName: "megaphone", color: "#FF6A00", bg: "#FFF3E8", label: "Announcement" },
    info: { iconName: "alert", color: "#6B7280", bg: "#F3F4F6", label: "Info" },
  };

  const filtered = notifs.filter(n => {
    const matchType = filter === "all" || (filter === "unread" ? !n.read : n.type === filter);
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "yesterday" : `${days}d ago`;
  };

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread . {notifs.length} total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && <Btn variant="outline" size="sm" onClick={markAllRead}>Mark All Read</Btn>}
          <Btn variant="ghost" size="sm" onClick={refresh}><SvgIcon name="repeat" size={13} color="var(--muted)" /> Refresh</Btn>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", v: notifs.length, c: "var(--dark)" },
          { label: "Unread", v: unreadCount, c: "var(--primary)" },
          { label: "Deadlines", v: notifs.filter(n => n.type === "deadline" || n.type === "overdue").length, c: "#F59E0B" },
          { label: "Approvals", v: notifs.filter(n => n.type === "approval").length, c: "#16A34A" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {typeFilters.map(f => (
            <button key={f.value} className={`filter-chip ${filter === f.value ? "active" : ""}`} onClick={() => setFilter(f.value)} style={{ fontSize: 12 }}>
              {f.label}
              {f.value !== "all" && f.value !== "unread" && (
                <span style={{ marginLeft: 3, opacity: 0.6 }}>{notifs.filter(n => n.type === f.value).length}</span>
              )}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search notifications..." style={{ marginLeft: "auto", minWidth: 200 }} />
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<SvgIcon name="bell" size={28} color="var(--muted)" />} title="No notifications" desc="You're all caught up! Notifications will appear here." />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {filtered.map((n, i) => {
            const m = notifMeta[n.type] || notifMeta.info;
            return (
              <div
                key={n.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderBottom: i < filtered.length - 1 ? "1px solid #F3F4F6" : "none", background: !n.read ? "#FFFCF8" : "#fff", transition: "background 0.15s", cursor: "pointer" }}
                onClick={() => markRead(n.id)}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                onMouseLeave={e => e.currentTarget.style.background = !n.read ? "#FFFCF8" : "#fff"}
              >
                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: 10, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SvgIcon name={m.iconName} size={17} color={m.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: !n.read ? 800 : 600, fontSize: 13.5, color: "var(--dark)" }}>{n.title}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 3 }}>{n.message}</p>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{timeAgo(n.createdAt)}</span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                  {!n.read && (
                    <button onClick={e => { e.stopPropagation(); markRead(n.id); }} style={{ padding: "3px 8px", borderRadius: 6, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Read</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} style={{ padding: "3px 7px", borderRadius: 6, border: "1.5px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: 11.5, color: "var(--danger)", fontWeight: 600 }}>x</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
