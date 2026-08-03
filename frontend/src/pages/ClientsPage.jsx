// Clients Management Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { CLIENT_STATUSES, CLIENT_INDUSTRIES, PLATFORM_OPTIONS } from "../shared/constants";
import {
  SvgIcon, Btn, Avatar, EmptyState, SearchBar,
  Modal, FormInput, DataTable, ProgressBar, InfoRow,
} from "../shared/components";
import { createClient as apiCreateClient, updateClient, deleteClient, getManagers, getClientSocialConnection, getToken, disconnectPlatform } from "../services/api";

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

function SocialConnectionsSection({ clientId, showToast }) {
  const [connections, setConnections] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await getClientSocialConnection(clientId);
      if (res.success && res.data) {
        setConnections(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchConnections();
    }
  }, [clientId]);

  const handleConnect = (platformKey) => {
    let backendHost = "";
    const apiEnv = import.meta.env.VITE_API_URL;
    if (apiEnv) {
      backendHost = apiEnv.replace(/\/api\/?$/, "").replace(/\/$/, "");
    } else {
      backendHost = "http://localhost:5000";
    }

    const token = getToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "danger");
      return;
    }

    const connectionUrl = `${backendHost}/auth/postproxy/connect?token=${token}&platform=${platformKey}&clientId=${clientId}`;
    window.location.href = connectionUrl;
  };

  const handleDisconnect = async (platformKey, platformName) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platformName}?`)) return;
    try {
      setLoading(true);
      const res = await disconnectPlatform(platformKey, clientId);
      if (res.success) {
        showToast(`${platformName} disconnected successfully!`, "success");
        fetchConnections();
      }
    } catch (err) {
      console.error(err);
      showToast(`Failed to disconnect ${platformName}.`, "danger");
    } finally {
      setLoading(false);
    }
  };

  const SUPPORTED_PLATFORMS = [
    { key: "instagram", name: "Instagram", statusKey: "instagramConnected", usernameKey: "instagramUsername", icon: "I", color: "#E1306C" },
    { key: "facebook", name: "Facebook", statusKey: "facebookConnected", usernameKey: "facebookPageName", icon: "F", color: "#1877F2" },
    { key: "linkedin", name: "LinkedIn", statusKey: "linkedinConnected", usernameKey: "linkedinUsername", icon: "L", color: "#0A66C2" },
    { key: "youtube", name: "YouTube", statusKey: "youtubeConnected", usernameKey: "youtubeUsername", icon: "Y", color: "#FF0000" },
    { key: "twitter", name: "X (Twitter)", statusKey: "twitterConnected", usernameKey: "twitterUsername", icon: "X", color: "#1DA1F2" },
    { key: "tiktok", name: "TikTok", statusKey: "tiktokConnected", usernameKey: "tiktokUsername", icon: "T", color: "#010101" }
  ];

  if (loading && !connections) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "10px 0" }}>Loading connections status...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {SUPPORTED_PLATFORMS.map(platform => {
        const isConnected = connections ? connections[platform.statusKey] : false;
        const username = connections ? connections[platform.usernameKey] : "";
        return (
          <div key={platform.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: isConnected ? "rgba(255,106,0,0.1)" : "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: platform.color }}>
                {platform.icon}
              </div>
              <div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)" }}>{platform.name}</span>
                {isConnected && username && (
                  <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>@{username}</span>
                )}
              </div>
            </div>
            {isConnected ? (
              <button
                type="button"
                onClick={() => handleDisconnect(platform.key, platform.name)}
                style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect(platform.key)}
                style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                Connect
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}


// Client helpers
const getMonthsDiff = (startStr, renewalStr) => {
  if (!startStr || !renewalStr) return "custom";
  const start = new Date(startStr);
  const renewal = new Date(renewalStr);
  if (isNaN(start.getTime()) || isNaN(renewal.getTime())) return "custom";
  const diffMonths = (renewal.getFullYear() - start.getFullYear()) * 12 + (renewal.getMonth() - start.getMonth());
  return [1, 3, 6, 12, 24].includes(diffMonths) ? String(diffMonths) : "custom";
};

const calculateRenewalDate = (start, months) => {
  if (!start || !months || months === "custom") return "";
  const date = new Date(start);
  date.setMonth(date.getMonth() + parseInt(months));
  return date.toISOString().split("T")[0];
};

const formatDate = (dateStr) => {
  if (!dateStr) return " - ";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const blankClient = {
  name: "", brandName: "", industry: "", contactPerson: "", email: "", phone: "",
  assignedAM: "", assignedManager: "",
  monthlyDeliverables: "", deliverableBreakdown: {
    monthly: { "Video": 0, "Reel/Short": 0, "Static/Carousel": 0, "Story": 0, "Blog": 0, "Ad Creative": 0 },
    setup: { "Website Setup": false, "Branding": false, "Analytics Setup": false, "Pixel Setup": false, "SEO Audit": false }
  },
  startDate: "",
  contractDuration: "6",
  renewalDate: "",
  status: "active", platforms: [], notes: "",
};

// ClientFormModal
function ClientFormModal({ open, onClose, initial, employees, managers, session, onSave }) {
  const role = session?.role || "employee";

  const getInitialForm = () => {
    if (initial) {
      let breakdown = { monthly: {}, setup: {} };
      if (initial.deliverableBreakdown) {
        if (initial.deliverableBreakdown.monthly) {
          breakdown = { ...initial.deliverableBreakdown };
        } else {
          breakdown = { monthly: { ...initial.deliverableBreakdown }, setup: {} };
        }
      }
      breakdown.monthly = {
        "Video": 0, "Reel/Short": 0, "Static/Carousel": 0, "Story": 0, "Blog": 0, "Ad Creative": 0,
        ...(breakdown.monthly || {})
      };
      breakdown.setup = {
        "Website Setup": false, "Branding": false, "Analytics Setup": false, "Pixel Setup": false, "SEO Audit": false,
        ...(breakdown.setup || {})
      };
      const calculatedDuration = getMonthsDiff(initial.startDate, initial.renewalDate);

      return {
        ...initial,
        name: initial.companyName || initial.name || "",
        phone: initial.phoneNumber || initial.phone || "",
        deliverableBreakdown: breakdown,
        contractDuration: calculatedDuration
      };
    } else {
      const start = new Date().toISOString().split("T")[0];
      return {
        ...blankClient,
        startDate: start,
        contractDuration: "6",
        renewalDate: calculateRenewalDate(start, "6"),
      };
    }
  };

  const { showToast } = useApp();
  const [form, setForm] = useState(getInitialForm);
  const [deliverableTab, setDeliverableTab] = useState("monthly");
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(false);
  const [createdClientId, setCreatedClientId] = useState(null);

  const set = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === "startDate" || k === "contractDuration") {
        const calculated = calculateRenewalDate(next.startDate, next.contractDuration);
        if (calculated) {
          next.renewalDate = calculated;
        }
      } else if (k === "renewalDate") {
        next.contractDuration = "custom";
      }
      return next;
    });
  };

  const togglePlatform = p => set("platforms", form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p]);

  const setBreakdownMonthly = (type, val) => {
    setForm(p => ({
      ...p,
      deliverableBreakdown: {
        ...p.deliverableBreakdown,
        monthly: {
          ...(p.deliverableBreakdown?.monthly || {}),
          [type]: parseInt(val) || 0
        }
      }
    }));
  };

  const toggleBreakdownSetup = (type) => {
    setForm(p => ({
      ...p,
      deliverableBreakdown: {
        ...p.deliverableBreakdown,
        setup: {
          ...(p.deliverableBreakdown?.setup || {}),
          [type]: !p.deliverableBreakdown?.setup?.[type]
        }
      }
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Client name is required";
    if (!form.contactPerson.trim()) e.contactPerson = "Contact person is required";
    if (form.email && form.email.trim() && !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = "Enter a valid email address";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const monthlyTotal = Object.values(form.deliverableBreakdown?.monthly || {}).reduce((a, b) => a + (parseInt(b) || 0), 0);

    let emailVal = form.email ? form.email.trim() : "";
    let usernameVal = form.username;

    if (!initial) {
      const cleanName = (form.name || "client").toLowerCase().replace(/[^a-z0-9]/g, "");
      const suffix = Math.floor(100 + Math.random() * 900);
      usernameVal = `${cleanName}_${suffix}`;
      if (!emailVal) {
        emailVal = `${usernameVal}@agencyclient.com`;
      }
    } else if (initial && !emailVal) {
      const cleanName = (form.name || "client").toLowerCase().replace(/[^a-z0-9]/g, "");
      const suffix = Math.floor(100 + Math.random() * 900);
      emailVal = `${cleanName}_${suffix}@agencyclient.com`;
    }

    const finalForm = {
      ...form,
      email: emailVal,
      username: usernameVal,
      monthlyDeliverables: monthlyTotal || 30
    };

    if (!initial) {
      onSave(finalForm)
        .then(newClient => {
          if (newClient && newClient.id) {
            setCreatedClientId(newClient.id);
            setCreated(true);
          } else {
            onClose();
          }
        })
        .catch(() => { });
    } else {
      onSave(finalForm);
    }
  };

  const accountManagers = employees.filter(e => e.designation === "Account Manager" || e.role === "accountmanager");
  const canAssignManager = role === "superadmin";

  const monthlyTypes = ["Video", "Reel/Short", "Static/Carousel", "Story", "Blog", "Ad Creative"];
  const setupTypes = ["Website Setup", "Branding", "Analytics Setup", "Pixel Setup", "SEO Audit"];
  const breakdownTotal = Object.values(form.deliverableBreakdown?.monthly || {}).reduce((a, v) => a + (parseInt(v) || 0), 0);

  if (created) {
    return (
      <Modal open={open} onClose={onClose} size="md" title="Client Created Successfully 🎉"
        footer={<div style={{ display: "flex", gap: 10 }}><Btn onClick={onClose}>Close & Refresh</Btn></div>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#DCFCE7", borderRadius: 10, border: "1px solid #BBF7D0" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#15803D", margin: 0 }}>Credentials Sent via Email</p>
              <p style={{ fontSize: 12.5, color: "#166534", margin: "4px 0 0", lineHeight: 1.4 }}>Login credentials have been automatically emailed to the client.</p>
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16, background: "#F9FAFB" }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 10px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🔗 Connect Social Media Accounts Now</p>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.4 }}>You can link the client's social accounts directly to set up automated publishing immediately.</p>
            <SocialConnectionsSection clientId={createdClientId} showToast={showToast} />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={initial ? "Edit Client" : "Add New Client"}
      footer={
        <div style={{ display: "flex", width: "100%", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSubmit}>{initial ? "Save Changes" : "Add Client"}</Btn>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxHeight: "70vh", overflowY: "auto", paddingRight: 10 }}>

        {/* Section 1: Client Profile */}
        <div>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            💼 Client Profile
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid-2">
              <FormInput label="Client / Company Name *" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Client or company name" error={errors.name} />
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
              <FormInput label="Contact Person Name *" value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} placeholder="Primary point of contact" error={errors.contactPerson} />
            </div>
            <div className="grid-2">
              <FormInput label="Contact Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email address" error={errors.email} />
              <FormInput label="Contact Phone" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone number" />
            </div>
          </div>
        </div>

        {/* Section 2: Contract Details */}
        <div>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            📅 Contract Details
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Client Status</label>
                <select className="form-input" value={form.status} onChange={e => set("status", e.target.value)}>
                  {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={form.startDate ? form.startDate.split("T")[0] : ""} onChange={e => set("startDate", e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Contract Duration</label>
                <select className="form-input" value={form.contractDuration} onChange={e => set("contractDuration", e.target.value)}>
                  <option value="custom">Custom / Non-recurring</option>
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">End Date {form.contractDuration !== "custom" && "(Auto-calculated)"}</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.renewalDate ? form.renewalDate.split("T")[0] : ""}
                  onChange={e => set("renewalDate", e.target.value)}
                  style={{ background: "#fff", cursor: "text" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Scope & Deliverables */}
        <div>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🎯 Scope & Deliverables
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 4 }}>
              <label className="form-label">Selected Platforms</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PLATFORM_OPTIONS.map(p => (
                  <button key={p} type="button" onClick={() => togglePlatform(p)} className={`filter-chip ${form.platforms.includes(p) ? "active" : ""}`} style={{ fontSize: 12 }}>{p}</button>
                ))}
              </div>
            </div>

            {/* Segmented Toggle for Deliverables View */}
            <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content", marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setDeliverableTab("monthly")}
                style={{
                  padding: "8px 16px",
                  background: deliverableTab === "monthly" ? "var(--light-orange)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: deliverableTab === "monthly" ? "var(--primary)" : "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease"
                }}
              >
                <SvgIcon name="repeat" size={13} color={deliverableTab === "monthly" ? "var(--primary)" : "var(--muted)"} />
                Monthly Scope
              </button>
              <button
                type="button"
                onClick={() => setDeliverableTab("contractual")}
                style={{
                  padding: "8px 16px",
                  background: deliverableTab === "contractual" ? "var(--light-orange)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: deliverableTab === "contractual" ? "var(--primary)" : "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease"
                }}
              >
                <SvgIcon name="checklist" size={13} color={deliverableTab === "contractual" ? "var(--primary)" : "var(--muted)"} />
                Contractual Scope
              </button>
            </div>

            {deliverableTab === "monthly" ? (
              <div className="fade-in">
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Monthly Scope (Recurring)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {monthlyTypes.map(type => (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 12.5, flex: 1, fontWeight: 600 }}>{type}</span>
                      <input
                        type="number"
                        min="0"
                        value={form.deliverableBreakdown?.monthly?.[type] !== undefined ? form.deliverableBreakdown.monthly[type] : ""}
                        onChange={e => setBreakdownMonthly(type, e.target.value)}
                        placeholder="0"
                        style={{ width: 60, padding: "4px 8px", borderRadius: 6, border: "1.5px solid var(--border)", fontSize: 12.5, textAlign: "center", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = "var(--primary)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                  <span>Total deliverables / month:</span>
                  <span>{breakdownTotal}</span>
                </div>
              </div>
            ) : (
              <div className="fade-in">
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Contract Setup Scope (One-time)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {setupTypes.map(type => {
                    const checked = !!form.deliverableBreakdown?.setup?.[type];
                    return (
                      <div
                        key={type}
                        onClick={() => toggleBreakdownSetup(type)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          background: checked ? "var(--light-orange)" : "#F9FAFB",
                          borderRadius: 8,
                          border: checked ? "1px solid rgba(255,106,0,0.3)" : "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => { }}
                          style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: checked ? "var(--deep)" : "var(--dark)" }}>{type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <FormInput label="Internal Setup Notes" type="textarea" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal onboarding details or contract specifics..." />
            </div>
          </div>
        </div>

        {/* Section 4: Social Connections */}
        <div style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🔗 Social Media Connections
          </h3>
          {initial ? (
            <SocialConnectionsSection clientId={initial.id} showToast={showToast} />
          ) : (
            <div style={{ background: "#F3F4F6", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <SvgIcon name="alert" size={16} color="var(--muted)" />
              <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
                Social media accounts can be connected immediately after saving the client profile details.
              </span>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}

// ClientDrawer
function ClientDrawer({ client, open, onClose, tasks, employees, onEdit, canDelete, onDelete }) {
  if (!open || !client) return null;
  const { showToast } = useApp();
  const meta = clientStatusMeta(client.status);
  const clientTasks = tasks.filter(t => t.clientId === client.id);
  const approved = clientTasks.filter(t => t.approvalStatus === "approved").length;
  const pending = clientTasks.filter(t => t.approvalStatus === "pending").length;
  const total = client.monthlyDeliverables ? parseInt(client.monthlyDeliverables) : 30;
  const pct = Math.min(100, Math.round((approved / Math.max(total, 1)) * 100));
  const assignedEmp = employees.find(e => e.id === client.assignedAM);

  const today = new Date();
  const renewalDate = client.renewalDate ? new Date(client.renewalDate) : null;
  const daysLeft = renewalDate ? Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24)) : null;
  const isNearRenewal = renewalDate && daysLeft <= 30 && daysLeft >= 0;

  let monthlyBreakdown = {};
  let setupBreakdown = {};

  if (client.deliverableBreakdown) {
    if (client.deliverableBreakdown.monthly) {
      monthlyBreakdown = client.deliverableBreakdown.monthly;
      setupBreakdown = client.deliverableBreakdown.setup || {};
    } else {
      monthlyBreakdown = client.deliverableBreakdown;
    }
  }

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
          {isNearRenewal && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#92400E", fontSize: 12.5, display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}>
              <SvgIcon name="alert" size={14} color="#B45309" />
              <span>
                <strong>Contract End Date:</strong> Ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""} ({formatDate(client.renewalDate)}).
              </span>
            </div>
          )}

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

          {Object.keys(monthlyBreakdown).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Recurring Scope</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(monthlyBreakdown).map(([type, val]) => val > 0 && (
                  <span key={type} className="badge badge-muted" style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, border: "1.5px solid var(--border)", display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "var(--primary)" }}>{val}</span> {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(setupBreakdown).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>One-Time Setup Status</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(setupBreakdown).map(([task, checked]) => (
                  <div key={task} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: checked ? "#DCFCE7" : "#FEE2E2", color: checked ? "#16A34A" : "#EF4444" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        {checked ? <polyline points="20 6 9 17 4 12" /> : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
                      </svg>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: checked ? "var(--dark)" : "var(--muted)" }}>{task}</span>
                    <span className={`badge ${checked ? "badge-success" : "badge-muted"}`} style={{ marginLeft: "auto", fontSize: 10.5 }}>{checked ? "Completed" : "Pending"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divider" style={{ margin: "10px 0 16px" }} />

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>🔗 Connected Social Accounts</p>
            <SocialConnectionsSection clientId={client.id} showToast={showToast} />
          </div>

          <div className="divider" style={{ margin: "10px 0 16px" }} />
          <InfoRow label="Contact Person" value={client.contactPerson} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Phone" value={client.phone} />
          <InfoRow label="Account Manager" value={assignedEmp?.name || client.assignedAM || " - "} />
          <InfoRow label="Package" value={client.packageName || " - "} />
          <InfoRow label="Deliverables / Month" value={client.monthlyDeliverables || " - "} />
          <InfoRow label="Start Date" value={formatDate(client.startDate || client.joinedAt)} />
          <InfoRow label="End Date" value={formatDate(client.renewalDate)} />

          {/* Platforms */}
          {(client.platforms || []).length > 0 && (
            <div style={{ marginBottom: 12, marginTop: 12 }}>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>Platforms</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {client.platforms.map(p => <span key={p} className="badge badge-orange" style={{ fontSize: 11 }}>{p}</span>)}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>Internal Notes</p>
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const connectedClientId = searchParams.get("clientId");

    if (success === "true") {
      showToast("Social account connected successfully!", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
      refreshClients();

      if (connectedClientId) {
        const found = clients.find(c => c.id === connectedClientId);
        if (found) {
          setDrawerClient(found);
        }
      }
    } else if (error === "oauth_failed") {
      showToast("Failed to connect social account.", "danger");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clients]);

  const canDelete = role === "superadmin";
  const canAdd = role === "superadmin" || role === "manager";

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
      const res = await apiCreateClient({
        username: form.email.split("@")[0] + "_" + Math.floor(Math.random() * 100),
        companyName: form.name,
        email: form.email,
        phoneNumber: form.phone || "0000000000",
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
      refreshClients();
      return res.data;
    } catch (err) {
      showToast(err.message || "Failed to add client", "danger");
      throw err;
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
                key: "name", label: "Client", width: "35%", render: (v, row) => {
                  const today = new Date();
                  const rDate = row.renewalDate ? new Date(row.renewalDate) : null;
                  const days = rDate ? Math.ceil((rDate - today) / (1000 * 60 * 60 * 24)) : null;
                  const near = rDate && days <= 30 && days >= 0;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: (row.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: row.brandColor || "var(--primary)", flexShrink: 0 }}>{v.charAt(0)}</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
                          {near && <span className="badge badge-warning" style={{ fontSize: 10, padding: "1px 5px", color: "#854D0E", background: "#FEF9C3", border: "1px solid #FEF08A" }}>⏳ {days}d left</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{row.brandName && row.brandName !== v ? row.brandName : row.industry}</div>
                      </div>
                    </div>
                  );
                }
              },
              { key: "packageName", label: "Package", width: "20%", hideOnMobile: true, render: v => <span style={{ fontSize: 12.5 }}>{v || " - "}</span> },
              {
                key: "assignedAM", label: "Account Mgr", width: "20%", hideOnMobile: true, render: v => {
                  const emp = employees.find(e => e.id === v);
                  return emp ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar name={emp.name || emp.username} size="sm" /><span style={{ fontSize: 12.5 }}>{(emp.name || emp.username || "").split(" ")[0]}</span></div> : <span style={{ fontSize: 12.5, color: "var(--muted)" }}> - </span>;
                }
              },
              { key: "status", label: "Status", width: "15%", render: v => { const m = clientStatusMeta(v); return <span className={`badge ${m.cls}`}><span className="dot" style={{ width: 6, height: 6, background: m.dot }} />{m.label}</span>; } },
              {
                key: "id", label: "", width: "10%", render: (_, row) => (
                  <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
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
            const today = new Date();
            const meta = clientStatusMeta(c.status);
            const ctasks = tasks.filter(t => t.clientId === c.id);
            const cpending = ctasks.filter(t => t.approvalStatus === "pending").length;
            const capproved = ctasks.filter(t => t.approvalStatus === "approved").length;
            const emp = employees.find(e => e.id === c.assignedAM);

            const rDate = c.renewalDate ? new Date(c.renewalDate) : null;
            const days = rDate ? Math.ceil((rDate - today) / (1000 * 60 * 60 * 24)) : null;
            const near = rDate && days <= 30 && days >= 0;

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
                {near && (
                  <div style={{ fontSize: 10.5, color: "#B45309", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 6, padding: "4px 8px", marginTop: 8, display: "flex", gap: 4, alignItems: "center", fontWeight: 500 }}>
                    ⏳ Ends in {days} days ({formatDate(c.renewalDate)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      {addOpen && (
        <ClientFormModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          initial={null}
          employees={employees}
          managers={managers}
          session={session}
          onSave={handleAdd}
        />
      )}

      {/* Edit Client Modal */}
      {editClient && (
        <ClientFormModal
          open={!!editClient}
          onClose={() => setEditClient(null)}
          initial={editClient}
          employees={employees}
          managers={managers}
          session={session}
          onSave={handleEdit}
        />
      )}

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
    </div>
  );
}

// Tasks Page

export default ClientsPage;
