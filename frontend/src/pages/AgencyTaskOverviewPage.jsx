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

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Task", "Client", "Platform", "Assigned", "Deadline", "Prod Status", "Approval", "Publishing", "Priority"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No tasks match the current filters.</td></tr>
                : sorted.map(t => {
                  const emp = employees.find(e => e.id === t.assignedEmployeeId);
                  const isOverdue = t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed";
                  return (
                    <tr key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "11px 12px" }}>
                        <div style={{ fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.contentDescription}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.contentType}{t.assignmentType === "ai_assigned" ? <span style={{ marginLeft: 5 }}><AIBadgeSmall /></span> : null}</div>
                      </td>
                      <td style={{ padding: "11px 12px", fontSize: 12.5 }}>{t.clientName}</td>
                      <td style={{ padding: "11px 12px", fontSize: 12.5 }}>{t.platform}</td>
                      <td style={{ padding: "11px 12px" }}>{emp ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar name={emp.name || emp.username} size={22} /><span style={{ fontSize: 12 }}>{(emp.name || emp.username || "").split(" ")[0]}</span></div> : <span style={{ color: "#9CA3AF", fontSize: 12 }}> - </span>}</td>
                      <td style={{ padding: "11px 12px" }}><span style={{ fontSize: 12.5, color: isOverdue ? "var(--danger)" : "#374151", fontWeight: isOverdue ? 700 : 400 }}>{t.internalDeadline || " - "}{isOverdue && " !"}</span></td>
                      <td style={{ padding: "11px 12px" }}><ProdMBadge s={t.productionStatus} /></td>
                      <td style={{ padding: "11px 12px" }}><ApprovMBadge s={t.approvalStatus} /></td>
                      <td style={{ padding: "11px 12px" }}><PubMBadge s={t.publishingStatus} /></td>
                      <td style={{ padding: "11px 12px" }}><PrioMBadge s={t.priority} /></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedTask(null); }} employees={employees} onStatusUpdate={updated => { const all = LSUtils.getData(LS_KEYS.TASKS) || []; LSUtils.setData(LS_KEYS.TASKS, all.map(t => t.id === updated.id ? updated : t)); refreshTasks(); setSelectedTask(updated); }} />
      <TaskCreateModal open={taskCreateOpen} onClose={() => { setTaskCreateOpen(false); refreshTasks(); }} />
    </div>
  );
}

/* -- Employee Kanban Page -- */

export default AgencyTaskOverviewPage;
