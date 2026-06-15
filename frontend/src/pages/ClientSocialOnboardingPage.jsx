import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { getSocialConnections, getToken } from "../services/api";
import { SvgIcon, Btn } from "../shared/components";

function ClientSocialOnboardingPage() {
  const { showToast } = useApp();
  const [connections, setConnections] = useState({
    instagram: { connected: false, username: "", businessId: "", connectedAt: null },
    facebook: { connected: false, pageName: "", pageId: "", connectedAt: null },
  });
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await getSocialConnections();
      if (res.success && res.data) {
        setConnections(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch social connection details.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();

    // Check query params for success/error notifications from callback redirect
    const searchParams = new URLSearchParams(window.location.search);
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      showToast("Social account connected successfully!", "success");
      // Clear URL parameters to clean up address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchConnections();
    } else if (error === "oauth_failed") {
      showToast("Failed to connect social account.", "danger");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
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

    // Redirect to backend OAuth initiator path with token
    window.location.href = `${backendHost}/auth/meta?token=${token}`;
  };

  const handlePlaceholderDisconnect = (platform) => {
    alert(`${platform} disconnect functionality not implemented (placeholder).`);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">Social Account Connections</h1>
        <p className="page-subtitle">Link your Facebook Pages and Instagram Business Accounts to enable automated publishing from CRM.</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", marginRight: 10 }} />
          Loading connection status...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
          {/* Channels Grid */}
          <div className="grid-2">
            
            {/* Instagram Card */}
            <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 280, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(225, 48, 108, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#E1306C", fontWeight: 700 }}>
                    I
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--dark)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Instagram</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>Feed, Stories & Reels scheduling</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span style={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: "4px 10px", 
                  borderRadius: 99, 
                  background: connections.instagram.connected ? "var(--success)15" : "var(--border)", 
                  color: connections.instagram.connected ? "var(--success)" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: connections.instagram.connected ? "var(--success)" : "var(--muted)" }} />
                  {connections.instagram.connected ? "Connected" : "Not Connected"}
                </span>
              </div>

              {/* Connected details */}
              <div style={{ margin: "24px 0" }}>
                {connections.instagram.connected ? (
                  <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingBottom: 6, borderBottom: "1px dashed var(--border)" }}>
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>Username:</span>
                      <span style={{ fontWeight: 700, color: "var(--dark)" }}>@{connections.instagram.username}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingTop: 6 }}>
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>Linked At:</span>
                      <span style={{ fontWeight: 600, color: "var(--dark)" }}>{new Date(connections.instagram.connectedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                    Connect your Instagram Business account to authorize and schedule direct publishing of images and videos.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                {connections.instagram.connected ? (
                  <>
                    <Btn variant="outline" size="sm" onClick={handleConnect}>Reconnect</Btn>
                    <Btn variant="danger" size="sm" onClick={() => handlePlaceholderDisconnect("Instagram")}>Disconnect</Btn>
                  </>
                ) : (
                  <Btn variant="primary" size="sm" onClick={handleConnect}>Connect Account</Btn>
                )}
              </div>
            </div>

            {/* Facebook Card */}
            <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 280, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(24, 119, 242, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#1877F2", fontWeight: 700 }}>
                    F
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--dark)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Facebook Page</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>Page post scheduling & tracking</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span style={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: "4px 10px", 
                  borderRadius: 99, 
                  background: connections.facebook.connected ? "var(--success)15" : "var(--border)", 
                  color: connections.facebook.connected ? "var(--success)" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: connections.facebook.connected ? "var(--success)" : "var(--muted)" }} />
                  {connections.facebook.connected ? "Connected" : "Not Connected"}
                </span>
              </div>

              {/* Connected details */}
              <div style={{ margin: "24px 0" }}>
                {connections.facebook.connected ? (
                  <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingBottom: 6, borderBottom: "1px dashed var(--border)" }}>
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>Page Name:</span>
                      <span style={{ fontWeight: 700, color: "var(--dark)" }}>{connections.facebook.pageName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingTop: 6 }}>
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>Linked At:</span>
                      <span style={{ fontWeight: 600, color: "var(--dark)" }}>{new Date(connections.facebook.connectedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                    Connect your Facebook Page to schedule and publish image updates, links, and updates.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                {connections.facebook.connected ? (
                  <>
                    <Btn variant="outline" size="sm" onClick={handleConnect}>Reconnect</Btn>
                    <Btn variant="danger" size="sm" onClick={() => handlePlaceholderDisconnect("Facebook")}>Disconnect</Btn>
                  </>
                ) : (
                  <Btn variant="primary" size="sm" onClick={handleConnect}>Connect Account</Btn>
                )}
              </div>
            </div>

          </div>

          {/* Placeholders for Future Channels (LinkedIn, TikTok, X, YouTube) */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "var(--dark)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Upcoming Social Integrations
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
              {[
                { name: "LinkedIn", icon: "L", color: "#0A66C2" },
                { name: "TikTok", icon: "T", color: "#010101" },
                { name: "X (Twitter)", icon: "X", color: "#1DA1F2" },
                { name: "YouTube", icon: "Y", color: "#FF0000" }
              ].map(item => (
                <div key={item.name} style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 14, textAlign: "center", background: "#FAFBFB" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${item.color}10`, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, margin: "0 auto 8px" }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--dark)" }}>{item.name}</div>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", display: "inline-block", marginTop: 4 }}>
                    Planned
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientSocialOnboardingPage;
