// Reports Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, Avatar, StatusBadge,
} from "../shared/components";
import { ProdMBadge, ApprovMBadge, PubMBadge } from "../shared/taskConstants";

// Report helpers
function csvDownload(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")).join("\n");
  const blob = new Blob([headers.join(",") + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function StatMini({ label, value, color = "var(--primary)", bg = "var(--light-orange)" }) {
  return (
    <div className="stat-card" style={{ textAlign: "center", padding: "14px 10px" }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function ReportTable({ columns, data, emptyMsg = "No data found." }) {
  if (!data.length) return <p style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>{emptyMsg}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#F9FAFB" }}>
            {columns.map(c => <th key={c.key} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"} onMouseLeave={e => e.currentTarget.style.background = ""}>
              {columns.map(c => <td key={c.key} style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", verticalAlign: "middle" }}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? "-")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =============================================================
   REPORTS PAGE
============================================================= */

function ReportsPage() {
  const { clients, employees, session, showToast, tasks } = useApp();
  const role = session?.role || "manager";

  const today = new Date();
  const [filterMonth, setFilterMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [filterClient, setFilterClient] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterContentType, setFilterContentType] = useState("all");
  const [activeReport, setActiveReport] = useState("overview");

  const allTasks = tasks;
  const allRevisions = LSUtils.getData(LS_KEYS.REVISIONS) || MOCK.revisions || [];

  // Apply filters
  const filtered = allTasks.filter(t => {
    const inMonth = !filterMonth || (t.postingDate || t.createdAt || "").startsWith(filterMonth);
    const inClient = filterClient === "all" || t.clientId === filterClient;
    const inEmp = filterEmployee === "all" || t.assignedEmployeeId === filterEmployee;
    const inPlat = filterPlatform === "all" || t.platform === filterPlatform;
    const inType = filterContentType === "all" || t.contentType === filterContentType;
    // AM sees only assigned clients
    if (role === "accountmanager") {
      const myClients = clients.filter(c => c.assignedAM === session?.id || c.assignedAM === "user_mgr1").map(c => c.id);
      if (!myClients.includes(t.clientId)) return false;
    }
    return inMonth && inClient && inEmp && inPlat && inType;
  });

  // Summary stats
  const stats = {
    planned: filtered.length,
    completed: filtered.filter(t => t.productionStatus === "completed").length,
    approved: filtered.filter(t => ["client_approved", "final_approved"].includes(t.approvalStatus)).length,
    posted: filtered.filter(t => t.publishingStatus === "posted").length,
    pendingApproval: filtered.filter(t => t.approvalStatus === "sent_to_client").length,
    overdue: filtered.filter(t => t.internalDeadline && new Date(t.internalDeadline) < today && t.productionStatus !== "completed").length,
  };

  // Most overloaded employee
  const empTaskCounts = {};
  filtered.forEach(t => { if (t.assignedEmployeeId) empTaskCounts[t.assignedEmployeeId] = (empTaskCounts[t.assignedEmployeeId] || 0) + 1; });
  const topEmpId = Object.entries(empTaskCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topEmp = employees.find(e => e.id === topEmpId);

  // Client with highest revision count
  const clientRevMap = {};
  allRevisions.forEach(r => {
    const t = allTasks.find(x => x.id === r.taskId);
    if (t) clientRevMap[t.clientId] = (clientRevMap[t.clientId] || 0) + 1;
  });
  const topRevClientId = Object.entries(clientRevMap).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topRevClient = clients.find(c => c.id === topRevClientId);

  // Report-specific datasets
  const reports = {
    overview: filtered,
    monthly_completion: filtered.filter(t => t.productionStatus === "completed"),
    client_pending: filtered.filter(t => t.productionStatus !== "completed"),
    approval_delay: filtered.filter(t => t.approvalStatus === "sent_to_client"),
    employee_productivity: employees.map(emp => ({
      name: emp.name,
      designation: emp.designation,
      assigned: filtered.filter(t => t.assignedEmployeeId === emp.id).length,
      completed: filtered.filter(t => t.assignedEmployeeId === emp.id && t.productionStatus === "completed").length,
      overdue: filtered.filter(t => t.assignedEmployeeId === emp.id && t.internalDeadline && new Date(t.internalDeadline) < today && t.productionStatus !== "completed").length,
    })),
    overdue: filtered.filter(t => t.internalDeadline && new Date(t.internalDeadline) < today && t.productionStatus !== "completed"),
    revisions: allRevisions.filter(r => {
      const t = allTasks.find(x => x.id === r.taskId);
      return t && (filterClient === "all" || t.clientId === filterClient);
    }).map(r => {
      const t = allTasks.find(x => x.id === r.taskId);
      return { ...r, clientName: t?.clientName || "-", contentDesc: t?.contentDescription || "-" };
    }),
    posted: filtered.filter(t => t.publishingStatus === "posted"),
    pending_approval: filtered.filter(t => ["pending", "sent_to_client"].includes(t.approvalStatus)),
    workload: employees.map(emp => {
      const active = filtered.filter(t => t.assignedEmployeeId === emp.id && t.productionStatus !== "completed").length;
      return { name: emp.name, designation: emp.designation, active, completed: filtered.filter(t => t.assignedEmployeeId === emp.id && t.productionStatus === "completed").length, level: active <= 3 ? "Light" : active <= 7 ? "Balanced" : active <= 10 ? "Heavy" : "Overloaded" };
    }),
  };

  const reportTabs = [
    { id: "overview", label: "Overview" },
    { id: "monthly_completion", label: "Monthly Completion" },
    { id: "client_pending", label: "Client Pending" },
    { id: "approval_delay", label: "Approval Delay" },
    { id: "employee_productivity", label: "Employee Productivity" },
    { id: "overdue", label: "Overdue Tasks" },
    { id: "revisions", label: "Revision Report" },
    { id: "posted", label: "Posted Content" },
    { id: "pending_approval", label: "Pending Approval" },
    { id: "workload", label: "Workload Distribution" },
  ];

  const handleCSV = () => {
    const data = reports[activeReport];
    if (!data.length) { showToast("No data to export.", "warning"); return; }
    csvDownload(`report_${activeReport}_${filterMonth}.csv`, data);
    showToast("CSV exported.", "success");
  };

  const handlePrint = () => { window.print(); };

  // Column configs per report
  const columnConfigs = {
    overview: [
      { key: "clientName", label: "Client" },
      { key: "contentDescription", label: "Description", render: v => <span style={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span> },
      { key: "platform", label: "Platform" },
      { key: "contentType", label: "Type" },
      { key: "postingDate", label: "Post Date" },
      { key: "productionStatus", label: "Production", render: v => <ProdMBadge s={v} /> },
      { key: "approvalStatus", label: "Approval", render: v => <ApprovMBadge s={v} /> },
      { key: "publishingStatus", label: "Publishing", render: v => <PubMBadge s={v} /> },
    ],
    employee_productivity: [
      { key: "name", label: "Employee" },
      { key: "designation", label: "Role" },
      { key: "assigned", label: "Assigned" },
      { key: "completed", label: "Completed" },
      { key: "overdue", label: "Overdue", render: v => <span style={{ color: v > 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>{v}</span> },
    ],
    revisions: [
      { key: "clientName", label: "Client" },
      { key: "contentDesc", label: "Content" },
      { key: "feedbackBy", label: "Feedback By" },
      { key: "feedbackComment", label: "Comment", render: v => <span style={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span> },
      { key: "createdAt", label: "Date", render: v => v ? new Date(v).toLocaleDateString("en-IN") : "-" },
    ],
    workload: [
      { key: "name", label: "Employee" },
      { key: "designation", label: "Role" },
      { key: "active", label: "Active Tasks" },
      { key: "completed", label: "Completed" },
      {
        key: "level", label: "Workload", render: v => {
          const colors = { Light: "#16A34A", Balanced: "#1D4ED8", Heavy: "#F59E0B", Overloaded: "#DC2626" };
          return <span style={{ fontWeight: 700, color: colors[v] || "var(--muted)" }}>{v}</span>;
        }
      },
    ],
  };

  const defaultCols = columnConfigs.overview;
  const activeCols = columnConfigs[activeReport] || defaultCols;
  const activeData = reports[activeReport] || [];

  const platforms = [...new Set(allTasks.map(t => t.platform).filter(Boolean))];
  const contentTypes = [...new Set(allTasks.map(t => t.contentType).filter(Boolean))];

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Insights across clients, employees, and content pipeline.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" size="sm" icon={<SvgIcon name="barchart" size={13} color="var(--muted)" />} onClick={handleCSV}>Export CSV</Btn>
          <Btn variant="ghost" size="sm" icon={<SvgIcon name="image" size={13} color="var(--muted)" />} onClick={handlePrint}>Print</Btn>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatMini label="Planned" value={stats.planned} color="var(--primary)" />
        <StatMini label="Completed" value={stats.completed} color="#1D4ED8" />
        <StatMini label="Approved" value={stats.approved} color="#16A34A" />
        <StatMini label="Posted" value={stats.posted} color="#059669" />
        <StatMini label="Pending Approval" value={stats.pendingApproval} color="#F59E0B" />
        <StatMini label="Overdue" value={stats.overdue} color="var(--danger)" />
      </div>

      {/* KPI cards row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SvgIcon name="users" size={18} color="var(--danger)" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Most Overloaded Employee</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15 }}>{topEmp?.name || "N/A"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{topEmp ? `${empTaskCounts[topEmpId]} tasks` : "No data"}</div>
          </div>
        </div>
        <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF9C3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SvgIcon name="repeat" size={18} color="#854D0E" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Highest Revision Client</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15 }}>{topRevClient?.name || "N/A"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{topRevClient ? `${clientRevMap[topRevClientId]} revisions` : "No revisions"}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Month</label>
            <input type="month" className="form-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: 12.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Client</label>
            <select className="form-input" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Employee</label>
            <select className="form-input" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Platform</label>
            <select className="form-input" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Platforms</option>
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Content Type</label>
            <select className="form-input" value={filterContentType} onChange={e => setFilterContentType(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Types</option>
              {contentTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <Btn variant="ghost" size="sm" onClick={() => { setFilterMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`); setFilterClient("all"); setFilterEmployee("all"); setFilterPlatform("all"); setFilterContentType("all"); }}>Reset</Btn>
          </div>
        </div>
      </div>

      {/* Report tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
        {reportTabs.map(t => (
          <button key={t.id} onClick={() => setActiveReport(t.id)} style={{ padding: "7px 14px", borderRadius: "8px 8px 0 0", border: "none", background: activeReport === t.id ? "var(--light-orange)" : "transparent", color: activeReport === t.id ? "var(--primary)" : "var(--muted)", fontWeight: activeReport === t.id ? 700 : 500, fontSize: 12.5, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap", borderBottom: activeReport === t.id ? "2.5px solid var(--primary)" : "2.5px solid transparent", flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active report table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14 }}>{reportTabs.find(t => t.id === activeReport)?.label}</span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{activeData.length} records</span>
        </div>
        <ReportTable columns={activeCols} data={activeData} />
      </div>
    </div>
  );
}

export default ReportsPage;

