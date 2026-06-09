// Employees Page — SUPER_ADMIN and MANAGER
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../shared/AppContext";
import {
  SvgIcon, Btn, Avatar, EmptyState, SearchBar,
  Modal, FormInput, DataTable,
} from "../shared/components";
import { getEmployees, createEmployee } from "../services/api";

// CreateEmployeeModal
function CreateEmployeeModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    username: "", email: "", phoneNumber: "", password: "", profilePicture: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ username: "", email: "", phoneNumber: "", password: "", profilePicture: "" });
      setErrors({});
      setLoading(false);
    }
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required";
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
      await createEmployee({
        username: form.username.trim(),
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
      title="Create Employee"
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner /> Creating...</> : "Create Employee"}
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
        <FormInput label="Username *" value={form.username} onChange={e => set("username", e.target.value)} placeholder="e.g. rahul_editor" error={errors.username} />
        <FormInput label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="employee@company.com" error={errors.email} />
        <FormInput label="Phone Number *" value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="+91 98000 00000" error={errors.phoneNumber} />
        <FormInput label="Password *" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" error={errors.password} />
        <FormInput label="Profile Picture URL" value={form.profilePicture} onChange={e => set("profilePicture", e.target.value)} placeholder="https://example.com/photo.jpg" hint="Optional — paste an image URL" />
      </div>
    </Modal>
  );
}

// EmployeesPage
function EmployeesPage() {
  const { showToast } = useApp();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load employees", "danger");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSuccess = () => {
    showToast("Employee created successfully!", "success");
    setModalOpen(false);
    fetchEmployees();
  };

  const filtered = employees.filter(m => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (m.username || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.phoneNumber || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="page-subtitle">{employees.length} employee{employees.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Btn icon={<SvgIcon name="arrowRight" size={14} color="#fff" />} onClick={() => setModalOpen(true)}>
          Create Employee
        </Btn>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search employees by name, email, phone..." style={{ maxWidth: 400 }} />
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
            <p style={{ marginTop: 12, fontSize: 13 }}>Loading employees...</p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "username", label: "Name", render: (v, row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={v || "E"} size="sm" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</div>
                    </div>
                  </div>
                )
              },
              {
                key: "email", label: "Email", render: v => (
                  <span style={{ fontSize: 13, color: "var(--dark)" }}>{v}</span>
                )
              },
              {
                key: "phoneNumber", label: "Phone", hideOnMobile: true, render: v => (
                  <span style={{ fontSize: 12.5 }}>{v || "—"}</span>
                )
              },
              {
                key: "isActive", label: "Status", render: v => (
                  <span className={`badge ${v !== false ? "badge-success" : "badge-muted"}`}>
                    <span className="dot" style={{ width: 6, height: 6, background: v !== false ? "#16A34A" : "#6B7280" }} />
                    {v !== false ? "Active" : "Inactive"}
                  </span>
                )
              },
              {
                key: "createdAt", label: "Created Date", hideOnMobile: true, render: v => (
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {v ? new Date(v).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </span>
                )
              },
            ]}
            data={filtered}
            emptyState={
              <EmptyState
                icon={<SvgIcon name="users" size={28} color="var(--primary)" />}
                title="No employees found"
                desc={search ? "Try adjusting your search." : "Create your first employee to get started."}
                action={!search && <Btn onClick={() => setModalOpen(true)}>Create Employee</Btn>}
              />
            }
          />
        )}
      </div>

      {/* Create Employee Modal */}
      <CreateEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleSuccess} />
    </div>
  );
}

export default EmployeesPage;
