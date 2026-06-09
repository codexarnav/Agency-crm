// Activity Log Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK, ROLE_META, ACTION_META } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, Avatar,
} from "../shared/components";
import { getActivityLogs, getManagers, getEmployees } from "../services/api";

function ActivityLogPage() {
  const { clients, employees, session } = useApp();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("timeline");
  const [filterAction, setFilterAction] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [logsRes, mgrRes, empRes] = await Promise.all([
          getActivityLogs(),
          getManagers(),
          getEmployees()
        ]);
        
        setLogs(logsRes.data || []);
        
        const mgrList = (mgrRes.data || []).map(u => ({
          id: u.id,
          name: u.username,
          role: u.designation === "Account Manager" ? "accountmanager" : "manager"
        }));
        const empList = (empRes.data || []).map(u => ({
          id: u.id,
          name: u.username,
          role: u.designation === "Account Manager" ? "accountmanager" : "employee"
        }));
        
        const superAdminUser = session?.role === "superadmin" ? [{
          id: session.id,
          name: session.name,
          role: "superadmin"
        }] : [];
        
        setUsers([...superAdminUser, ...mgrList, ...empList]);
      } catch (err) {
        console.error("Failed to load activity logs data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [session]);

  const allUsers = [
    ...users,
    ...employees.map(e => ({ id: e.id, name: e.name || e.username, role: "employee" })),
  ];

  const getUserInfo = (userId) => {
    const u = allUsers.find(x => x.id === userId);
    if (u) return u;
    const emp = employees.find(e => e.id === userId);
    if (emp) return { name: emp.username || emp.name, role: "employee" };
    return { name: userId || "System", role: "system" };
  };

  const filtered = logs.filter(log => {
    const matchAction = filterAction === "all" || log.action === filterAction;
    const matchClient = filterClient === "all" || log.details?.clientId === filterClient || (log.details?.clientName && clients.find(c => c.id === filterClient)?.name === log.details.clientName);
    const matchEmployee = filterEmployee === "all" || log.userId === filterEmployee;
    const u = getUserInfo(log.userId);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchDate = (!dateFrom || new Date(log.timestamp) >= new Date(dateFrom)) &&
      (!dateTo || new Date(log.timestamp) <= new Date(dateTo + "T23:59:59"));
    const matchSearch = !search || log.action.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());
    return matchAction && matchClient && matchEmployee && matchRole && matchDate && matchSearch;
  });

  const actionTypes = [...new Set(logs.map(l => l.action))].sort();

  const fmt = (ts) => new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const buildDescription = (log) => {
    const d = log.details || {};
    const m = ACTION_META[log.action];
    const base = m?.label || log.action.replace(/_/g, " ");
    if (d.clientName) return `${base}  -  ${d.clientName}`;
    if (d.taskTitle || d.contentType) return `${base}  -  ${d.taskTitle || d.contentType}`;
    if (d.employeeName) return `${base}  -  ${d.employeeName}`;
    if (d.companyName) return `${base}  -  ${d.companyName}`;
    if (d.from && d.to) return `${base}: ${d.from} -> ${d.to}`;
    return base;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", color: "var(--muted)" }}>
        <span className="spin" style={{ display: "inline-block", width: 32, height: 32, border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
        <p style={{ marginTop: 16, fontWeight: 600, fontSize: 14 }}>Loading activity logs...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-subtitle">{filtered.length} events  -  full audit trail</p>
        </div>
        <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {["timeline", "table"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", background: view === v ? "var(--light-orange)" : "transparent", border: "none", cursor: "pointer", color: view === v ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: view === v ? 700 : 500, display: "flex", alignItems: "center", gap: 6 }}>
              <SvgIcon name={v === "timeline" ? "barchart" : "checklist"} size={13} color={view === v ? "var(--primary)" : "var(--muted)"} />
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Action Type</label>
            <select className="form-input" value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{ACTION_META[a]?.label || a.replace(/_/g, " ")}</option>)}
            </select>
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
              <option value="all">All Users</option>
              {[...users, ...employees].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Role</label>
            <select className="form-input" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="all">All Roles</option>
              {["superadmin", "manager", "accountmanager", "employee", "client"].map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>From Date</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 12.5 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>To Date</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: 12.5 }} />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Search</label>
            <SearchBar value={search} onChange={setSearch} placeholder="Search..." style={{ width: "100%" }} />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <Btn variant="ghost" size="sm" onClick={() => { setFilterAction("all"); setFilterClient("all"); setFilterEmployee("all"); setFilterRole("all"); setDateFrom(""); setDateTo(""); setSearch(""); }}>
              Clear Filters
            </Btn>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<SvgIcon name="clock" size={28} color="var(--muted)" />} title="No activity found" desc="Try adjusting your filters." />
      ) : view === "timeline" ? (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div className="approval-timeline">
            {filtered.slice(0, 100).map((log, i) => {
              const u = getUserInfo(log.userId);
              const m = ACTION_META[log.action] || { label: log.action, color: "#6B7280", icon: "alert" };
              const isLast = i === filtered.slice(0, 100).length - 1;
              return (
                <div key={log.id} className="timeline-step">
                  <div className="timeline-dot-col">
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: m.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${m.color}30` }}>
                      <SvgIcon name={m.icon} size={14} color={m.color} />
                    </div>
                    {!isLast && <div className="timeline-line" style={{ minHeight: 16 }} />}
                  </div>
                  <div className="timeline-content">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                      <span className="timeline-title">{buildDescription(log)}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: m.color + "18", color: m.color }}>{m.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={u.name} size={18} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {u.name} . <span style={{ textTransform: "capitalize" }}>{ROLE_META[u.role]?.label || u.role}</span>
                      </span>
                      <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>{fmt(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > 100 && <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 14 }}>Showing 100 of {filtered.length} events</p>}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Action", "By", "Role", "Description", "Timestamp"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((log, i) => {
                  const u = getUserInfo(log.userId);
                  const m = ACTION_META[log.action] || { label: log.action, color: "#6B7280", icon: "alert" };
                  return (
                    <tr key={log.id} onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: m.color + "18", color: m.color }}>
                          <SvgIcon name={m.icon} size={11} color={m.color} />{m.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <Avatar name={u.name} size={22} />
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>{ROLE_META[u.role]?.label || u.role}</span></td>
                      <td style={{ padding: "10px 12px", maxWidth: 280 }}><span style={{ fontSize: 12.5, color: "var(--dark)" }}>{buildDescription(log)}</span></td>
                      <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{fmt(log.timestamp)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>Showing 200 of {filtered.length} events</p>}
        </div>
      )}
    </div>
  );
}

const AUDIENCE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "all_clients", label: "All Clients" },
  { value: "all_employees", label: "All Employees" },
  { value: "specific_client", label: "Specific Client" },
  { value: "specific_employee", label: "Specific Employee" },
  { value: "managers_only", label: "Managers Only" },
  { value: "account_managers", label: "Account Managers Only" },
];


export default ActivityLogPage;
