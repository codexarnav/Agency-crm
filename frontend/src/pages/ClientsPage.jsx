// Clients Management Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK, CLIENT_STATUSES, CLIENT_INDUSTRIES, PLATFORM_OPTIONS, DELIVERABLE_TYPES } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  FilterBar, Modal, FormInput, DataTable, ProgressBar, InfoRow,
} from "../shared/components";
import { createClient as apiCreateClient, updateClient, deleteClient, getManagers } from "../services/api";

// Client helpers
function clientStatusMeta(status) {
  const m = {
    active: { cls: "badge-success", label: "Active", dot: "#16A34A" },
    paused: { cls: "badge-warning", label: "Paused", dot: "#F59E0B" },
    completed: { cls: "badge-info", label: "Completed", dot: "#0EA5E9" },
    on_hold: { cls: "badge-muted", label: "On Hold", dot: "#6B7280" },
  };
  return m[status] || { cls: "badge-muted", label: status, dot: "#6B7280" };
}


// ClientFormModal
function ClientFormModal({ open, onClose, initial, employees, managers, session, onSave }) {
  const role = session?.role || "employee";
  const blank = {
    name: "", brandName: "", industry: "", contactPerson: "", email: "", phone: "",
    assignedAM: "", assignedManager: "",
    monthlyDeliverables: "", deliverableBreakdown: {},
    startDate: "", renewalDate: "",
    status: "active", platforms: [], notes: "",
  };
  const [form, setForm] = useState(initial || blank);
  const [errors, setErrors] = useState({});
  useEffect(() => { setForm(initial || blank); setErrors({}); }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const togglePlatform = p => set("platforms", form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p]);
  const setBreakdown = (type, val) => set("deliverableBreakdown", { ...form.deliverableBreakdown, [type]: parseInt(val) || 0 });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Client name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.contactPerson.trim()) e.contactPerson = "Contact person is required";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const accountManagers = employees.filter(e => e.designation === "Account Manager" || e.role === "accountmanager");
  const canAssignManager = role === "superadmin";

  // Deliverable total vs breakdown
  const breakdownTotal = Object.values(form.deliverableBreakdown || {}).reduce((a, v) => a + (parseInt(v) || 0), 0);
  const monthlyTotal = parseInt(form.monthlyDeliverables) || 0;
  const breakdownMismatch = monthlyTotal > 0 && breakdownTotal > 0 && breakdownTotal !== monthlyTotal;

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? "Edit Client" : "Add New Client"}
      footer={<div style={{ display: "flex", gap: 10 }}><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={() => { if (validate()) onSave(form); }}>{initial ? "Save Changes" : "Add Client"}</Btn></div>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Basic Information</p>
        <div className="grid-2">
          <FormInput label="Client / Company Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Guardian Pharmacy" error={errors.name} />
          <FormInput label="Brand Name" value={form.brandName} onChange={e => set("brandName", e.target.value)} placeholder="Brand display name" />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Industry / Niche</label>
            <select className="form-input" value={form.industry} onChange={e => set("industry", e.target.value)}>
              <option value="">Select industry...</option>
              {CLIENT_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Client Status</label>
            <select className="form-input" value={form.status} onChange={e => set("status", e.target.value)}>
              {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
        </div>

        <div className="divider" style={{ margin: "4px 0 14px" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Contact Details</p>
        <FormInput label="Contact Person Name *" value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} placeholder="Primary point of contact" error={errors.contactPerson} />
        <div className="grid-2">
          <FormInput label="Contact Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="client@company.com" error={errors.email} />
          <FormInput label="Contact Phone" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98000 00000" />
        </div>

        <div className="divider" style={{ margin: "4px 0 14px" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Assignment</p>
        <div className="grid-2">
          {canAssignManager && (
            <div className="form-group">
              <label className="form-label">Assigned Manager</label>
              <select className="form-input" value={form.assignedManager} onChange={e => set("assignedManager", e.target.value)}>
                <option value="">Select manager...</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Assigned Account Manager</label>
            <select className="form-input" value={form.assignedAM} onChange={e => set("assignedAM", e.target.value)}>
              <option value="">Select AM...</option>
              {accountManagers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        <div className="divider" style={{ margin: "4px 0 14px" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Selected Platforms</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {PLATFORM_OPTIONS.map(p => (
            <button key={p} type="button" onClick={() => togglePlatform(p)} className={`filter-chip ${form.platforms.includes(p) ? "active" : ""}`} style={{ fontSize: 12 }}>{p}</button>
          ))}
        </div>

        <div className="divider" style={{ margin: "4px 0 14px" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Monthly Deliverables</p>
        <div className="grid-2">
          <FormInput label="Total Monthly Deliverables" type="number" value={form.monthlyDeliverables} onChange={e => set("monthlyDeliverables", e.target.value)} placeholder="e.g. 30" />
          <div className="grid-2">
            <FormInput label="Start Date" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            <FormInput label="Renewal Date" type="date" value={form.renewalDate} onChange={e => set("renewalDate", e.target.value)} />
          </div>
        </div>

        {/* Deliverable breakdown */}
        <div className="form-group">
          <label className="form-label">Deliverable Type Breakdown</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {DELIVERABLE_TYPES.map(type => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12.5, flex: 1, fontWeight: 600 }}>{type}</span>
                <input type="number" min="0" value={form.deliverableBreakdown?.[type] || ""} onChange={e => setBreakdown(type, e.target.value)} placeholder="0" style={{ width: 50, padding: "3px 7px", borderRadius: 6, border: "1.5px solid var(--border)", fontSize: 12.5, textAlign: "center", outline: "none" }} onFocus={e => e.target.style.borderColor = "#FF6A00"} onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Breakdown total: <strong>{breakdownTotal}</strong></span>
            {breakdownMismatch && <span style={{ fontSize: 12, color: "var(--warning)", fontWeight: 600 }}>Warning: total is {monthlyTotal} but breakdown adds to {breakdownTotal}</span>}
          </div>
        </div>

        <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes about this client..." />
      </div>
    </Modal>
  );
}



// ClientDrawer
function ClientDrawer({ client, open, onClose, tasks, employees, onEdit, canDelete, onDelete }) {
  if (!open || !client) return null;
  const meta = clientStatusMeta(client.status);
  const clientTasks = tasks.filter(t => t.clientId === client.id);
  const approved = clientTasks.filter(t => t.approvalStatus === "approved").length;
  const pending = clientTasks.filter(t => t.approvalStatus === "pending").length;
  const total = client.monthlyDeliverables ? parseInt(client.monthlyDeliverables) : 30;
  const pct = Math.min(100, Math.round((approved / Math.max(total, 1)) * 100));
  const assignedEmp = employees.find(e => e.id === client.assignedAM);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150 }} onClick={onClose}>
      <div
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "min(480px, 100vw)", background: "var(--card)", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: (client.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: client.brandColor || "var(--primary)", flexShrink: 0 }}>
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17 }}>{client.name}</h3>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{client.brandName && client.brandName !== client.name ? client.brandName + " . " : ""}{client.industry}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${meta.cls}`}>{meta.label}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Monthly deliverable progress */}
          <div style={{ background: "var(--light-orange)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--deep)" }}>Monthly Deliverables Progress</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--primary)" }}>{approved}/{total}</span>
            </div>
            <ProgressBar value={approved} max={total} height={7} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{pct}% complete</span>
              <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>{pending} pending approval</span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total Tasks", value: clientTasks.length, color: "#1D4ED8", bg: "#EFF6FF" },
              { label: "Approved", value: approved, color: "#16A34A", bg: "#DCFCE7" },
              { label: "Pending", value: pending, color: "#F59E0B", bg: "#FEF9C3" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 8, background: s.bg }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <InfoRow label="Client ID" value={client.id} />
          <InfoRow label="Contact Person" value={client.contactPerson} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Phone" value={client.phone} />
          <InfoRow label="Login Access" value={client.loginAccessType || " - "} />
          <InfoRow label="Account Manager" value={assignedEmp?.name || client.assignedAM || " - "} />
          <InfoRow label="Package" value={client.packageName || " - "} />
          <InfoRow label="Deliverables / Month" value={client.monthlyDeliverables || " - "} />
          <InfoRow label="Start Date" value={client.startDate || client.joinedAt || " - "} />
          <InfoRow label="Renewal Date" value={client.renewalDate || " - "} />

          {/* Platforms */}
          {(client.platforms || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>Platforms</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {client.platforms.map(p => <span key={p} className="badge badge-orange" style={{ fontSize: 11 }}>{p}</span>)}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>Notes</p>
              <p style={{ fontSize: 13, color: "var(--dark)", lineHeight: 1.65, background: "#F9FAFB", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>{client.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {canDelete && (
            <Btn variant="danger" size="sm" onClick={() => onDelete(client)}>Delete</Btn>
          )}
          <Btn variant="outline" size="sm" onClick={onClose}>Close</Btn>
          <Btn size="sm" onClick={() => onEdit(client)}>Edit Client</Btn>
        </div>
      </div>
    </div>
  );
}


// CreateClientModal — Real API integration
function CreateClientModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    username: "", companyName: "", email: "", phoneNumber: "", password: "", profilePicture: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ username: "", companyName: "", email: "", phoneNumber: "", password: "", profilePicture: "" });
      setErrors({});
      setLoading(false);
    }
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.companyName.trim()) e.companyName = "Company name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phoneNumber.trim()) e.phoneNumber = "Phone number is required";
    if (!form.password.trim()) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiCreateClient({
        username: form.username.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        profilePicture: form.profilePicture.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setErrors({ _api: err.message });
    } finally {
      setLoading(false);
    }
  };

  const Spinner = () => (
    <span className="spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Client"
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner /> Creating...</> : "Create Client"}
          </Btn>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {errors._api && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "var(--danger)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <SvgIcon name="alert" size={14} color="var(--danger)" />{errors._api}
          </div>
        )}
        <FormInput label="Username *" value={form.username} onChange={e => set("username", e.target.value)} placeholder="e.g. client_guardian" error={errors.username} />
        <FormInput label="Company Name *" value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="e.g. Guardian Pharmacy" error={errors.companyName} />
        <div className="grid-2">
          <FormInput label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="client@company.com" error={errors.email} />
          <FormInput label="Phone Number *" value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="+91 98000 00000" error={errors.phoneNumber} />
        </div>
        <FormInput label="Password *" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" error={errors.password} />
        <FormInput label="Profile Picture URL" value={form.profilePicture} onChange={e => set("profilePicture", e.target.value)} placeholder="https://example.com/photo.jpg" hint="Optional — paste an image URL" />
      </div>
    </Modal>
  );
}


// ClientsPage
function ClientsPage() {
  const { clients, tasks, employees, session, showToast, refreshClients } = useApp();
  const role = session?.role || "employee";

  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterAM, setFilterAM] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [drawerClient, setDrawerClient] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);

  useEffect(() => {
    const loadManagers = async () => {
      try {
        const res = await getManagers();
        setManagers(res.data || []);
      } catch (err) {
        console.error("Failed to load managers", err);
      }
    };
    if (role === "superadmin" || role === "manager") {
      loadManagers();
    }
  }, [role]);

  const canDelete = role === "superadmin";
  const canAdd = role === "superadmin" || role === "manager";
  const canCreateClient = role === "superadmin" || role === "manager";

  // Filter AM-specific clients
  const visibleClients = clients.filter(c => {
    if (role === "accountmanager") return c.assignedAM === session?.id || c.assignedAM === "user_mgr1";
    return true;
  });

  const filtered = visibleClients.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || (c.name || "").toLowerCase().includes(q) || (c.industry || "").toLowerCase().includes(q) || (c.contactPerson || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchIndustry = filterIndustry === "all" || c.industry === filterIndustry;
    const matchAM = filterAM === "all" || c.assignedAM === filterAM;
    return matchQ && matchStatus && matchIndustry && matchAM;
  });

  const industries = [...new Set(clients.map(c => c.industry).filter(Boolean))];
  const accountManagers = employees.filter(e => e.designation === "Account Manager");

  const handleAdd = async (form) => {
    try {
      await apiCreateClient({
        username: form.email.split("@")[0] + "_" + Math.floor(Math.random()*100),
        companyName: form.name,
        email: form.email,
        phoneNumber: form.phone || "0000000000",
        password: "Client123!", // default temporary password
        brandColor: `hsl(${Math.floor(Math.random() * 360)},60%,45%)`,
        brandName: form.brandName || form.name,
        industry: form.industry || "",
        contactPerson: form.contactPerson,
        assignedAM: form.assignedAM || "",
        assignedManager: form.assignedManager || "",
        monthlyDeliverables: form.monthlyDeliverables || 30,
        deliverableBreakdown: form.deliverableBreakdown || {},
        startDate: form.startDate ? new Date(form.startDate) : new Date(),
        renewalDate: form.renewalDate ? new Date(form.renewalDate) : null,
        status: form.status || "active",
        platforms: form.platforms || [],
        notes: form.notes || ""
      });
      showToast(`Client "${form.name}" added successfully.`, "success");
      setAddOpen(false);
      refreshClients();
    } catch (err) {
      showToast(err.message || "Failed to add client", "danger");
    }
  };

  const handleEdit = async (form) => {
    try {
      const payload = {
        companyName: form.name,
        brandName: form.brandName,
        industry: form.industry,
        contactPerson: form.contactPerson,
        email: form.email,
        phoneNumber: form.phone,
        assignedAM: form.assignedAM,
        assignedManager: form.assignedManager,
        monthlyDeliverables: form.monthlyDeliverables,
        deliverableBreakdown: form.deliverableBreakdown,
        startDate: form.startDate,
        renewalDate: form.renewalDate,
        status: form.status,
        platforms: form.platforms,
        notes: form.notes
      };
      await updateClient(editClient.id, payload);
      showToast(`Client "${form.name}" updated.`, "success");
      setEditClient(null);
      refreshClients();
      if (drawerClient?.id === editClient.id) {
        setDrawerClient({ ...drawerClient, ...form, id: editClient.id });
      }
    } catch (err) {
      showToast(err.message || "Failed to update client", "danger");
    }
  };

  const handleDelete = async (client) => {
    try {
      await deleteClient(client.id);
      showToast(`Client "${client.name}" deleted.`, "danger");
      setDeleteTarget(null);
      setDrawerClient(null);
      refreshClients();
    } catch (err) {
      showToast(err.message || "Failed to delete client", "danger");
    }
  };

  const statusCounts = CLIENT_STATUSES.reduce((a, s) => ({ ...a, [s]: visibleClients.filter(c => c.status === s).length }), {});

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Client Management</h1>
          <p className="page-subtitle">{visibleClients.length} clients . {visibleClients.filter(c => c.status === "active").length} active</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {["table", "cards"].map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 12px", background: viewMode === m ? "var(--light-orange)" : "transparent", border: "none", cursor: "pointer", color: viewMode === m ? "var(--primary)" : "var(--muted)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <SvgIcon name={m === "table" ? "checklist" : "dashboard"} size={13} color={viewMode === m ? "var(--primary)" : "var(--muted)"} />
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          {canCreateClient && <Btn variant="outline" icon={<SvgIcon name="user" size={14} color="var(--primary)" />} onClick={() => setCreateClientOpen(true)}>Create Client</Btn>}
          {canAdd && <Btn icon={<SvgIcon name="arrowRight" size={14} color="#fff" />} onClick={() => setAddOpen(true)}>Add Client</Btn>}
        </div>
      </div>

      {/* Status summary pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ label: "All", value: "all", count: visibleClients.length }, ...CLIENT_STATUSES.map(s => ({ label: s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()), value: s, count: statusCounts[s] || 0 }))].map(f => (
          <button key={f.value} className={`filter-chip ${filterStatus === f.value ? "active" : ""}`} onClick={() => setFilterStatus(f.value)} style={{ fontSize: 12 }}>
            {f.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search + filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search clients, contact, industry..." style={{ flex: "1 1 220px", minWidth: 200 }} />
        <select className="form-input" value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ width: "auto", minWidth: 150, fontSize: 13 }}>
          <option value="all">All Industries</option>
          {industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className="form-input" value={filterAM} onChange={e => setFilterAM(e.target.value)} style={{ width: "auto", minWidth: 160, fontSize: 13 }}>
          <option value="all">All Account Managers</option>
          {accountManagers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Table view */}
      {viewMode === "table" ? (
        <div className="card">
          <DataTable
            columns={[
              {
                key: "name", label: "Client", render: (v, row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: (row.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: row.brandColor || "var(--primary)", flexShrink: 0 }}>{v.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{row.brandName && row.brandName !== v ? row.brandName : row.industry}</div>
                    </div>
                  </div>
                )
              },
              {
                key: "contactPerson", label: "Contact", render: (v, row) => (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{row.email}</div>
                  </div>
                )
              },
              { key: "packageName", label: "Package", hideOnMobile: true, render: v => <span style={{ fontSize: 12.5 }}>{v || " - "}</span> },
              {
                key: "assignedAM", label: "Account Mgr", hideOnMobile: true, render: v => {
                  const emp = employees.find(e => e.id === v);
                  return emp ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar name={emp.name || emp.username} size="sm" /><span style={{ fontSize: 12.5 }}>{(emp.name || emp.username || "").split(" ")[0]}</span></div> : <span style={{ fontSize: 12.5, color: "var(--muted)" }}> - </span>;
                }
              },
              { key: "status", label: "Status", render: v => { const m = clientStatusMeta(v); return <span className={`badge ${m.cls}`}><span className="dot" style={{ width: 6, height: 6, background: m.dot }} />{m.label}</span>; } },
              {
                key: "id", label: "", render: (_, row) => (
                  <div style={{ display: "flex", gap: 5 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="View details" onClick={e => { e.stopPropagation(); setDrawerClient(row); }}>
                      <SvgIcon name="alert" size={14} color="var(--muted)" />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={e => { e.stopPropagation(); setEditClient(row); }}>
                      <SvgIcon name="pen" size={13} color="var(--muted)" />
                    </button>
                    {canDelete && (
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}>
                        <SvgIcon name="alert" size={13} color="var(--danger)" />
                      </button>
                    )}
                  </div>
                )
              },
            ]}
            data={filtered}
            onRowClick={row => setDrawerClient(row)}
            emptyState={<EmptyState icon={<SvgIcon name="handshake" size={28} color="var(--primary)" />} title="No clients found" desc="Try adjusting your search or filter." />}
          />
        </div>
      ) : (
        /* Card view */
        <div className="grid-3">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1/-1" }}><EmptyState icon={<SvgIcon name="handshake" size={28} color="var(--primary)" />} title="No clients found" desc="Try adjusting your search or filter." /></div>
          ) : filtered.map(c => {
            const meta = clientStatusMeta(c.status);
            const ctasks = tasks.filter(t => t.clientId === c.id);
            const cpending = ctasks.filter(t => t.approvalStatus === "pending").length;
            const capproved = ctasks.filter(t => t.approvalStatus === "approved").length;
            const emp = employees.find(e => e.id === c.assignedAM);
            return (
              <div key={c.id} className="client-card" onClick={() => setDrawerClient(c)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: (c.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: c.brandColor || "var(--primary)", flexShrink: 0 }}>{c.name.charAt(0)}</div>
                    <div>
                      <div className="truncate" style={{ fontWeight: 700, fontSize: 13.5, maxWidth: 130 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.industry}</div>
                    </div>
                  </div>
                  <span className={`badge ${meta.cls}`} style={{ fontSize: 10.5 }}>{meta.label}</span>
                </div>
                {/* Progress */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Deliverables</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{capproved}/{c.monthlyDeliverables || " - "}</span>
                  </div>
                  <ProgressBar value={capproved} max={parseInt(c.monthlyDeliverables) || 30} height={4} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {emp ? <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Avatar name={emp.name || emp.username} size="sm" /><span style={{ fontSize: 11.5, color: "var(--muted)" }}>{(emp.name || emp.username || "").split(" ")[0]}</span></div> : <span />}
                  {cpending > 0 && <span className="badge badge-warning" style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 3 }}><SvgIcon name="clock" size={10} color="#854D0E" />{cpending} pending</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      <ClientFormModal open={addOpen} onClose={() => setAddOpen(false)} initial={null} employees={employees} managers={managers} session={session} onSave={handleAdd} />

      {/* Edit Client Modal */}
      {editClient && <ClientFormModal open={!!editClient} onClose={() => setEditClient(null)} initial={editClient} employees={employees} managers={managers} session={session} onSave={handleEdit} />}

      {/* Client Detail Drawer */}
      <ClientDrawer
        client={drawerClient} open={!!drawerClient} onClose={() => setDrawerClient(null)}
        tasks={tasks} employees={employees}
        onEdit={c => { setEditClient(c); setDrawerClient(null); }}
        canDelete={canDelete}
        onDelete={c => { setDeleteTarget(c); setDrawerClient(null); }}
      />

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Client"
        footer={<><Btn variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Btn><Btn variant="danger" onClick={() => handleDelete(deleteTarget)}>Delete Permanently</Btn></>}
      >
        <p style={{ fontSize: 14, color: "var(--dark)", lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone and all associated data will be removed.
        </p>
      </Modal>

      {/* Create Client Modal (API) */}
      <CreateClientModal
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onSuccess={() => {
          showToast("Client created successfully!", "success");
          setCreateClientOpen(false);
          refreshClients();
        }}
      />
    </div>
  );
}

// Tasks Page

export default ClientsPage;
