// Employee Dashboard
import { useState } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
  Avatar, StatusBadge, Btn,
} from "../shared/components";

function EmployeeDashboard({ setPage }) {
  const { tasks, session, announcements } = useApp();
  // Filter for logged-in employee tasks
  const myTasks = tasks.filter(t => t.assignedEmployeeId === session?.id || t.employeeId === session?.id || t.assignedTo?.toLowerCase().includes(session?.name?.split(" ")[0]?.toLowerCase() || ""));

  const kanbanCols = [
    { id: "todo", label: "To Do", color: "#6B7280", bg: "#F3F4F6" },
    { id: "in_progress", label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE" },
    { id: "ready_for_review", label: "In Review", color: "#7C3AED", bg: "#EDE9FE" },
    { id: "changes_required", label: "Changes Required", color: "#F59E0B", bg: "#FEF9C3" },
  ];

  return (
    <div className="fade-in">
      <RoleBanner session={session} />
      <AnnouncementBanner announcements={announcements} />
      <QuickActions role="employee" setPage={setPage} />

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <AnimStatCard label="My Tasks" value={myTasks.length} sub="Assigned to you" iconName="checklist" iconBg="#EFF6FF" iconColor="#1D4ED8" delay={0} />
        <AnimStatCard label="In Progress" value={myTasks.filter(t => t.productionStatus === "in_progress").length} sub="Currently working" iconName="repeat" iconBg="#FFF3E8" iconColor="#FF6A00" delay={80} />
        <AnimStatCard label="In Review" value={myTasks.filter(t => t.productionStatus === "ready_for_review").length} sub="Awaiting feedback" iconName="alert" iconBg="#FFFBEB" iconColor="#F59E0B" delay={160} />
        <AnimStatCard label="Due This Week" value={myTasks.filter(t => { const d = new Date(t.internalDeadline || t.postingDate); const n = new Date(); return d >= n && d <= new Date(n.getTime() + 7 * 86400000); }).length} sub="Don't miss" trend="down" iconName="clock" iconBg="#FEE2E2" iconColor="#B91C1C" delay={240} />
      </div>

      {/* Mini kanban */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Kanban Overview</span>
          <span className="section-link" onClick={() => setPage("kanban")}>Full Board</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {kanbanCols.map(col => {
            const colTasks = myTasks.filter(t => t.productionStatus === col.id);
            return (
              <div key={col.id} className="kanban-col">
                <div className="kanban-col-header">
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 11, background: col.bg, color: col.color, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>Empty</div>
                ) : colTasks.slice(0, 2).map(t => (
                  <div key={t.id} className="kanban-task">
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }} className="truncate">{t.contentDescription}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{t.clientName}</span>
                      <StatusBadge status={t.priority} />
                    </div>
                  </div>
                ))}
                {colTasks.length > 2 && (
                  <div style={{ fontSize: 11, color: "var(--primary)", textAlign: "center", marginTop: 4, cursor: "pointer" }} onClick={() => setPage("kanban")}>+{colTasks.length - 2} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">My Upcoming Deadlines</span></div>
          <div className="card-body" style={{ paddingTop: 12 }}><UpcomingDeadlines tasks={myTasks} /></div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">My Tasks</span></div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Task</th><th>Client</th><th>Status</th></tr></thead>
              <tbody>
                {myTasks.slice(0, 5).map(t => (
                  <tr key={t.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 12.5, maxWidth: 160 }} className="truncate">{t.contentDescription}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{t.contentType}</div></td>
                    <td style={{ fontSize: 12.5 }}>{t.clientName}</td>
                    <td><StatusBadge status={t.productionStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;
