// Workspace / Settings Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK, DESIGNATION_OPTIONS, ACCESS_TYPES, ROLE_META } from "../shared/constants";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, Avatar, StatusBadge,
  ProgressBar, DataTable, SearchBar,
} from "../shared/components";
import { getManagers, createManager, getEmployees, createEmployee, updateUser, deleteUser, getManagersPerformance } from "../services/api";
import { TaskDetailDrawer } from "../shared/taskConstants";

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

/* =============================================================
   COMPACT USER CARD COMPONENT
============================================================= */
function CompactUserCard({ u, allUsers, clients, tasks, employees, session, onEdit, onDelete, onView, openDropdownUserId, setOpenDropdownUserId }) {
  const rc = {
    superadmin: { bg: "#EEF2FF", color: "#4F46E5" },
    manager: { bg: "var(--light-orange)", color: "var(--deep)" },
    accountmanager: { bg: "#ECFDF5", color: "#059669" },
    employee: { bg: "#EFF6FF", color: "#1D4ED8" }
  }[u.role] || { bg: "#EFF6FF", color: "#1D4ED8" };

  const isOnline = u.availability === "available" || u.active !== false;

  let lastActive = "Active now";
  if (u.availability === "busy") lastActive = "1h ago";
  else if (u.availability === "on_leave") lastActive = "2d ago";
  else if (u.availability === "not_available") lastActive = "4h ago";
  else if (u.active === false) lastActive = "3d ago";

  let metricChips = null;
  if (u.role === "superadmin" || u.role === "manager") {
    const reportsCount = employees.filter(e => e.assignedManager === u.id || e.managerId === u.id).length;
    const clientCount = clients.filter(c => c.assignedManager === u.id).length;
    const activeTasksCount = tasks.filter(t => clients.some(c => c.id === t.clientId && c.assignedManager === u.id) && t.productionStatus !== "completed").length;

    metricChips = (
      <>
        <span style={{ fontSize: 11, background: "#F3F4F6", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--dark)" }} title="Team Members">
          <span>👥</span> {reportsCount} Member{reportsCount !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 11, background: "#EFF6FF", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "#1D4ED8" }} title="Clients">
          <span>📁</span> {clientCount} Client{clientCount !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 11, background: "#FFF3E8", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--primary)" }} title="Active Tasks">
          <span>✅</span> {activeTasksCount} Task{activeTasksCount !== 1 ? "s" : ""}
        </span>
      </>
    );
  } else if (u.role === "accountmanager") {
    const clientCount = clients.filter(c => c.assignedAM === u.id).length;
    const pendingApprovalsCount = tasks.filter(t => clients.some(c => c.id === t.clientId && c.assignedAM === u.id) && t.approvalStatus === "pending").length;
    const scheduledCount = tasks.filter(t => clients.some(c => c.id === t.clientId && c.assignedAM === u.id) && t.publishingStatus === "scheduled").length;

    metricChips = (
      <>
        <span style={{ fontSize: 11, background: "#EFF6FF", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "#1D4ED8" }} title="Managed Clients">
          <span>📁</span> {clientCount} Client{clientCount !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 11, background: "#FEF2F2", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--danger)" }} title="Pending Approvals">
          <span>⏳</span> {pendingApprovalsCount} Pending
        </span>
        <span style={{ fontSize: 11, background: "#ECFDF5", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--success)" }} title="Scheduled Content">
          <span>📅</span> {scheduledCount} Scheduled
        </span>
      </>
    );
  } else {
    const mgr = allUsers.find(x => x.id === u.assignedManager);
    const clientCount = clients.filter(c => tasks.some(t => t.clientId === c.id && t.assignedEmployeeId === u.id)).length;
    const activeTasksCount = tasks.filter(t => t.assignedEmployeeId === u.id && t.productionStatus !== "completed").length;

    metricChips = (
      <>
        {mgr && (
          <span style={{ fontSize: 11, background: "#F3F4F6", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--dark)" }} title={`Reports to ${mgr.name}`}>
            <span>👤</span> Mgr: {mgr.name.split(" ")[0]}
          </span>
        )}
        <span style={{ fontSize: 11, background: "#EFF6FF", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "#1D4ED8" }} title="Assigned Clients">
          <span>📁</span> {clientCount} Client{clientCount !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 11, background: "#FFF3E8", padding: "2px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--primary)" }} title="Active Tasks">
          <span>✅</span> {activeTasksCount} Task{activeTasksCount !== 1 ? "s" : ""}
        </span>
      </>
    );
  }

  return (
    <div 
      className="card hover-lift" 
      style={{ 
        padding: "12px 14px", 
        cursor: "pointer", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        minHeight: 145, 
        maxHeight: 170,
        boxShadow: "0 1.5px 4px rgba(0,0,0,0.04)", 
        border: "1px solid var(--border)",
        borderRadius: "14px"
      }}
      onClick={() => onView(u)}
    >
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <Avatar name={u.name} src={u.profilePicture} size="md" />
              <span 
                style={{ 
                  position: "absolute", bottom: -1, right: -1, width: 8, height: 8, 
                  borderRadius: "50%", background: isOnline ? "var(--success)" : "#9CA3AF", 
                  border: "1.5px solid #fff" 
                }} 
              />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "var(--dark)" }}>{u.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: rc.bg, color: rc.color }}>
                  {ROLE_META[u.role]?.label || u.role}
                </span>
              </div>
            </div>
          </div>

          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setOpenDropdownUserId(openDropdownUserId === u.id ? null : u.id); 
              }} 
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: 14, color: "var(--muted)", fontWeight: "bold" }}
            >
              ⋮
            </button>
            {openDropdownUserId === u.id && (
              <div 
                style={{ 
                  position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid var(--border)", 
                  borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 120, minWidth: 100 
                }}
              >
                <button 
                  onClick={() => { onEdit(u); setOpenDropdownUserId(null); }} 
                  style={{ width: "100%", textAlign: "left", padding: "6px 10px", background: "none", border: "none", fontSize: 11.5, cursor: "pointer", fontWeight: 600, color: "var(--dark)" }}
                  onMouseEnter={e => e.target.style.background = "#f5f5f5"}
                  onMouseLeave={e => e.target.style.background = "none"}
                >
                  Edit
                </button>
                {u.id !== session?.id && (
                  <button 
                    onClick={() => { onDelete(u); setOpenDropdownUserId(null); }} 
                    style={{ width: "100%", textAlign: "left", padding: "6px 10px", background: "none", border: "none", fontSize: 11.5, color: "var(--danger)", cursor: "pointer", fontWeight: 600 }}
                    onMouseEnter={e => e.target.style.background = "#fef2f2"}
                    onMouseLeave={e => e.target.style.background = "none"}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>
          <a href={`mailto:${u.email}`} style={{ color: "var(--muted)", textDecoration: "none" }} onClick={e => e.stopPropagation()}>{u.email}</a>
          {u.department && <div style={{ marginTop: 2, fontWeight: 500 }}>Team: <span style={{ color: "var(--dark)" }}>{u.department}</span></div>}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          {metricChips}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F3F4F6", paddingTop: 6 }}>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>Last active: {lastActive}</span>
          <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => onView(u)} 
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
            >
              View
            </button>
            <button 
              onClick={() => onEdit(u)} 
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   RIGHT-SIDE SLIDE-OVER PROFILE DRAWER
============================================================= */
function ProfileDrawer({ user, open, onClose, employees, tasks, clients, allUsers }) {
  if (!open || !user) return null;
  
  const uClients = clients.filter(c => c.assignedAM === user.id || c.assignedManager === user.id);
  const uTasks = tasks.filter(t => t.assignedEmployeeId === user.id);
  const activeTasks = uTasks.filter(t => t.productionStatus !== "completed");
  
  const userLogs = (MOCK.activityLogs || []).filter(log => log.userId === user.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(0, 0, 0, 0.45)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div 
        className="drawer-slide-in"
        style={{ 
          width: "min(520px, 100vw)", 
          height: "100%", 
          background: "var(--card)", 
          boxShadow: "-4px 0 28px rgba(0,0,0,0.15)", 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden"
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "18px 24px", borderBottom: "1.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "var(--dark)" }}>Profile details</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 24, display: "flex", alignItems: "center" }}>&times;</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", paddingBottom: 20, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
            <Avatar name={user.name} src={user.profilePicture} size="lg" style={{ width: 80, height: 80, fontSize: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--dark)" }}>{user.name}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{user.designation || "No Designation"}</p>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "var(--light-orange)", color: "var(--primary)" }}>
                  {user.role?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>User Information</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Email Address", user.email],
                  ["Phone Number", user.phoneNumber || user.phone || "—"],
                  ["Team / Department", user.department || "—"],
                  ["Availability Status", <span style={{ textTransform: "capitalize", fontWeight: 600, color: user.availability === "available" ? "var(--success)" : "var(--warning)" }}>{(user.availability || "available").replace("_", " ")}</span>],
                  ["Reports to", allUsers.find(x => x.id === user.assignedManager)?.name || "—"]
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f9fafb", paddingBottom: 6, fontSize: 13 }}>
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>{lbl}</span>
                    <span style={{ color: "var(--dark)", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Workload & Clients</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#F9FAFB", border: "1px solid var(--border)", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{activeTasks.length}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Active Tasks</div>
                </div>
                <div style={{ background: "#F9FAFB", border: "1px solid var(--border)", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dark)" }}>{uClients.length}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Assigned Clients</div>
                </div>
              </div>
            </div>

            {activeTasks.length > 0 && (
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Active Tasks ({activeTasks.length})</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                  {activeTasks.map(t => (
                    <div key={t.id} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                        <div style={{ fontWeight: 600, color: "var(--dark)" }}>{t.contentDescription}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{t.clientName} &bull; {t.platform}</div>
                      </div>
                      <StatusBadge label={t.productionStatus.replace("_", " ")} s={t.productionStatus} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uClients.length > 0 && (
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Assigned Clients ({uClients.length})</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {uClients.map(c => (
                    <span key={c.id} style={{ fontSize: 12, background: "#EFF6FF", color: "#1D4ED8", padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Activity History</h4>
              {userLogs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No recent actions logged for this user.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 6 }}>
                  {userLogs.slice(0, 5).map(log => (
                    <div key={log.id} style={{ display: "flex", gap: 10, position: "relative" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ color: "var(--dark)", fontWeight: 500 }}>
                          {log.action.replace("_", " ")}
                        </span>
                        {log.details?.taskTitle && <span>: {log.details.taskTitle}</span>}
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{new Date(log.timestamp).toLocaleDateString()} &bull; {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspacePage({ teamOnly = false }) {
  const { session, showToast, clients, tasks, employees, refreshEmployees, refreshTasks } = useApp();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const [openDropdownUserId, setOpenDropdownUserId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleCloseDropdown = () => setOpenDropdownUserId(null);
    window.addEventListener("click", handleCloseDropdown);
    return () => window.removeEventListener("click", handleCloseDropdown);
  }, []);

  const [managersPerfData, setManagersPerfData] = useState([]);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    if (teamOnly) {
      setTab("users");
    }
  }, [teamOnly]);

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
          showToast(`Manager "${form.name}" added successfully and login credentials have been emailed.`, "success");
        } else {
          await createEmployee(payload);
          showToast(`User "${form.name}" added successfully and login credentials have been emailed.`, "success");
        }
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
        <div>
          <h1 className="page-title">{teamOnly ? "Team" : "Workspace"}</h1>
          <p className="page-subtitle">{teamOnly ? "Manage employees and managers." : "Manage users, access levels, and performance."}</p>
        </div>
        <Btn icon={<SvgIcon name="arrowRight" size={13} color="#fff" />} onClick={() => { setEditUser(null); setAddOpen(true); }}>Add User</Btn>
      </div>

      {!teamOnly && (
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
          {[{ id: "users", label: "All Users" }, { id: "performance", label: "Performance" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 18px", border: "none", borderRadius: "8px 8px 0 0", background: tab === t.id ? "var(--light-orange)" : "transparent", color: tab === t.id ? "var(--primary)" : "var(--muted)", fontWeight: tab === t.id ? 700 : 500, fontSize: 13.5, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", borderBottom: tab === t.id ? "2.5px solid var(--primary)" : "2.5px solid transparent" }}>{t.label}</button>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div>
          {/* Horizontal KPI Grid */}
          {!teamOnly && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
              {[
                ["Users", allUsers.length, "👤", "var(--primary)"],
                ["Clients", clients.length, "📁", "#059669"],
                ["Tasks", tasks.filter(t => t.productionStatus !== "completed").length, "✅", "#1D4ED8"]
              ].map(([l, v, icon, c]) => (
                <div key={l} style={{ background: "var(--card)", padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${c}10`, color: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold" }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dark)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{l}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {teamOnly ? (
            /* TEAM ONLY PAGE: Plain cards list with 3 columns */
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <SearchBar value={search} onChange={setSearch} placeholder="Search users..." style={{ flex: "1 1 200px", minWidth: 180 }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["all", "All"], ["superadmin", "Super Admin"], ["manager", "Manager"], ["accountmanager", "Account Manager"], ["employee", "Employee"]].map(([v, l]) => (
                    <button key={v} className={`filter-chip ${filterAccess === v ? "active" : ""}`} onClick={() => setFilterAccess(v)} style={{ fontSize: 12 }}>{l}</button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState icon={<SvgIcon name="users" size={28} color="var(--muted)" />} title="No users found" desc="Add your first team member." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {filtered.filter(u => u.role === "superadmin" || u.role === "manager").length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Managers</h3>
                      <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
                        {filtered.filter(u => u.role === "superadmin" || u.role === "manager").map(u => (
                          <CompactUserCard 
                            key={u.id}
                            u={u}
                            allUsers={allUsers}
                            clients={clients}
                            tasks={tasks}
                            employees={employees}
                            session={session}
                            onEdit={setEditUser}
                            onDelete={setDeleteTarget}
                            onView={setSelectedUserProfile}
                            openDropdownUserId={openDropdownUserId}
                            setOpenDropdownUserId={setOpenDropdownUserId}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filtered.filter(u => u.role === "superadmin" || u.role === "manager").length > 0 && 
                   filtered.filter(u => u.role === "employee" || u.role === "accountmanager").length > 0 && (
                    <div style={{ borderTop: "2.5px dashed var(--border)", margin: "8px 0" }} />
                  )}

                  {filtered.filter(u => u.role === "employee" || u.role === "accountmanager").length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Employees & Account Managers</h3>
                      <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
                        {filtered.filter(u => u.role === "employee" || u.role === "accountmanager").map(u => (
                          <CompactUserCard 
                            key={u.id}
                            u={u}
                            allUsers={allUsers}
                            clients={clients}
                            tasks={tasks}
                            employees={employees}
                            session={session}
                            onEdit={setEditUser}
                            onDelete={setDeleteTarget}
                            onView={setSelectedUserProfile}
                            openDropdownUserId={openDropdownUserId}
                            setOpenDropdownUserId={setOpenDropdownUserId}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* WORKSPACE DASHBOARD VIEW: 2-column Layout */
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>
              {/* Left Column: Team Overview & Hierarchy Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 1. Team Overview */}
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--dark)" }}>1. Team Overview</h3>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search team..." style={{ padding: "4px 8px", minWidth: 140, fontSize: 11.5 }} />
                  </div>
                  
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {[["all", "All"], ["superadmin", "Super Admin"], ["manager", "Manager"], ["accountmanager", "Account AM"], ["employee", "Employee"]].map(([v, l]) => (
                      <button key={v} className={`filter-chip ${filterAccess === v ? "active" : ""}`} onClick={() => setFilterAccess(v)} style={{ fontSize: 11, padding: "3px 8px" }}>{l}</button>
                    ))}
                  </div>

                  {filtered.length === 0 ? (
                    <div style={{ padding: "20px 0" }}>
                      <EmptyState icon={<SvgIcon name="users" size={22} color="var(--muted)" />} title="No users found" desc="" />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {filtered.filter(u => u.role === "superadmin" || u.role === "manager").length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Managers</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                            {filtered.filter(u => u.role === "superadmin" || u.role === "manager").map(u => (
                              <CompactUserCard 
                                key={u.id}
                                u={u}
                                allUsers={allUsers}
                                clients={clients}
                                tasks={tasks}
                                employees={employees}
                                session={session}
                                onEdit={setEditUser}
                                onDelete={setDeleteTarget}
                                onView={setSelectedUserProfile}
                                openDropdownUserId={openDropdownUserId}
                                setOpenDropdownUserId={setOpenDropdownUserId}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {filtered.filter(u => u.role === "superadmin" || u.role === "manager").length > 0 && 
                       filtered.filter(u => u.role === "employee" || u.role === "accountmanager").length > 0 && (
                        <div style={{ borderTop: "2px dashed var(--border)", margin: "4px 0" }} />
                      )}

                      {filtered.filter(u => u.role === "employee" || u.role === "accountmanager").length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Employees & Account Managers</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                            {filtered.filter(u => u.role === "employee" || u.role === "accountmanager").map(u => (
                              <CompactUserCard 
                                key={u.id}
                                u={u}
                                allUsers={allUsers}
                                clients={clients}
                                tasks={tasks}
                                employees={employees}
                                session={session}
                                onEdit={setEditUser}
                                onDelete={setDeleteTarget}
                                onView={setSelectedUserProfile}
                                openDropdownUserId={openDropdownUserId}
                                setOpenDropdownUserId={setOpenDropdownUserId}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Team Hierarchy Preview */}
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--dark)", marginBottom: 12 }}>4. Team Hierarchy Preview</h3>
                  {(() => {
                    const managersList = allUsers.filter(u => u.role === "superadmin" || u.role === "manager");
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {managersList.map(mgr => {
                          const reports = allUsers.filter(u => u.assignedManager === mgr.id);
                          return (
                            <div key={mgr.id} style={{ background: "#FAFAFA", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: reports.length > 0 ? 10 : 0 }}>
                                <Avatar name={mgr.name} src={mgr.profilePicture} size="sm" />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--dark)" }}>{mgr.name}</div>
                                  <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{mgr.designation || "Manager"}</div>
                                </div>
                              </div>
                              {reports.length > 0 && (
                                <div style={{ borderLeft: "2px solid var(--border)", marginLeft: 14, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                                  {reports.map(emp => (
                                    <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <Avatar name={emp.name} src={emp.profilePicture} size="sm" style={{ width: 22, height: 22, fontSize: 9 }} />
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: 11.5, color: "var(--dark)" }}>{emp.name}</div>
                                        <div style={{ fontSize: 9.5, color: "var(--muted)" }}>{emp.designation || "Employee"}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Pending Work & Recent Activity */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 3. Pending Work */}
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--dark)", marginBottom: 12 }}>3. Pending Work</h3>
                  {(() => {
                    const pendingTasks = tasks.filter(t => 
                      t.productionStatus === "ready_for_review" || 
                      t.approvalStatus === "pending" || 
                      (t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed")
                    );

                    if (pendingTasks.length === 0) {
                      return <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>No urgent pending work. Good job!</div>;
                    }

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {pendingTasks.slice(0, 5).map(t => {
                          const isOverdue = t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed";
                          return (
                            <div 
                              key={t.id} 
                              onClick={() => { setSelectedTask(t); setDrawerOpen(true); }}
                              style={{ 
                                padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "#fff", 
                                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                                transition: "all 0.12s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                            >
                              <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.contentDescription}</div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{t.clientName} &bull; {t.platform}</div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                                <StatusBadge label={t.productionStatus.replace("_", " ")} s={t.productionStatus} />
                                {t.internalDeadline && (
                                  <span style={{ fontSize: 9.5, color: isOverdue ? "var(--danger)" : "var(--muted)", fontWeight: isOverdue ? 700 : 500 }}>
                                    {isOverdue ? "Overdue" : t.internalDeadline}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Recent Activity */}
                <div className="card" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--dark)", marginBottom: 12 }}>2. Recent Activity</h3>
                  {(() => {
                    const activity = (MOCK.activityLogs || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    if (activity.length === 0) {
                      return <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>No recent activity.</div>;
                    }
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {activity.slice(0, 5).map(log => {
                          const logUser = allUsers.find(x => x.id === log.userId);
                          return (
                            <div key={log.id} style={{ display: "flex", gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginTop: 5, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 12.5, color: "var(--dark)" }}>
                                  <strong style={{ fontWeight: 700 }}>{logUser ? logUser.name : "System"}</strong> {log.action.replace("_", " ")}
                                  {log.details?.taskTitle && <span>: {log.details.taskTitle}</span>}
                                </div>
                                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
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
      
      <ProfileDrawer
        user={selectedUserProfile}
        open={!!selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
        employees={employees}
        tasks={tasks}
        clients={clients}
        allUsers={allUsers}
      />

      <TaskDetailDrawer 
        task={selectedTask} 
        open={drawerOpen} 
        onClose={() => { setDrawerOpen(false); setSelectedTask(null); }} 
        employees={employees} 
        onStatusUpdate={updated => { 
          const all = LSUtils.getData(LS_KEYS.TASKS) || []; 
          LSUtils.setData(LS_KEYS.TASKS, all.map(t => t.id === updated.id ? updated : t)); 
          refreshTasks(); 
          setSelectedTask(updated); 
        }} 
      />

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
