// Agency Task Overview Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  FilterBar, DataTable,
} from "../shared/components";
import {
  TaskDetailDrawer, TaskCreateModal,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  PROD_LABELS_MAP, APPROV_LABELS_MAP,
  PROD_STATUSES_LIST, APPROV_STATUSES_LIST,
  PUB_STATUSES_LIST, PUB_LABELS_MAP, PRIORITIES_LIST, PRIO_LABELS_MAP, PLATFORMS_LIST,
} from "../shared/taskConstants";

function getDaysLeft(dateStr) {
  if (!dateStr) return " - ";
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(target);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "1d overdue";
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  return `${diffDays} days left`;
}

function AgencyTaskOverviewPage() {
  const { clients, employees, session, showToast, tasks, refreshTasks } = useApp();
  const [viewBy, setViewBy] = useState("client");
  const [selClient, setSelClient] = useState("all");
  const [selEmployee, setSelEmployee] = useState("all");
  const [filterProd, setFilterProd] = useState("all");
  const [filterApprov, setFilterApprov] = useState("all");
  const [filterPub, setFilterPub] = useState("all");
  const [filterPrio, setFilterPrio] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);

  let filtered = [...tasks];
  if (viewBy === "client" && selClient !== "all") filtered = filtered.filter(t => t.clientId === selClient);
  if (viewBy === "employee" && selEmployee !== "all") filtered = filtered.filter(t => t.assignedEmployeeId === selEmployee);
  if (filterProd !== "all") filtered = filtered.filter(t => t.productionStatus === filterProd);
  if (filterApprov !== "all") filtered = filtered.filter(t => t.approvalStatus === filterApprov);
  if (filterPub !== "all") filtered = filtered.filter(t => t.publishingStatus === filterPub);
  if (filterPrio !== "all") filtered = filtered.filter(t => t.priority === filterPrio);
  if (filterPlatform !== "all") filtered = filtered.filter(t => t.platform === filterPlatform);

  const sorted = [...filtered].sort((a, b) => new Date(a.internalDeadline || "9999") - new Date(b.internalDeadline || "9999"));

  const stats = { total: filtered.length, inProd: filtered.filter(t => t.productionStatus === "in_progress").length, review: filtered.filter(t => t.productionStatus === "ready_for_review").length, approved: filtered.filter(t => ["client_approved", "final_approved"].includes(t.approvalStatus)).length, overdue: filtered.filter(t => t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed").length, blocked: filtered.filter(t => t.productionStatus === "blocked").length };

  const groupedTasks = {};
  sorted.forEach(t => {
    const key = t.postingDate || "Unscheduled";
    if (!groupedTasks[key]) {
      groupedTasks[key] = {
        date: t.postingDate,
        day: t.day || "",
        tasks: []
      };
    }
    groupedTasks[key].tasks.push(t);
  });

  const sortedDateKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a) - new Date(b);
  });

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Agency Task Overview</h1>
          <p className="page-subtitle">Full pipeline visibility by client or employee.</p>
        </div>
        <Btn icon={<SvgIcon name="arrowRight" size={13} color="#fff" />} onClick={() => setTaskCreateOpen(true)}>New Task</Btn>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {["client", "employee"].map(v => <button key={v} onClick={() => setViewBy(v)} style={{ padding: "7px 16px", background: viewBy === v ? "var(--light-orange)" : "transparent", border: "none", cursor: "pointer", color: viewBy === v ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: viewBy === v ? 700 : 500 }}>{v === "client" ? "Client View" : "Employee View"}</button>)}
        </div>
        {viewBy === "client" ? (
          <select value={selClient} onChange={e => setSelClient(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 160, fontSize: 13 }}>
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <select value={selEmployee} onChange={e => setSelEmployee(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 180, fontSize: 13 }}>
            <option value="all">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.designation}</option>)}
          </select>
        )}
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        {[["Total", stats.total, "var(--dark)"], ["In Prod", stats.inProd, "#1D4ED8"], ["In Review", stats.review, "#7C3AED"], ["Approved", stats.approved, "#16A34A"], ["Overdue", stats.overdue, "var(--danger)"], ["Blocked", stats.blocked, "var(--warning)"]].map(([l, v, c]) => (
          <div key={l} className="stat-card" style={{ padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          [filterProd, setFilterProd, [["all", "All Status"], ...PROD_STATUSES_LIST.map(s => [s, PROD_LABELS_MAP[s]])]],
          [filterApprov, setFilterApprov, [["all", "All Approval"], ...APPROV_STATUSES_LIST.map(s => [s, APPROV_LABELS_MAP[s]])]],
          [filterPub, setFilterPub, [["all", "All Pub"], ...PUB_STATUSES_LIST.map(s => [s, PUB_LABELS_MAP[s]])]],
          [filterPrio, setFilterPrio, [["all", "All Priority"], ...PRIORITIES_LIST.map(p => [p, PRIO_LABELS_MAP[p]])]],
          [filterPlatform, setFilterPlatform, [["all", "All Platforms"], ...PLATFORMS_LIST.map(p => [p, p])]],
        ].map(([val, setter, opts], i) => (
          <select key={i} value={val} onChange={e => setter(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 130, fontSize: 12.5 }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)", alignSelf: "center" }}>{filtered.length} tasks</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sortedDateKeys.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <EmptyState icon={<SvgIcon name="checklist" size={28} color="var(--primary)" />} title="No tasks found" desc="Try adjusting your filters." />
          </div>
        ) : (
          sortedDateKeys.map(dateKey => {
            const group = groupedTasks[dateKey];
            const dateTitle = dateKey === "Unscheduled" 
              ? "📋 Unscheduled Tasks" 
              : `📅 ${new Date(group.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}`;
            
            return (
              <div key={dateKey} className="card" style={{ overflow: "hidden" }}>
                <div style={{ background: "#F3F4F6", padding: "10px 16px", borderBottom: "1.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--dark)" }}>{dateTitle}</span>
                  <span className="badge badge-muted" style={{ fontSize: 11, background: "#E5E7EB", color: "var(--dark)" }}>{group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#F9FAFB" }}>
                        {["Client", "Task", "Platform", "Assigned", "Deadline", "Prod Status", "Approval", "Publishing"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1.5px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.tasks.map(t => {
                        const emp = employees.find(e => e.id === t.assignedEmployeeId);
                        const isOverdue = t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed";
                        return (
                          <tr key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ cursor: "pointer", borderBottom: "1px solid #F3F4F6" }} onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                            <td style={{ padding: "10px 12px", fontSize: 12.5, fontWeight: 600 }}>{t.clientName}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <span style={{ fontWeight: 700, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--dark)" }}>{t.contentDescription}</span>
                                {(t.priority === "high" || t.priority === "urgent") && (
                                  <span 
                                    onClick={(e) => { e.stopPropagation(); alert("High Priority"); }} 
                                    style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--danger)", marginLeft: 6, cursor: "pointer", flexShrink: 0 }} 
                                  />
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.contentType}{t.assignmentType === "ai_assigned" ? <span style={{ marginLeft: 5 }}><AIBadgeSmall /></span> : null}</div>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 12.5 }}>{t.platform}</td>
                            <td style={{ padding: "10px 12px" }}>{emp ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar name={emp.name || emp.username} size={22} /><span style={{ fontSize: 12 }}>{(emp.name || emp.username || "").split(" ")[0]}</span></div> : <span style={{ color: "#9CA3AF", fontSize: 12 }}> - </span>}</td>
                            <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 12.5, color: isOverdue ? "var(--danger)" : "#374151", fontWeight: isOverdue ? 700 : 400 }}>{getDaysLeft(t.internalDeadline)}{isOverdue && " !"}</span></td>
                            <td style={{ padding: "10px 12px" }}><ProdMBadge s={t.productionStatus} /></td>
                            <td style={{ padding: "10px 12px" }}><ApprovMBadge s={t.approvalStatus} /></td>
                            <td style={{ padding: "10px 12px" }}><PubMBadge s={t.publishingStatus} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedTask(null); }} employees={employees} onStatusUpdate={updated => { const all = LSUtils.getData(LS_KEYS.TASKS) || []; LSUtils.setData(LS_KEYS.TASKS, all.map(t => t.id === updated.id ? updated : t)); refreshTasks(); setSelectedTask(updated); }} />
      <TaskCreateModal open={taskCreateOpen} onClose={() => { setTaskCreateOpen(false); refreshTasks(); }} />
    </div>
  );
}

/* -- Employee Kanban Page -- */

export default AgencyTaskOverviewPage;
