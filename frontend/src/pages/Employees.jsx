// Employees Page — SUPER_ADMIN and MANAGER
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../shared/AppContext";
import {
  SvgIcon, Btn, Avatar, EmptyState, SearchBar,
  Modal, FormInput, DataTable, ImageUploadDropdown,
} from "../shared/components";
import { getEmployees, createEmployee, deleteUser, getToken } from "../services/api";

// CreateEmployeeModal
function CreateEmployeeModal({ open, onClose, onSuccess }) {
  const { showToast } = useApp();
  const [form, setForm] = useState({
    name: "", dob: "", email: "", phoneNumber: "", password: "", profilePicture: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: "", dob: "", email: "", phoneNumber: "", password: "", profilePicture: "" });
      setErrors({});
      setLoading(false);
      setUploadingPic(false);
    }
  }, [open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingPic(true);
    try {
      const token = getToken();
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let baseUrl = import.meta.env.VITE_API_URL || "/api";
      if (baseUrl.startsWith("http") && !baseUrl.endsWith("/api") && !baseUrl.includes("/api/")) {
        baseUrl = baseUrl.replace(/\/?$/, "/api");
      }
      const res = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      set("profilePicture", data.url);
    } catch (err) {
      alert(err.message || "Failed to upload photo");
    } finally {
      setUploadingPic(false);
    }
  };

  const getGeneratedUsername = () => {
    const cleanName = (form.name || "").toLowerCase().replace(/\s+/g, "");
    if (!form.dob) return cleanName || "name@year";
    const parts = form.dob.split("-");
    const year = parts[0];
    return `${cleanName}@${year}`;
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full Name is required";
    if (!form.dob.trim()) e.dob = "Date of Birth is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
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
        name: form.name.trim(),
        dob: form.dob.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
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
        <FormInput label="Full Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Rahul Sharma" error={errors.name} />
        <FormInput label="Date of Birth *" type="date" value={form.dob} onChange={e => set("dob", e.target.value)} error={errors.dob} />
        <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, padding: "0 4px", marginBottom: 16, display: "flex", gap: 6 }}>
          <span>Generated Username:</span>
          <span style={{ color: "var(--dark)" }}>{getGeneratedUsername()}</span>
        </div>
        <FormInput label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="employee@company.com" error={errors.email} />
        <FormInput label="Phone Number" value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="+91 98000 00000" error={errors.phoneNumber} />
        <FormInput label="Password *" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" error={errors.password} />
        <ImageUploadDropdown
          value={form.profilePicture}
          onChange={url => set("profilePicture", url)}
          name={form.name || "Employee"}
          showToast={showToast}
        />
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
    showToast("Employee created successfully and login credentials have been emailed.", "success");
    setModalOpen(false);
    fetchEmployees();
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete team member "${name}"? This will also delete all their tasks, shoots, and notifications.`)) return;
    try {
      await deleteUser(id);
      showToast(`Team member "${name}" deleted successfully.`, "success");
      fetchEmployees();
    } catch (err) {
      showToast(err.message || "Failed to delete team member.", "danger");
    }
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
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">{employees.length} team member{employees.length !== 1 ? "s" : ""} registered</p>
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
                key: "username", label: "Name / Username", render: (v, row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={row.name || v || "E"} src={row.profilePicture} size="sm" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{row.name || v}</div>
                      {(row.name && v) && <div style={{ fontSize: 11, color: "var(--muted)" }}>{v}</div>}
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
              {
                key: "actions", label: "Actions", render: (v, row) => (
                  <Btn variant="danger" size="sm" onClick={() => handleDeleteEmployee(row.id, row.name || row.username)}>
                    Delete
                  </Btn>
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
