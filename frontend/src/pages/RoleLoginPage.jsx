// Role-based Login page
import { useState } from "react";
import { SvgIcon, FormInput, Btn } from "../shared/components";
import { ROLE_META, SAMPLE_CREDENTIALS, LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { apiLogin, saveToken } from "../shared/api";

function RoleLoginPage({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreds, setShowCreds] = useState(false);

  // Map backend role keys to frontend Role enum values
  const backendToFrontendRole = {
    SUPER_ADMIN: "superadmin",
    MANAGER: "manager",
    EMPLOYEE: "employee",
    CLIENT: "client",
  };

  const autofill = (cred) => { setUsername(cred.username); setPassword(cred.password); setError(""); };

  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password.trim()) { setError("Please enter your username and password."); return; }
    setLoading(true);

    try {
      const res = await apiLogin({
        identifier: username.trim(),
        password,
      });
      // Real API login succeeded
      saveToken(res.token);
      LSUtils.seedIfEmpty(LS_KEYS.CLIENTS, MOCK.clients);
      LSUtils.seedIfEmpty(LS_KEYS.EMPLOYEES, MOCK.employees);
      LSUtils.seedIfEmpty(LS_KEYS.TASKS, MOCK.tasks);
      LSUtils.seedIfEmpty(LS_KEYS.NOTIFICATIONS, MOCK.notifications);
      LSUtils.seedIfEmpty(LS_KEYS.ANNOUNCEMENTS, MOCK.announcements);
      const user = res.user;
      const resolvedRole = backendToFrontendRole[user.role] || user.role?.toLowerCase() || "employee";
      const session = {
        id: user.id,
        name: user.username,
        email: user.email,
        role: resolvedRole,
        companyId: user.companyId,
        companyName: "Your Agency",
        displayRole: ROLE_META[resolvedRole]?.label || resolvedRole,
        profilePicture: user.profilePicture || "",
        mustChangePassword: user.mustChangePassword,
      };
      LSUtils.setCurrentSession(session);
      onLogin(session);
      return;
    } catch {
      // API login failed — fall through to demo credentials check
    }

    // Demo / mock credential fallback
    setTimeout(() => {
      const match = SAMPLE_CREDENTIALS.find(c => c.username === username.trim() && c.password === password);
      const lsUsers = LSUtils.getData(LS_KEYS.USERS) || [];
      const lsMatch = lsUsers.find(u => (u.email === username.trim() || u.username === username.trim()) && u.passwordHash === password);
      if (match) {
        const session = { id: match.userId, name: match.name, email: match.username + "@agency.com", role: match.role, companyId: match.companyId, companyName: "Orbit Agency", displayRole: match.displayRole, profilePicture: match.profilePicture || "" };
        LSUtils.setCurrentSession(session);
        LSUtils.seedIfEmpty(LS_KEYS.CLIENTS, MOCK.clients);
        LSUtils.seedIfEmpty(LS_KEYS.EMPLOYEES, MOCK.employees);
        LSUtils.seedIfEmpty(LS_KEYS.TASKS, MOCK.tasks);
        LSUtils.seedIfEmpty(LS_KEYS.NOTIFICATIONS, MOCK.notifications);
        LSUtils.seedIfEmpty(LS_KEYS.ANNOUNCEMENTS, MOCK.announcements);
        onLogin(session);
      } else if (lsMatch) {
        const companies = LSUtils.getData(LS_KEYS.COMPANIES) || [];
        const company = companies.find(c => c.id === lsMatch.companyId);
        const session = { id: lsMatch.id, name: lsMatch.name, email: lsMatch.email, role: lsMatch.role, companyId: lsMatch.companyId, companyName: company?.name || "Your Agency", profilePicture: lsMatch.profilePicture || "" };
        LSUtils.setCurrentSession(session); onLogin(session);
      } else { setError("Incorrect username or password."); setLoading(false); }
    }, 900);
  };

  const Spinner = () => <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />;
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: -120, right: -120, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
      <header style={{ padding: "18px 40px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--border)", background: "#fff", position: "relative", zIndex: 1 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6 }}>Back to Home</button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: "#fff" }}>A</div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15, color: "#151515" }}>AgencyFlow CRM</span>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px 60px", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 500 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <SvgIcon name="lock" size={24} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 26, color: "#151515", marginBottom: 6 }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>Sign in to your AgencyFlow workspace</p>
          </div>
          <div className="card" style={{ padding: 28, textAlign: "left" }}>
            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "var(--danger)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <SvgIcon name="alert" size={14} color="var(--danger)" />{error}
            </div>}
            <FormInput label="Username or Email" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username or email" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <FormInput label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <button className="btn btn-primary" onClick={handleLogin} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px 22px", fontSize: 15, borderRadius: 10, marginTop: 4 }}>{loading ? <><Spinner /> Signing in...</> : "Sign In"}</button>
            <div style={{ marginTop: 20 }}>
              <button onClick={() => setShowCreds(p => !p)} style={{ width: "100%", padding: "9px 14px", background: "var(--light-orange)", border: "1px solid rgba(255,106,0,0.2)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "var(--deep)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}><SvgIcon name="user" size={14} color="var(--deep)" />Demo Credentials  -  Quick Access</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showCreds ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {showCreds && (
                <div className="fade-in" style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                  {SAMPLE_CREDENTIALS.map((cred, i) => {
                    const m = ROLE_META[cred.role]; return (
                      <button key={cred.username} onClick={() => autofill(cred)} style={{ width: "100%", padding: "10px 14px", background: "#fff", border: "none", borderBottom: i < SAMPLE_CREDENTIALS.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }} onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SvgIcon name={m.iconName || "user"} size={16} color={m.color} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)" }}>{m.label}  -  {cred.name}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{cred.username} / {cred.password}</div></div>
                        <span style={{ fontSize: 11.5, color: "var(--primary)", fontWeight: 600, flexShrink: 0 }}>Fill</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleLoginPage;
