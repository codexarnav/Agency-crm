// Team / Employee Management Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  FilterBar, Modal, FormInput, DataTable, ProgressBar,
} from "../shared/components";
import ComingSoonPage from "./ComingSoonPage";

// TasksPage (Agency Task Overview variant for manager)
function TasksPage() {
  const { tasks, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.productionStatus === "pending").length,
    in_progress: tasks.filter(t => t.productionStatus === "in_progress" || t.productionStatus === "production").length,
    review: tasks.filter(t => t.productionStatus === "review").length,
    approved: tasks.filter(t => t.productionStatus === "approved").length,
  };

  const filtered = tasks.filter(t => {
    const matchSearch = t.clientName.toLowerCase().includes(search.toLowerCase()) || t.contentDescription.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.productionStatus === filter || (filter === "in_progress" && t.productionStatus === "production");
    return matchSearch && matchFilter;
  });

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Content Tasks</h1>
          <p className="page-subtitle">{tasks.length} tasks across {[...new Set(tasks.map(t => t.clientId))].length} clients</p>
        </div>
        <Btn icon={<SvgIcon name="arrowRight" size={14} color="#fff" />} onClick={() => showToast("Full task module coming next!", "info")}>New Task</Btn>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks..." style={{ flex: "1 1 220px", minWidth: 200 }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FilterBar
          filters={[
            { label: "All Tasks", value: "all", count: counts.all },
            { label: "Pending", value: "pending", count: counts.pending },
            { label: "In Progress", value: "in_progress", count: counts.in_progress },
            { label: "In Review", value: "review", count: counts.review },
            { label: "Approved", value: "approved", count: counts.approved },
          ]}
          active={filter} onChange={setFilter}
        />
      </div>

      <div className="card">
        <DataTable
          columns={[
            {
              key: "contentDescription", label: "Task", render: (v, row) => (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, maxWidth: 220 }} className="truncate">{v}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                    <span className="badge badge-muted" style={{ fontSize: 10.5, marginRight: 4 }}>{row.platform}</span>
                    {row.contentType}
                  </div>
                </div>
              )
            },
            { key: "clientName", label: "Client" },
            {
              key: "assignedTo", label: "Assigned To", hideOnMobile: true, render: (v) => (
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Avatar name={v} size="sm" />
                  <span style={{ fontSize: 12.5 }}>{v.split(" ")[0]}</span>
                </div>
              )
            },
            { key: "internalDeadline", label: "Deadline", hideOnMobile: true, render: (v) => <span style={{ fontSize: 12.5 }}>{v}</span> },
            { key: "priority", label: "Priority", render: (v) => <StatusBadge status={v} /> },
            { key: "productionStatus", label: "Status", render: (v) => <StatusBadge status={v} /> },
          ]}
          data={filtered}
          onRowClick={setSelected}
          emptyState={<EmptyState icon={<SvgIcon name="checklist" size={28} color="var(--primary)" />} title="No tasks found" desc="Try a different filter." />}
        />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task Detail" size="lg"
        footer={<><Btn variant="outline" onClick={() => setSelected(null)}>Close</Btn><Btn onClick={() => showToast("Full task editor coming next!", "info")}>Edit Task</Btn></>}
      >
        {selected && (
          <div>
            <div style={{ background: "var(--light-orange)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{selected.contentDescription}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="badge badge-orange">{selected.platform}</span>
                <span className="badge badge-muted">{selected.contentType}</span>
                <StatusBadge status={selected.priority} />
              </div>
            </div>
            <div className="grid-2">
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Client</p><p style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.clientName}</p></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Assigned To</p><p style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.assignedTo}</p></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Posting Date</p><p style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.postingDate}</p></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Internal Deadline</p><p style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.internalDeadline}</p></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Production Status</p><StatusBadge status={selected.productionStatus} /></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Approval Status</p><StatusBadge status={selected.approvalStatus} /></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Revisions</p><p style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.revisionCount} / {selected.maxRevisions}</p></div>
              <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Publishing Status</p><StatusBadge status={selected.publishingStatus} /></div>
            </div>
            <div className="divider" />
            {selected.captionCopy && <div style={{ marginBottom: 14 }}><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Caption Copy</p><p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--dark)", background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>{selected.captionCopy}</p></div>}
            {selected.managerNotes && <div style={{ marginBottom: 14 }}><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Manager Notes</p><p style={{ fontSize: 13, color: "var(--dark)", lineHeight: 1.7 }}>{selected.managerNotes}</p></div>}
            {selected.clientFeedback && <div><p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Client Feedback</p><p style={{ fontSize: 13, color: "var(--dark)", lineHeight: 1.7, background: "#ECFDF5", padding: 12, borderRadius: 8, border: "1px solid #A7F3D0" }}>{selected.clientFeedback}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}

const EMPLOYEE_ROLES = [
  "Video Editor", "Graphic Designer", "Content Writer", "Social Media Manager",
  "Ads Manager", "Account Manager", "Strategist", "Photographer",
  "Motion Designer", "Creative Director", "Copywriter", "Reel Editor", "Thumbnail Designer",
];
const AVAILABILITY_STATUSES = ["available", "busy", "overloaded", "on_leave", "not_available"];
const ALL_SKILL_TAGS = [
  "Video Editing", "Color Grading", "Motion Graphics", "Premiere Pro", "After Effects",
  "Graphic Design", "Photoshop", "Illustrator", "Figma", "Brand Identity",
  "Copywriting", "SEO", "Content Strategy", "Social Media Copy", "Blogging",
  "Social Strategy", "Community Management", "Analytics", "Paid Ads", "Meta Ads",
  "Photography", "Lightroom", "Canva", "Lottie", "2D Animation",
  "Client Relations", "Project Management", "Campaign Planning", "Market Research", "Reporting",
];


// Workload helpers
function getWorkloadLevel(count) {
  if (count <= 3) return { label: "Light", color: "#16A34A", bg: "#DCFCE7" };
  if (count <= 7) return { label: "Balanced", color: "#0EA5E9", bg: "#DBEAFE" };
  if (count <= 10) return { label: "Heavy", color: "#F59E0B", bg: "#FEF9C3" };
  return { label: "Overloaded", color: "#DC2626", bg: "#FEE2E2" };
}

function availabilityMeta(status) {
  const m = {
    available: { cls: "badge-success", label: "Available", dot: "#16A34A" },
    busy: { cls: "badge-warning", label: "Busy", dot: "#F59E0B" },
    overloaded: { cls: "badge-danger", label: "Overloaded", dot: "#DC2626" },
    on_leave: { cls: "badge-muted", label: "On Leave", dot: "#6B7280" },
    not_available: { cls: "badge-muted", label: "Not Available", dot: "#6B7280" },
  };
  return m[status] || { cls: "badge-muted", label: status, dot: "#6B7280" };
}


// EmployeeFormModal
function EmployeeFormModal({ open, onClose, initial, session, onSave }) {
  const blank = {
    name: "", email: "", phone: "", designation: "", department: "",
    skills: [], availability: "available", leaveStatus: "", joinedAt: "", notes: "",
  };
  const [form, setForm] = useState(initial || blank);
  const [errors, setErrors] = useState({});
  const [skillInput, setSkillInput] = useState("");
  useEffect(() => { setForm(initial || blank); setErrors({}); setSkillInput(""); }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSkill = s => set("skills", form.skills.includes(s) ? form.skills.filter(x => x !== s) : [...form.skills, s]);
  const addCustomSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) { set("skills", [...form.skills, s]); }
    setSkillInput("");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.designation) e.designation = "Role is required";
    setErrors(e); return Object.keys(e).length === 0;
  };

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? "Edit Employee" : "Add New Employee"}
      footer={<div style={{ display: "flex", gap: 10 }}><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => { if (validate()) onSave(form); }}>{initial ? "Save Changes" : "Add Employee"}</Btn></div>}
    >
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Basic Information</p>
        <div className="grid-2">
          <FormInput label="Full Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Employee full name" error={errors.name} />
          <FormInput label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="employee@agency.com" error={errors.email} />
        </div>
        <div className="grid-2">
          <FormInput label="Phone Number" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 99000 00000" />
          <FormInput label="Joined Date" type="date" value={form.joinedAt} onChange={e => set("joinedAt", e.target.value)} />
        </div>

        <div className="divider" style={{ margin: "4px 0 14px" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Role & Status</p>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Role / Designation *</label>
            <select className={`form-input ${errors.designation ? "error" : ""}`} value={form.designation} onChange={e => set("designation", e.target.value)}>
              <option value="">Select role...</option>
              {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.designation && <p className="form-error">{errors.designation}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Availability Status</label>
            <select className="form-input" value={form.availability} onChange={e => set("availability", e.target.value)}>
              {AVAILABILITY_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <FormInput label="Department" value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Production, Creative" />
          <FormInput label="Leave Status" value={form.leaveStatus} onChange={e => set("leaveStatus", e.target.value)} placeholder="e.g. Returning May 20" />
        </div>

        <div className="divider" style={{ margin: "4px 0 14px" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Skills</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {ALL_SKILL_TAGS.map(s => (
            <button key={s} type="button" onClick={() => toggleSkill(s)} className={`filter-chip ${form.skills.includes(s) ? "active" : ""}`} style={{ fontSize: 11.5 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="form-input" value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add custom skill..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }} style={{ flex: 1 }} />
          <Btn variant="outline" size="sm" onClick={addCustomSkill}>Add</Btn>
        </div>
        {form.skills.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
            {form.skills.filter(s => !ALL_SKILL_TAGS.includes(s)).map(s => (
              <span key={s} className="badge badge-orange" style={{ fontSize: 11.5 }}>
                {s}
                <button onClick={() => set("skills", form.skills.filter(x => x !== s))} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 4, color: "inherit", fontSize: 12, lineHeight: 1 }}>x</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}


// TeamPage
function TeamPage() {
  const { session, showToast } = useApp();
  const role = session?.role || "employee";

  if (role !== "superadmin" && role !== "manager") {
    return <ComingSoonPage title="Team" />;
  }

  const [employees, setEmployees] = useState(() => {
    const stored = LSUtils.getData(LS_KEYS.EMPLOYEES);
    // Enrich stored data with availability if missing
    return (stored || MOCK.employees).map(e => ({
      availability: e.currentLoad >= 8 ? "overloaded" : e.currentLoad >= 5 ? "busy" : "available",
      activeTasks: e.currentLoad || 0,
      completedTasks: Math.floor(Math.random() * 20) + 5,
      overdueTasks: Math.max(0, Math.floor((e.currentLoad || 0) * 0.1)),
      ...e,
    }));
  });
  const [tasks] = useState(() => LSUtils.getData(LS_KEYS.TASKS) || MOCK.tasks);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterAvail, setFilterAvail] = useState("all");
  const [filterWorkload, setFilterWorkload] = useState("all");
  const [viewMode, setViewMode] = useState("cards");
  const [addOpen, setAddOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getActiveTasks = (empId) => tasks.filter(t => t.assignedEmployeeId === empId && t.productionStatus !== "approved" && t.productionStatus !== "published").length;

  const enriched = employees.map(e => ({
    ...e,
    activeTasks: getActiveTasks(e.id) || e.activeTasks || e.currentLoad || 0,
  }));

  const filtered = enriched.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || (e.designation || "").toLowerCase().includes(q) || (e.skills || []).some(s => s.toLowerCase().includes(q));
    const matchRole = filterRole === "all" || e.designation === filterRole;
    const matchAvail = filterAvail === "all" || e.availability === filterAvail;
    const wl = getWorkloadLevel(e.activeTasks || 0).label.toLowerCase();
    const matchWL = filterWorkload === "all" || wl === filterWorkload;
    return matchQ && matchRole && matchAvail && matchWL;
  });

  const persist = (updated) => {
    setEmployees(updated);
    LSUtils.setData(LS_KEYS.EMPLOYEES, updated);
  };

  const handleAdd = (form) => {
    const newEmp = {
      ...form,
      id: `emp_${Date.now()}`,
      companyId: "comp_1",
      userId: null,
      currentLoad: 0,
      maxLoad: 10,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const updated = [...employees, newEmp];
    persist(updated);
    LSUtils.createActivityLog("employee_created", "employee", newEmp.id, session?.id, { employeeName: newEmp.name });
    showToast(`Employee "${newEmp.name}" added.`, "success");
    setAddOpen(false);
  };

  const handleEdit = (form) => {
    const updated = employees.map(e => e.id === editEmp.id ? { ...e, ...form, updatedAt: new Date().toISOString() } : e);
    persist(updated);
    LSUtils.createActivityLog("employee_updated", "employee", editEmp.id, session?.id, { employeeName: form.name });
    showToast(`Employee "${form.name}" updated.`, "success");
    setEditEmp(null);
  };

  const handleDelete = (emp) => {
    const updated = employees.filter(e => e.id !== emp.id);
    persist(updated);
    LSUtils.createActivityLog("employee_deleted", "employee", emp.id, session?.id, { employeeName: emp.name });
    showToast(`Employee "${emp.name}" removed.`, "danger");
    setDeleteTarget(null);
  };

  const availCounts = AVAILABILITY_STATUSES.reduce((a, s) => ({ ...a, [s]: enriched.filter(e => e.availability === s).length }), {});

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="page-subtitle">{employees.length} employees . {enriched.filter(e => e.availability === "available").length} available now</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {["cards", "table"].map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 12px", background: viewMode === m ? "var(--light-orange)" : "transparent", border: "none", cursor: "pointer", color: viewMode === m ? "var(--primary)" : "var(--muted)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <SvgIcon name={m === "cards" ? "dashboard" : "checklist"} size={13} color={viewMode === m ? "var(--primary)" : "var(--muted)"} />
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <Btn icon={<SvgIcon name="arrowRight" size={14} color="#fff" />} onClick={() => setAddOpen(true)}>Add Employee</Btn>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[
          { label: "Total", value: employees.length, color: "#151515", bg: "#F3F4F6" },
          { label: "Available", value: availCounts.available || 0, color: "#16A34A", bg: "#DCFCE7" },
          { label: "Busy", value: (availCounts.busy || 0) + (availCounts.overloaded || 0), color: "#F59E0B", bg: "#FEF9C3" },
          { label: "On Leave", value: availCounts.on_leave || 0, color: "#6B7280", bg: "#F3F4F6" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: "14px 18px" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Availability filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[{ value: "all", label: "All", count: enriched.length }, ...AVAILABILITY_STATUSES.map(s => ({ value: s, label: s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()), count: availCounts[s] || 0 }))].map(f => (
          <button key={f.value} className={`filter-chip ${filterAvail === f.value ? "active" : ""}`} onClick={() => setFilterAvail(f.value)} style={{ fontSize: 12 }}>
            {f.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search + role + workload filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, role, skill..." style={{ flex: "1 1 200px", minWidth: 180 }} />
        <select className="form-input" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: "auto", minWidth: 160, fontSize: 13 }}>
          <option value="all">All Roles</option>
          {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-input" value={filterWorkload} onChange={e => setFilterWorkload(e.target.value)} style={{ width: "auto", minWidth: 140, fontSize: 13 }}>
          <option value="all">All Workloads</option>
          {["light", "balanced", "heavy", "overloaded"].map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
        </select>
      </div>

      {/* Card view */}
      {viewMode === "cards" ? (
        <div className="grid-3">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1/-1" }}><EmptyState icon={<SvgIcon name="users" size={28} color="var(--primary)" />} title="No employees found" desc="Try adjusting your filters." /></div>
          ) : filtered.map(e => {
            const activeCnt = e.activeTasks || 0;
            const wl = getWorkloadLevel(activeCnt);
            const am = availabilityMeta(e.availability);
            return (
              <div key={e.id} className="card hover-lift" style={{ padding: 20, cursor: "default" }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={e.name} size="lg" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--dark)" }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{e.designation}</div>
                      {e.department && <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{e.department}</div>}
                    </div>
                  </div>
                  <span className={`badge ${am.cls}`} style={{ fontSize: 10.5, flexShrink: 0 }}>
                    <span className="dot" style={{ width: 6, height: 6, background: am.dot }} />
                    {am.label}
                  </span>
                </div>

                {/* Workload bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500 }}>Workload</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: wl.bg, color: wl.color }}>{wl.label}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{activeCnt} tasks</span>
                    </div>
                  </div>
                  <ProgressBar value={activeCnt} max={12} height={5} color={wl.color} />
                </div>

                {/* Mini stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
                  {[
                    { label: "Active", value: e.activeTasks || 0, color: "#1D4ED8" },
                    { label: "Done", value: e.completedTasks || 0, color: "#16A34A" },
                    { label: "Overdue", value: e.overdueTasks || 0, color: e.overdueTasks > 0 ? "#DC2626" : "#6B7280" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "6px 4px", borderRadius: 7, background: "#F9FAFB" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Skills */}
                {(e.skills || []).length > 0 && (
                  <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {e.skills.slice(0, 3).map(s => <span key={s} className="badge badge-muted" style={{ fontSize: 10.5 }}>{s}</span>)}
                    {e.skills.length > 3 && <span className="badge badge-muted" style={{ fontSize: 10.5 }}>+{e.skills.length - 3}</span>}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={() => setEditEmp(e)}>
                    <SvgIcon name="pen" size={12} color="var(--dark)" /> Edit
                  </button>
                  {role === "superadmin" && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(e)} title="Remove employee">
                      <SvgIcon name="alert" size={13} color="var(--danger)" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="card">
          <DataTable
            columns={[
              {
                key: "name", label: "Employee", render: (v, row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={v} size="sm" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{row.email}</div>
                    </div>
                  </div>
                )
              },
              { key: "designation", label: "Role" },
              {
                key: "activeTasks", label: "Active Tasks", render: (v, row) => {
                  const wl = getWorkloadLevel(v || 0);
                  return <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: wl.bg, color: wl.color }}>{wl.label}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{v}</span>
                  </div>;
                }
              },
              {
                key: "skills", label: "Skills", hideOnMobile: true, render: v => (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(v || []).slice(0, 2).map(s => <span key={s} className="badge badge-muted" style={{ fontSize: 10.5 }}>{s}</span>)}
                    {(v || []).length > 2 && <span className="badge badge-muted" style={{ fontSize: 10.5 }}>+{v.length - 2}</span>}
                  </div>
                )
              },
              { key: "availability", label: "Status", render: v => { const m = availabilityMeta(v || "available"); return <span className={`badge ${m.cls}`}><span className="dot" style={{ width: 6, height: 6, background: m.dot }} />{m.label}</span>; } },
              {
                key: "id", label: "", render: (_, row) => (
                  <div style={{ display: "flex", gap: 5 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setEditEmp(row); }}><SvgIcon name="pen" size={13} color="var(--muted)" /></button>
                    {role === "superadmin" && <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}><SvgIcon name="alert" size={13} color="var(--danger)" /></button>}
                  </div>
                )
              },
            ]}
            data={filtered}
            emptyState={<EmptyState icon={<SvgIcon name="users" size={28} color="var(--primary)" />} title="No employees found" desc="Try adjusting your filters." />}
          />
        </div>
      )}

      {/* Add Employee Modal */}
      <EmployeeFormModal open={addOpen} onClose={() => setAddOpen(false)} initial={null} session={session} onSave={handleAdd} />

      {/* Edit Employee Modal */}
      {editEmp && <EmployeeFormModal open={!!editEmp} onClose={() => setEditEmp(null)} initial={editEmp} session={session} onSave={handleEdit} />}

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Employee"
        footer={<><Btn variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Btn><Btn variant="danger" onClick={() => handleDelete(deleteTarget)}>Remove</Btn></>}
      >
        <p style={{ fontSize: 14, color: "var(--dark)", lineHeight: 1.6 }}>
          Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from the team? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}


export { TasksPage };
export default TeamPage;
