// Managers Page — SUPER_ADMIN only
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../shared/AppContext";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  Modal, FormInput, DataTable, ImageUploadDropdown,
} from "../shared/components";
import { getManagers, createManager, getToken } from "../services/api";

// CreateManagerModal
function CreateManagerModal({ open, onClose, onSuccess }) {
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

      const res = await fetch("/api/upload", {
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
    if (!form.dob) return cleanName || "name@dob";
    const parts = form.dob.split("-");
    if (parts.length === 3) {
      return `${cleanName}@${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return `${cleanName}@${form.dob}`;
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full Name is required";
    if (!form.dob.trim()) e.dob = "Date of Birth is required";
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
      await createManager({
        name: form.name.trim(),
        dob: form.dob.trim(),
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
      title="Create Manager"
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner /> Creating...</> : "Create Manager"}
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
        <FormInput label="Full Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. John Doe" error={errors.name} />
        <FormInput label="Date of Birth *" type="date" value={form.dob} onChange={e => set("dob", e.target.value)} error={errors.dob} />
        <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, padding: "0 4px", marginBottom: 16, display: "flex", gap: 6 }}>
          <span>Generated Username:</span>
          <span style={{ color: "var(--dark)" }}>{getGeneratedUsername()}</span>
        </div>
        <FormInput label="Email *" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="manager@company.com" error={errors.email} />
        <FormInput label="Phone Number *" value={form.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="+91 98000 00000" error={errors.phoneNumber} />
        <FormInput label="Password *" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" error={errors.password} />
        <ImageUploadDropdown
          value={form.profilePicture}
          onChange={url => set("profilePicture", url)}
          name={form.name || "Manager"}
          showToast={showToast}
        />
      </div>
    </Modal>
  );
}

// ManagersPage
function ManagersPage() {
  const { showToast } = useApp();

  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getManagers();
      setManagers(res.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load managers", "danger");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const handleSuccess = () => {
    showToast("Manager created successfully!", "success");
    setModalOpen(false);
    fetchManagers();
  };

  const filtered = managers.filter(m => {
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
          <h1 className="page-title">Manager Management</h1>
          <p className="page-subtitle">{managers.length} manager{managers.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Btn icon={<SvgIcon name="arrowRight" size={14} color="#fff" />} onClick={() => setModalOpen(true)}>
          Create Manager
        </Btn>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search managers by name, email, phone..." style={{ maxWidth: 400 }} />
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
            <p style={{ marginTop: 12, fontSize: 13 }}>Loading managers...</p>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "username", label: "Name / Username", render: (v, row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={row.name || v || "M"} src={row.profilePicture} size="sm" />
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
            ]}
            data={filtered}
            emptyState={
              <EmptyState
                icon={<SvgIcon name="shield" size={28} color="var(--primary)" />}
                title="No managers found"
                desc={search ? "Try adjusting your search." : "Create your first manager to get started."}
                action={!search && <Btn onClick={() => setModalOpen(true)}>Create Manager</Btn>}
              />
            }
          />
        )}
      </div>

      {/* Create Manager Modal */}
      <CreateManagerModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleSuccess} />
    </div>
  );
}

export default ManagersPage;
