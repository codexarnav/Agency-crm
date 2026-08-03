import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { getSocialConnections, getToken, disconnectPlatform } from "../services/api";
import { Btn, Modal } from "../shared/components";

const SUPPORTED_PLATFORMS = [
  { key: "instagram", name: "Instagram", desc: "Feed, Stories & Reels scheduling", icon: "I", color: "#E1306C", bg: "rgba(225, 48, 108, 0.1)" },
  { key: "facebook", name: "Facebook Page", desc: "Page post scheduling & tracking", icon: "F", color: "#1877F2", bg: "rgba(24, 119, 242, 0.1)" },
  { key: "linkedin", name: "LinkedIn", desc: "Share updates, articles & media", icon: "L", color: "#0A66C2", bg: "rgba(10, 102, 194, 0.1)" },
  { key: "youtube", name: "YouTube Channel", desc: "Publish videos & Shorts", icon: "Y", color: "#FF0000", bg: "rgba(255, 0, 0, 0.1)" },
  { key: "twitter", name: "X (Twitter)", desc: "Share tweets, threads & media", icon: "X", color: "#1DA1F2", bg: "rgba(29, 161, 242, 0.1)" },
  { key: "tiktok", name: "TikTok", desc: "Publish short-form videos & music", icon: "T", color: "#010101", bg: "rgba(1, 1, 1, 0.1)" }
];

function ClientSocialOnboardingPage() {
  const { showToast } = useApp();
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [guidePlatform, setGuidePlatform] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const handleConnect = (platformKey) => {
    const platform = SUPPORTED_PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

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

    const connectionUrl = `${backendHost}/auth/postproxy/connect?token=${token}&platform=${platformKey}`;

    setGuidePlatform({
      key: platformKey,
      name: platform.name,
      url: connectionUrl
    });
    setCopied(false);
  };

  const handleDisconnect = async (platformKey, platformName) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platformName}?`)) return;
    try {
      setLoading(true);
      const res = await disconnectPlatform(platformKey);
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

  return (
    <div className="fade-in" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">Social Account Connections</h1>
        <p className="page-subtitle">Link your social media channels to enable automated publishing and campaign queue scheduling.</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", marginRight: 10 }} />
          Loading connection status...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
          {/* Channels Grid */}
          <div className="grid-2">
            {SUPPORTED_PLATFORMS.map((platform) => {
              const conn = connections[platform.key] || { connected: false, username: "", connectedAt: null };
              return (
                <div key={platform.key} className="card" style={{ padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 280, position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: platform.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: platform.color, fontWeight: 700 }}>
                        {platform.icon}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--dark)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{platform.name}</h3>
                        <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>{platform.desc}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 99,
                      background: conn.connected ? "var(--success)15" : "var(--border)",
                      color: conn.connected ? "var(--success)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: conn.connected ? "var(--success)" : "var(--muted)" }} />
                      {conn.connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>

                  {/* Connected details */}
                  <div style={{ margin: "24px 0" }}>
                    {conn.connected ? (
                      <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingBottom: 6, borderBottom: "1px dashed var(--border)" }}>
                          <span style={{ color: "var(--muted)", fontWeight: 500 }}>Profile:</span>
                          <span style={{ fontWeight: 700, color: "var(--dark)" }}>@{conn.username}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingTop: 6 }}>
                          <span style={{ color: "var(--muted)", fontWeight: 500 }}>Linked At:</span>
                          <span style={{ fontWeight: 600, color: "var(--dark)" }}>{new Date(conn.connectedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                          Connect your {platform.name} account to authorize and schedule direct publishing of images and videos.
                        </p>
                        <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4, margin: "8px 0 0", fontStyle: "italic" }}>
                          💡 <strong>Tip:</strong> If you are automatically logged into the wrong account, try logging out of Facebook/Instagram first, or perform this connection in an <strong>Incognito window</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                    {conn.connected ? (
                      <>
                        <Btn variant="outline" size="sm" onClick={() => handleConnect(platform.key)}>Reconnect</Btn>
                        <Btn variant="danger" size="sm" onClick={() => handleDisconnect(platform.key, platform.name)}>Disconnect</Btn>
                      </>
                    ) : (
                      <Btn variant="primary" size="sm" onClick={() => handleConnect(platform.key)}>Connect Account</Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pre-Connection Guide Modal */}
      <Modal
        open={!!guidePlatform}
        onClose={() => setGuidePlatform(null)}
        title={`Connect ${guidePlatform?.name || "Social Account"}`}
        size="md"
      >
        <div style={{ padding: "4px 0" }}>
          <p style={{ fontSize: 13.5, color: "var(--dark)", lineHeight: 1.5, margin: "0 0 16px" }}>
            To connect your business/brand social media account, we highly recommend using an <strong>Incognito / Private Window</strong>.
            Otherwise, your browser may automatically link your personal account instead.
          </p>

          {/* Guide Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "#F3F4F6", padding: 16, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
              <p style={{ fontSize: 13, color: "var(--dark)", margin: 0 }}>
                Click <strong>"Copy Connection Link"</strong> below to copy the auth URL.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
              <p style={{ fontSize: 13, color: "var(--dark)", margin: 0 }}>
                Open a new <strong>Incognito / Private Window</strong> in this browser.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</span>
              <p style={{ fontSize: 13, color: "var(--dark)", margin: 0 }}>
                Paste the copied URL in the address bar and log in manually with your business account.
              </p>
            </div>
          </div>

          {/* URL Display */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Connection Link:</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                readOnly
                value={guidePlatform?.url || ""}
                style={{ flex: 1, padding: "8px 12px", background: "#F9FAFB", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12.5, color: "var(--muted)" }}
                onClick={(e) => e.target.select()}
              />
              <Btn
                variant={copied ? "success" : "outline"}
                size="sm"
                onClick={async () => {
                  if (guidePlatform?.url) {
                    try {
                      await navigator.clipboard.writeText(guidePlatform.url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (err) {
                      console.error("Failed to copy text:", err);
                      // Fallback
                      const input = document.createElement("input");
                      input.value = guidePlatform.url;
                      document.body.appendChild(input);
                      input.select();
                      document.execCommand("copy");
                      document.body.removeChild(input);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }
                }}
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
              >
                {copied ? "✓ Copied" : "Copy Link"}
              </Btn>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <Btn variant="ghost" size="sm" onClick={() => setGuidePlatform(null)}>
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => {
              if (guidePlatform?.url) {
                window.location.href = guidePlatform.url;
              }
            }}>
              Open Directly (Regular Window)
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ClientSocialOnboardingPage;
