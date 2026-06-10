import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import {
  getCompanySettings,
  updateCompanySettings,
  getPermissionsSettings,
  updatePermissionsSettings,
  getPublishingSettings,
  connectPublishingPlatform,
  disconnectPublishingPlatform,
  getNotificationsSettings,
  updateNotificationsSettings,
  getToken
} from "../services/api";
import { SvgIcon, Btn, FormInput, ImageUploadDropdown } from "../shared/components";
import { INDUSTRY_OPTIONS, TIMEZONE_OPTIONS } from "../shared/constants";

function SettingsPage() {
  const { showToast, session } = useApp();
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Only image files are allowed", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingLogo(true);
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

      setCompanyForm(prev => ({ ...prev, companyLogo: data.url }));
      showToast("Logo uploaded successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to upload logo", "danger");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: "",
    companyLogo: "",
    email: "",
    phoneNumber: "",
    website: "",
    industryType: "",
    employeeCount: "",
    address: "",
    gstId: "",
    timezone: ""
  });

  const [permissions, setPermissions] = useState({
    createClients: true,
    editClients: true,
    deleteClients: true,
    createEmployees: true,
    assignEmployees: true,
    createTasks: true,
    assignTasks: true,
    approveContent: true,
    schedulePublishing: true,
    createAnnouncements: true,
    viewReports: true
  });

  const [publishing, setPublishing] = useState({
    instagram: { status: "Disconnected", username: "" },
    facebook: { status: "Disconnected", username: "" },
    linkedin: { status: "Disconnected", username: "" },
    youtube: { status: "Disconnected", username: "" },
    pinterest: { status: "Disconnected", username: "" }
  });

  const [notifications, setNotifications] = useState({
    taskAssignments: true,
    approvalRequests: true,
    publishingFailures: true,
    clientFeedback: true,
    announcements: true
  });

  // Fetch initial data
  const loadSettingsData = async () => {
    setLoading(true);
    try {
      if (activeTab === "company") {
        const res = await getCompanySettings();
        if (res.success && res.data) {
          setCompanyForm({
            name: res.data.name || "",
            companyLogo: res.data.companyLogo || "",
            email: res.data.email || "",
            phoneNumber: res.data.phoneNumber || "",
            website: res.data.website || "",
            industryType: res.data.industryType || "",
            employeeCount: res.data.employeeCount || "",
            address: res.data.address || "",
            gstId: res.data.gstId || "",
            timezone: res.data.timezone || ""
          });
        }
      } else if (activeTab === "permissions") {
        const res = await getPermissionsSettings();
        if (res.success && res.data) {
          setPermissions(res.data);
        }
      } else if (activeTab === "publishing") {
        const res = await getPublishingSettings();
        if (res.success && res.data) {
          setPublishing(res.data);
        }
      } else if (activeTab === "notifications") {
        const res = await getNotificationsSettings();
        if (res.success && res.data) {
          setNotifications(res.data);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load settings data.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, [activeTab]);

  // Save actions
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...companyForm };
      if (payload.employeeCount) {
        payload.employeeCount = Number(payload.employeeCount);
      }
      const res = await updateCompanySettings(payload);
      if (res.success) {
        showToast("Company settings updated successfully.", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to update company settings.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePermissions = async () => {
    setLoading(true);
    try {
      const res = await updatePermissionsSettings(permissions);
      if (res.success) {
        showToast("Permissions updated successfully.", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to update permissions.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const res = await updateNotificationsSettings(notifications);
      if (res.success) {
        showToast("Notification preferences updated successfully.", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to update notification settings.", "danger");
    } finally {
      setLoading(false);
    }
  };

  // Connection handlers for Publishing
  const handleConnectPlatform = async (platform) => {
    const username = prompt(`Enter account username for ${platform}:`);
    if (!username) return;
    
    setLoading(true);
    try {
      const res = await connectPublishingPlatform({ platform, username });
      if (res.success) {
        setPublishing(res.data);
        showToast(`${platform} connected successfully.`, "success");
      }
    } catch (err) {
      showToast(err.message || `Failed to connect ${platform}.`, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;

    setLoading(true);
    try {
      const res = await disconnectPublishingPlatform({ platform });
      if (res.success) {
        setPublishing(res.data);
        showToast(`${platform} disconnected.`, "info");
      }
    } catch (err) {
      showToast(err.message || `Failed to disconnect ${platform}.`, "danger");
    } finally {
      setLoading(false);
    }
  };

  if (session?.role !== "superadmin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: "var(--danger)" }}>Access Denied</h2>
        <p>Only Super Administrators have access to this Settings module.</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage core agency structures, permissions, integrations, and preferences.</p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        {[
          { id: "company", label: "Company Profile", icon: "building" },
          { id: "permissions", label: "Manager Permissions", icon: "shield" },
          { id: "publishing", label: "Publishing & Socials", icon: "checklist" },
          { id: "notifications", label: "Notifications", icon: "bell" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              color: activeTab === t.id ? "var(--primary)" : "var(--muted)",
              fontWeight: activeTab === t.id ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              borderBottom: activeTab === t.id ? "2.5px solid var(--primary)" : "2.5px solid transparent",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <SvgIcon name={t.icon} size={15} color={activeTab === t.id ? "var(--primary)" : "var(--muted)"} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Refreshing data...
        </div>
      )}

      {/* Tab 1: Company Profile */}
      {activeTab === "company" && !loading && (
        <form onSubmit={handleSaveCompany} className="card" style={{ maxWidth: 760, padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Agency Brand Identity</h2>
          
          <ImageUploadDropdown
            value={companyForm.companyLogo}
            onChange={url => setCompanyForm(prev => ({ ...prev, companyLogo: url }))}
            name={companyForm.name || "Agency"}
            label="Agency Logo"
            showToast={showToast}
          />

          <div className="grid-2">
            <FormInput
              label="Company / Agency Name *"
              value={companyForm.name}
              onChange={e => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid-2">
            <FormInput
              label="Contact Email Address *"
              type="email"
              value={companyForm.email}
              onChange={e => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <FormInput
              label="Phone Number"
              value={companyForm.phoneNumber}
              onChange={e => setCompanyForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
            />
          </div>

          <div className="grid-2">
            <FormInput
              label="Website Link"
              value={companyForm.website}
              onChange={e => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://agency.com"
            />
            <div className="form-group">
              <label className="form-label">Industry Sector</label>
              <select
                className="form-input"
                value={companyForm.industryType}
                onChange={e => setCompanyForm(prev => ({ ...prev, industryType: e.target.value }))}
              >
                <option value="">Select industry...</option>
                {INDUSTRY_OPTIONS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <FormInput
              label="Employee Count"
              type="number"
              value={companyForm.employeeCount}
              onChange={e => setCompanyForm(prev => ({ ...prev, employeeCount: e.target.value }))}
            />
            <FormInput
              label="GST Registration Number"
              value={companyForm.gstId}
              onChange={e => setCompanyForm(prev => ({ ...prev, gstId: e.target.value }))}
              placeholder="e.g. 27AAAAA0000A1Z"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Agency Timezone</label>
              <select
                className="form-input"
                value={companyForm.timezone}
                onChange={e => setCompanyForm(prev => ({ ...prev, timezone: e.target.value }))}
              >
                <option value="">Select timezone...</option>
                {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <FormInput
              label="Corporate Headquarters Address"
              value={companyForm.address}
              onChange={e => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Btn type="submit">Save Changes</Btn>
          </div>
        </form>
      )}

      {/* Tab 2: Permissions Configuration */}
      {activeTab === "permissions" && !loading && (
        <div className="card" style={{ maxWidth: 760, padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Manager Privileges</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Configure what actions managers are permitted to execute across the CRM.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "createClients", label: "Create Clients", desc: "Allow managers to create client accounts and profiles" },
              { key: "editClients", label: "Edit Clients", desc: "Allow managers to modify client metadata, breakdown, and assets" },
              { key: "deleteClients", label: "Delete Clients", desc: "Allow managers to permanently delete clients from the workspace" },
              { key: "createEmployees", label: "Create Employees", desc: "Allow managers to register new employees" },
              { key: "assignEmployees", label: "Assign Employees", desc: "Allow managers to assign tasks and shoots to specific employees" },
              { key: "createTasks", label: "Create Tasks", desc: "Allow managers to create fresh content tasks" },
              { key: "assignTasks", label: "Assign Tasks", desc: "Allow managers to assign/reassign employee tasks" },
              { key: "approveContent", label: "Approve Content", desc: "Allow managers to give internal approvals on draft files" },
              { key: "schedulePublishing", label: "Schedule Publishing", desc: "Allow managers to queue approved deliverables to social queue" },
              { key: "createAnnouncements", label: "Create Announcements", desc: "Allow managers to broadcast bulletins to clients/staff" },
              { key: "viewReports", label: "View Reports", desc: "Allow managers to view performance reports and analytics" }
            ].map(p => (
              <div
                key={p.key}
                onClick={() => togglePermission(p.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "#F9FAFB",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  userSelect: "none"
                }}
                className="hover-lift"
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--dark)" }}>{p.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{p.desc}</div>
                </div>
                {/* Switch UI */}
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 99,
                    background: permissions[p.key] ? "var(--success)" : "#D1D5DB",
                    position: "relative",
                    transition: "background 0.2s ease",
                    padding: 2
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 2,
                      left: permissions[p.key] ? 18 : 2,
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={handleSavePermissions}>Save Permissions</Btn>
          </div>
        </div>
      )}

      {/* Tab 3: Publishing */}
      {activeTab === "publishing" && !loading && (
        <div className="card" style={{ maxWidth: 760, padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Social Integrations & Publishing Engine</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Connected channels that support scheduling post deliverables directly to feeds.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { id: "instagram", label: "Instagram Feed & Reels", color: "#E1306C" },
              { id: "facebook", label: "Facebook Page", color: "#1877F2" },
              { id: "linkedin", label: "LinkedIn Company Page", color: "#0A66C2" },
              { id: "youtube", label: "YouTube Channel", color: "#FF0000" },
              { id: "pinterest", label: "Pinterest Board", color: "#BD081C" }
            ].map(plat => {
              const conn = publishing[plat.id] || { status: "Disconnected", username: "" };
              const isConnected = conn.status === "Connected";
              
              return (
                <div
                  key={plat.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    border: "1.5px solid var(--border)",
                    borderRadius: 12,
                    background: "#fff"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: `${plat.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: 700,
                        color: plat.color
                      }}
                    >
                      {plat.label[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--dark)" }}>{plat.label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: isConnected ? "var(--success)" : "var(--muted)"
                          }}
                        />
                        <span style={{ fontSize: 11.5, color: isConnected ? "var(--success)" : "var(--muted)", fontWeight: 600 }}>
                          {isConnected ? `Connected as @${conn.username}` : "Not Integrated"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isConnected ? (
                      <Btn variant="danger" size="sm" onClick={() => handleDisconnectPlatform(plat.id)}>Disconnect</Btn>
                    ) : (
                      <Btn variant="outline" size="sm" onClick={() => handleConnectPlatform(plat.id)}>Integrate Platform</Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Notifications Preference */}
      {activeTab === "notifications" && !loading && (
        <div className="card" style={{ maxWidth: 760, padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Global System Notifications</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Configure global preferences regarding what events broadcast notifications inside the CRM system.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "taskAssignments", label: "Task Assignments", desc: "Notify employees and CC managers when content tasks are allocated" },
              { key: "approvalRequests", label: "Approval Requests", desc: "Notify managers on ready-for-review uploads and clients on review dispatch" },
              { key: "publishingFailures", label: "Publishing Failures", desc: "Broadcast warning alerts if scheduled posts fail to publish to social feeds" },
              { key: "clientFeedback", label: "Client Feedback", desc: "Alert managers and creative leads when a client requests revisions on drafts" },
              { key: "announcements", label: "New Announcements", desc: "Send standard notification alerts to target audiences when announcements publish" }
            ].map(notif => (
              <div
                key={notif.key}
                onClick={() => toggleNotification(notif.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "#F9FAFB",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  userSelect: "none"
                }}
                className="hover-lift"
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--dark)" }}>{notif.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{notif.desc}</div>
                </div>
                {/* Switch UI */}
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 99,
                    background: notifications[notif.key] ? "var(--success)" : "#D1D5DB",
                    position: "relative",
                    transition: "background 0.2s ease",
                    padding: 2
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 2,
                      left: notifications[notif.key] ? 18 : 2,
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={handleSaveNotifications}>Save Preferences</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
