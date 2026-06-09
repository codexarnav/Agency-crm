// Workspace / Settings Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK, DESIGNATION_OPTIONS, ACCESS_TYPES, ROLE_META } from "../shared/constants";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, Avatar, StatusBadge,
  ProgressBar, DataTable, SearchBar,
} from "../shared/components";
import { getManagers, createManager, getEmployees, createEmployee, updateUser, deleteUser, getManagersPerformance } from "../services/api";

// AddUserModal
function AddUserModal({ open, onClose, initial, onSave, employees, users }) {
  const blank = { name: "", email: "", phone: "", designation: "", department: "", skills: [], accessType: "employee", assignedManager: "", password: "", availability: "available", notes: "" };
  const [form, setForm] = useState({ ...blank, ...(initial || {}) });
  const [errors, setErrors] = useState({});
  useEffect(() => { setForm({ ...blank, ...(initial || {}) }); setErrors({}); }, [open]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const managers = (users || []).filter(u => u.role === "manager");
  const validate = () => { const e = {}; if (!form.name.trim()) e.name = "Name is required"; if (!form.email.trim()) e.email = "Email is required"; else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email"; if (!form.designation) e.designation = "Designation is required"; if (!form.accessType) e.accessType = "Access type is required"; if (!initial && !form.password.trim()) e.password = "Password is required"; setErrors(e); return !Object.keys(e).length; };
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit User" : "Add New User"} size="lg"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => { if (validate()) onSave(form); }}>{initial ? "Save Changes" : "Add User"}</Btn></>}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Basic Info</p>
      <div className="grid-2">
        <FormInput label="Full Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" error={errors.name} />
        <FormInput label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@agency.com" error={errors.email} />
      </div>
      <div className="grid-2">
        <FormInput label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 99000 00000" />
        <FormInput label="Department / Skill Category" value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Production, Creative" />
      </div>
      <div className="divider" style={{ margin: "4px 0 14px" }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Role and Access</p>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Designation *</label>
          <select className={`form-input ${errors.designation ? "error" : ""}`} value={form.designation} onChange={e => set("designation", e.target.value)}>
            <option value="">Select designation...</option>
            {DESIGNATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.designation && <p className="form-error">{errors.designation}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Account Access Type *</label>
          <select className={`form-input ${errors.accessType ? "error" : ""}`} value={form.accessType} onChange={e => set("accessType", e.target.value)}>
            {ACCESS_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          {errors.accessType && <p className="form-error">{errors.accessType}</p>}
        </div>
      </div>
      <div style={{ background: "var(--light-orange)", border: "1px solid rgba(255,106,0,0.2)", borderRadius: 9, padding: "9px 13px", marginBottom: 14, fontSize: 12.5, color: "var(--deep)" }}>
        Access Type controls the dashboard and sidebar. A "Team Lead" with "Manager" access type gets Manager-level access.
      </div>
      {(form.accessType === "employee" || form.accessType === "accountmanager") && (
        <div className="form-group">
          <label className="form-label">Assigned Manager</label>
          <select className="form-input" value={form.assignedManager} onChange={e => set("assignedManager", e.target.value)}>
            <option value="">Select manager...</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <div className="divider" style={{ margin: "4px 0 14px" }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Credentials and Status</p>
      <div className="grid-2">
        <FormInput label={initial ? "New Password (leave blank to keep)" : "Temporary Password *"} type="password" value={form.password || ""} onChange={e => set("password", e.target.value)} placeholder="Min. 6 characters" error={errors.password} />
        <div className="form-group">
          <label className="form-label">Availability Status</label>
          <select className="form-input" value={form.availability} onChange={e => set("availability", e.target.value)}>
            {[["available", "Available"], ["busy", "Busy"], ["on_leave", "On Leave"], ["not_available", "Not Available"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <FormInput label="Notes" type="textarea" value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Any notes about this team member..." />
    </Modal>
  );
}
function performanceStatus(pct) {
  if (pct >= 90) return { label: "Excellent", color: "#16A34A", bg: "#DCFCE7" };
  if (pct >= 75) return { label: "Good", color: "#0EA5E9", bg: "#DBEAFE" };
  if (pct >= 50) return { label: "Needs Attention", color: "#F59E0B", bg: "#FEF9C3" };
  return { label: "Critical", color: "#DC2626", bg: "#FEE2E2" };
}

function WorkspacePage() {
  const { session, showToast, clients, tasks, employees, refreshEmployees } = useApp();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [managersPerfData, setManagersPerfData] = useState([]);
  const [perfLoading, setPerfLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const [mgrRes, empRes] = await Promise.all([getManagers(), getEmployees()]);

      const mgrList = (mgrRes.data || []).map(u => ({
        ...u,
        name: u.username,
        role: u.designation === "Account Manager" ? "accountmanager" : "manager"
      }));

      const empList = (empRes.data || []).map(u => ({
        ...u,
        name: u.username,
        role: u.designation === "Account Manager" ? "accountmanager" : "employee"
      }));

      const superAdminUser = session?.role === "superadmin" ? [{
        id: session.id,
        name: session.name,
        email: session.email,
        role: "superadmin",
        designation: "Super Admin",
        department: "Management",
        active: true
      }] : [];

      setUsers([...superAdminUser, ...mgrList, ...empList]);
    } catch (err) {
      console.error("Failed to load workspace users:", err);
      showToast("Failed to load workspace users.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    setPerfLoading(true);
    try {
      const res = await getManagersPerformance();
      if (res.success) {
        setManagersPerfData(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load workspace performance metrics:", err);
      showToast("Failed to load workspace performance metrics.", "danger");
    } finally {
      setPerfLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (tab === "performance") {
      fetchPerformance();
    }
  }, [tab]);

  const [filterAccess, setFilterAccess] = useState("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allUsers = users;
  const filtered = allUsers.filter(u => (filterAccess === "all" || u.role === filterAccess) && (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.designation || "").toLowerCase().includes(search.toLowerCase())));

  const handleSave = async (form) => {
    const isEdit = !!editUser;
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      designation: form.accessType === "accountmanager" ? "Account Manager" : form.designation,
      department: form.department,
      skills: form.skills || [],
      availability: form.availability,
      notes: form.notes,
      assignedManager: form.assignedManager || null,
      role: form.accessType
    };

    try {
      if (isEdit) {
        await updateUser(editUser.id, payload);
        showToast(`User "${form.name}" updated successfully.`, "success");
      } else {
        if (form.accessType === "manager") {
          await createManager(payload);
        } else {
          await createEmployee(payload);
        }
        showToast(`User "${form.name}" added successfully.`, "success");
      }
      if (refreshEmployees) refreshEmployees();
      fetchUsers();
      setAddOpen(false);
      setEditUser(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save user.", "danger");
    }
  };

  const handleDelete = async (u) => {
    try {
      await deleteUser(u.id);
      showToast(`User "${u.name}" removed successfully.`, "danger");
      if (refreshEmployees) refreshEmployees();
      fetchUsers();
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to remove user.", "danger");
    }
  };

  const managers = allUsers.filter(u => u.role === "manager");
  const ams = allUsers.filter(u => u.role === "accountmanager");

  const managerPerf = (mgr) => {
    const mc = clients.filter(c => c.assignedManager === mgr.id);
    const me = employees.filter(e => e.assignedManager === mgr.id || e.managerId === mgr.id || users.find(u => u.id === e.id)?.managerId === mgr.id); const mt = tasks.filter(t => mc.some(c => c.id === t.clientId)); const comp = mt.filter(t => t.productionStatus === "completed").length; const over = mt.filter(t => t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed").length; const pct = mt.length ? Math.round((comp / mt.length) * 100) : 0; return { clients: mc.length, employees: me.length, tasks: mt.length, completed: comp, overdue: over, pct, status: performanceStatus(pct) };
  };
  const amPerf = (am) => { const ac = clients.filter(c => c.assignedAM === am.id); const at = tasks.filter(t => ac.some(c => c.id === t.clientId)); const comp = at.filter(t => t.productionStatus === "completed").length; const over = at.filter(t => t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed").length; const pct = at.length ? Math.round((comp / at.length) * 100) : 0; return { clients: ac.length, tasks: at.length, completed: comp, overdue: over, pct, status: performanceStatus(pct) }; };
  const roleColors = { superadmin: { bg: "#EEF2FF", color: "#4F46E5" }, manager: { bg: "var(--light-orange)", color: "var(--deep)" }, accountmanager: { bg: "#ECFDF5", color: "#059669" }, employee: { bg: "#EFF6FF", color: "#1D4ED8" } };
  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div><h1 className="page-title">Workspace</h1><p className="page-subtitle">Manage users, access levels, and performance.</p></div>
        <Btn icon={<SvgIcon name="arrowRight" size={13} color="#fff" />} onClick={() => { setEditUser(null); setAddOpen(true); }}>Add User</Btn>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {[{ id: "users", label: "All Users" }, { id: "performance", label: "Performance" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 18px", border: "none", borderRadius: "8px 8px 0 0", background: tab === t.id ? "var(--light-orange)" : "transparent", color: tab === t.id ? "var(--primary)" : "var(--muted)", fontWeight: tab === t.id ? 700 : 500, fontSize: 13.5, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", borderBottom: tab === t.id ? "2.5px solid var(--primary)" : "2.5px solid transparent" }}>{t.label}</button>
        ))}
      </div>
      {tab === "users" && (
        <div>
          <div className="grid-stats" style={{ marginBottom: 20 }}>
            {[["Total", allUsers.length, "var(--dark)"], ["Super Admins", allUsers.filter(u => u.role === "superadmin").length, "#4F46E5"], ["Managers", managers.length, "var(--primary)"], ["Account Managers", ams.length, "#059669"], ["Employees", allUsers.filter(u => u.role === "employee").length, "#1D4ED8"]].map(([l, v, c]) => (
              <div key={l} className="stat-card" style={{ padding: "12px 16px", textAlign: "center" }}><div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{l}</div></div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search users..." style={{ flex: "1 1 200px", minWidth: 180 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["all", "All"], ["superadmin", "Super Admin"], ["manager", "Manager"], ["accountmanager", "Account Manager"], ["employee", "Employee"]].map(([v, l]) => (
                <button key={v} className={`filter-chip ${filterAccess === v ? "active" : ""}`} onClick={() => setFilterAccess(v)} style={{ fontSize: 12 }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="grid-3">
            {filtered.length === 0 ? (<div style={{ gridColumn: "1/-1" }}><EmptyState icon={<SvgIcon name="users" size={28} color="var(--muted)" />} title="No users found" desc="Add your first team member." /></div>)
              : filtered.map(u => {
                const rc = roleColors[u.role] || roleColors.employee;
                const uClients = clients.filter(c => c.assignedAM === u.id || c.assignedManager === u.id).length;
                const uTasks = tasks.filter(t => t.assignedEmployeeId === u.id && t.productionStatus !== "completed").length;
                const mgr = allUsers.find(x => x.id === u.assignedManager);
                return (
                  <div key={u.id} className="card hover-lift" style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={u.name} size="lg" />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.designation || "'"}</div>
                          <div style={{ marginTop: 4 }}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: rc.bg, color: rc.color }}>{ROLE_META[u.role]?.label || u.role}</span></div>
                        </div>
                      </div>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: u.active !== false ? "var(--success)" : "#9CA3AF", display: "block", flexShrink: 0, marginTop: 4 }} />
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
                      <div style={{ marginBottom: 3 }}>{u.email}</div>
                      {u.department && <div>{u.department}</div>}
                      {mgr && <div>Reports to: <span style={{ fontWeight: 600, color: "var(--dark)" }}>{mgr.name}</span></div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {uClients > 0 && <span style={{ fontSize: 11.5, background: "#F3F4F6", padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: "var(--dark)" }}>{uClients} client{uClients > 1 ? "s" : ""}</span>}
                      {uTasks > 0 && <span style={{ fontSize: 11.5, background: "#FFF3E8", padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: "var(--primary)" }}>{uTasks} tasks</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <button onClick={() => setEditUser(u)} style={{ flex: 1, padding: "5px 10px", borderRadius: 7, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><SvgIcon name="pen" size={12} color="var(--muted)" />Edit</button>
                      {u.id !== session?.id && <button onClick={() => setDeleteTarget(u)} style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>Remove</button>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {tab === "performance" && (
        <div>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Manager Performance</h2>
            {perfLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Loading performance analytics...</div>
            ) : managersPerfData.length === 0 ? (
              <EmptyState icon={<SvgIcon name="users" size={28} color="var(--muted)" />} title="No managers performance data" desc="Add a Manager and create tasks/clients to see performance metrics." />
            ) : (
              <div className="grid-2">
                {managersPerfData.map(mgr => {
                  const compStatus = performanceStatus(mgr.completion);
                  const timeStatus = performanceStatus(mgr.timeliness);
                  
                  return (
                    <div key={mgr.id} className="card hover-lift" style={{ padding: "20px 24px", border: "1.5px solid var(--border)", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                        <Avatar name={mgr.name} size="lg" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--dark)" }}>{mgr.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{mgr.designation} - Manager</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: compStatus.bg, color: compStatus.color }}>
                            Comp: {mgr.completion}%
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: timeStatus.bg, color: timeStatus.color }}>
                            Time: {mgr.timeliness}%
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                        {[
                          ["Clients", mgr.clients, "var(--primary)"],
                          ["Employees", mgr.employees, "#1D4ED8"],
                          ["Tasks", mgr.tasks, "#6B7280"],
                          ["Shoots", mgr.shoots, "var(--purple)"],
                          ["Publishing Jobs", mgr.publishingJobs, "var(--success)"]
                        ].map(([l, v, c]) => (
                          <div key={l} style={{ textAlign: "center", padding: "10px 6px", background: "#F9FAFB", border: "1px solid var(--border)", borderRadius: 10 }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 19, fontWeight: 800, color: c }}>{v}</div>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                            <span style={{ color: "var(--muted)", fontWeight: 600 }}>Completion rate</span>
                            <span style={{ fontWeight: 700, color: compStatus.color }}>{mgr.completion}%</span>
                          </div>
                          <ProgressBar value={mgr.completion} max={100} height={6} color={compStatus.color} />
                        </div>
                        
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                            <span style={{ color: "var(--muted)", fontWeight: 600 }}>Posting timeliness</span>
                            <span style={{ fontWeight: 700, color: timeStatus.color }}>{mgr.timeliness}%</span>
                          </div>
                          <ProgressBar value={mgr.timeliness} max={100} height={6} color={timeStatus.color} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Account Manager Performance</h2>
            {ams.length === 0 ? <EmptyState icon={<SvgIcon name="handshake" size={28} color="var(--muted)" />} title="No account managers" desc="Add an Account Manager via Add User." /> : (
              <div className="grid-2">
                {ams.map(am => {
                  const p = amPerf(am); return (
                    <div key={am.id} className="card" style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <Avatar name={am.name} size="lg" />
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 15 }}>{am.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{am.designation} - Account Manager</div></div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: p.status.bg, color: p.status.color }}>{p.status.label}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                        {[["Clients", p.clients, "#FF6A00"], ["Tasks", p.tasks, "#6B7280"], ["Done", p.completed, "#16A34A"]].map(([l, v, c]) => (
                          <div key={l} style={{ textAlign: "center", padding: "8px", background: "#F9FAFB", borderRadius: 8 }}><div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div></div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}><span style={{ color: "var(--muted)" }}>Completion rate</span><span style={{ fontWeight: 700, color: p.status.color }}>{p.pct}%</span></div>
                      <ProgressBar value={p.pct} max={100} height={7} color={p.status.color} />
                      {p.overdue > 0 && <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>{p.overdue} overdue</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <AddUserModal open={addOpen || !!editUser} onClose={() => { setAddOpen(false); setEditUser(null); }} initial={editUser} onSave={handleSave} employees={employees} users={users} />
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove User" footer={<><Btn variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Btn><Btn variant="danger" onClick={() => handleDelete(deleteTarget)}>Remove</Btn></>}>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>Remove <strong>{deleteTarget?.name}</strong> from the workspace?</p>
      </Modal>
    </div>
  );
}

/* =============================================================
   EMPLOYEE WORKLOAD KANBAN (category-grouped, drag-to-reassign)
============================================================= */

export default WorkspacePage;
