// Employee Tasks Page (for employee role)
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar, FilterBar,
} from "../shared/components";
import {
  TaskDetailDrawer,
  ProdMBadge, PrioMBadge,
  PROD_STATUSES_LIST, PROD_LABELS_MAP,
} from "../shared/taskConstants";

function EmployeeTasksPage() {
  const { session, tasks, refreshTasks, employees } = useApp();
  const [filter, setFilter] = useState("today");
  const [selectedTask, setSelectedTask] = useState(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split("T")[0];
  const myTasks = tasks.filter(t => t.assignedEmployeeId === session?.id || t.employeeId === session?.id || t.assignedTo?.toLowerCase() === (session?.name || "").toLowerCase());
  const filtered = myTasks.filter(t => {
    if (filter === "today") return t.internalDeadline === todayStr || t.postingDate === todayStr || (t.internalDeadline && t.internalDeadline < todayStr && t.productionStatus !== "completed") || t.productionStatus === "changes_required";
    if (filter === "tomorrow") return t.internalDeadline === tomorrowStr || t.postingDate === tomorrowStr;
    if (filter === "this_week") { const wEnd = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0]; return t.internalDeadline >= todayStr && t.internalDeadline <= wEnd; }
    if (filter === "overdue") return t.internalDeadline && t.internalDeadline < todayStr && t.productionStatus !== "completed";
    if (filter === "changes") return t.productionStatus === "changes_required";
    return true;
  });
  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}><h1 className="page-title">My Tasks</h1><p className="page-subtitle">Tasks assigned to {session?.name?.split(" ")[0] || "you"}. Default: Today.</p></div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["today", "Today"], ["tomorrow", "Tomorrow"], ["this_week", "This Week"], ["overdue", "Overdue"], ["changes", "Changes Required"], ["all", "All My Tasks"]].map(([v, l]) => (
          <button key={v} className={`filter-chip ${filter === v ? "active" : ""}`} onClick={() => setFilter(v)} style={{ fontSize: 12 }}>{l}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={<SvgIcon name="checklist" size={28} color="var(--muted)" />} title={filter === "today" ? "No tasks due today" : "No tasks found"} desc="Check other filters or contact your manager." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => {
            const isOverdue = t.internalDeadline && t.internalDeadline < todayStr && t.productionStatus !== "completed";
            const isDueToday = t.internalDeadline === todayStr;
            const isChanges = t.productionStatus === "changes_required";
            return (
              <div key={t.id} onClick={() => setSelectedTask(t)} style={{ background: "#fff", border: `1.5px solid ${isOverdue ? "var(--danger)" : isChanges ? "#F59E0B" : "var(--border)"}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"} onMouseLeave={e => e.currentTarget.style.boxShadow = ""}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.contentDescription}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>{t.clientName} - {t.platform} - {t.contentType}</div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <ProdMBadge s={t.productionStatus} /><PrioMBadge s={t.priority} />
                      {isOverdue && <span style={{ fontSize: 11, fontWeight: 700, background: "#FEE2E2", color: "#B91C1C", padding: "2px 8px", borderRadius: 99 }}>Overdue</span>}
                      {isDueToday && !isOverdue && <span style={{ fontSize: 11, fontWeight: 700, background: "#FEF9C3", color: "#854D0E", padding: "2px 8px", borderRadius: 99 }}>Due Today</span>}
                      {isChanges && <span style={{ fontSize: 11, fontWeight: 700, background: "#FEF9C3", color: "#854D0E", padding: "2px 8px", borderRadius: 99 }}>Changes Required</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Deadline: {t.internalDeadline || "--"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Post: {t.postingDate || "--"}</div>
                  </div>
                </div>
                {t.clientFeedback && isChanges && <div style={{ marginTop: 10, padding: "8px 12px", background: "#FEF3C7", borderRadius: 7, fontSize: 12.5, color: "#854D0E" }}><strong>Feedback:</strong> {t.clientFeedback}</div>}
              </div>
            );
          })}
        </div>
      )}
      <TaskDetailDrawer task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} employees={employees} onStatusUpdate={updated => { setSelectedTask(updated); }} />
    </div>
  );
}

/* =============================================================
   EMPLOYEE DEADLINES PAGE
============================================================= */

export default EmployeeTasksPage;
