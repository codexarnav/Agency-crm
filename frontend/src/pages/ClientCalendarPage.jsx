// Client Calendar Page (for client role)
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, FilterBar,
} from "../shared/components";
import { ProdMBadge, PrioMBadge, TaskDetailDrawer } from "../shared/taskConstants";

function ClientCalendarPage() {
  const { session } = useApp();
  const allClients = LSUtils.getData(LS_KEYS.CLIENTS) || MOCK.clients;
  const employees = LSUtils.getData(LS_KEYS.EMPLOYEES) || MOCK.employees;
  const clientRecord = allClients.find(c => c.id === session?.id || c.email === session?.email || c.id === "client_1");
  const clientId = clientRecord?.id || "client_1";
  const allTasks = (LSUtils.getData(LS_KEYS.TASKS) || MOCK.tasks).filter(t => t.clientId === clientId);
  const today = new Date();
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = fmt(today);
  const byDate = allTasks.reduce((a, t) => { if (t.postingDate) { (a[t.postingDate] = a[t.postingDate] || []).push(t); } return a; }, {});
  const first = new Date(curYear, curMonth, 1), last = new Date(curYear, curMonth + 1, 0), cells = [];
  for (let i = 0; i < first.getDay(); i++)cells.unshift({ date: new Date(curYear, curMonth, -i), other: true });
  for (let d = 1; d <= last.getDate(); d++)cells.push({ date: new Date(curYear, curMonth, d), other: false });
  const rem = 7 - (cells.length % 7); if (rem < 7) for (let d = 1; d <= rem; d++)cells.push({ date: new Date(curYear, curMonth + 1, d), other: true });
  const stats = { planned: allTasks.length, pending: allTasks.filter(t => t.approvalStatus === "sent_to_client").length, approved: allTasks.filter(t => ["client_approved", "final_approved"].includes(t.approvalStatus)).length, posted: allTasks.filter(t => t.publishingStatus === "posted").length };
  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 14 }}><h1 className="page-title">My Content Calendar</h1><p className="page-subtitle">Content scheduled for {clientRecord?.name || "your account"}.</p></div>
      <div className="grid-stats" style={{ marginBottom: 14 }}>
        {[["Planned", stats.planned, "var(--primary)"], ["Pending", stats.pending, "#F59E0B"], ["Approved", stats.approved, "#16A34A"], ["Posted", stats.posted, "#059669"]].map(([l, v, c]) => (
          <div key={l} className="stat-card" style={{ padding: "12px 14px", textAlign: "center" }}><div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15 }}>{monthNames[curMonth]} {curYear}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="filter-chip" onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); }}>Today</button>
          <button className="filter-chip" onClick={() => { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); } else setCurMonth(m => m - 1); }}>Prev</button>
          <button className="filter-chip" onClick={() => { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); } else setCurMonth(m => m + 1); }}>Next</button>
        </div>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ padding: "9px 6px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((cell, i) => {
            const ds = fmt(cell.date), dt = byDate[ds] || [], isToday = ds === todayStr;
            return (
              <div key={i} style={{ border: "1px solid var(--border)", padding: "5px", minHeight: 80, background: isToday ? "var(--light-orange)" : cell.other ? "#F9FAFB" : "#fff", opacity: cell.other ? 0.5 : 1 }}>
                <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "var(--primary)" : "transparent", color: isToday ? "#fff" : "#374151" }}>{cell.date.getDate()}</span>
                {dt.slice(0, 2).map(t => { const [bg, fg] = t.approvalStatus === "client_approved" || t.approvalStatus === "final_approved" ? ["#D1FAE5", "#065F46"] : t.approvalStatus === "sent_to_client" ? ["#FFF3E8", "#E95A00"] : ["#F3F4F6", "#374151"]; return <div key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ marginTop: 2, padding: "2px 5px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: bg, color: fg, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.contentType}</div>; })}
                {dt.length > 2 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 3 }}>+{dt.length - 2}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedTask(null); }} employees={employees} onStatusUpdate={() => { }} />
    </div>
  );
}



export default ClientCalendarPage;
