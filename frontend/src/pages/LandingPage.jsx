// Landing / Welcome page
import { useState } from "react";
import { SvgIcon } from "../shared/components";
import { ROLE_META } from "../shared/constants";

function WelcomePage({ onStartCompany, onLogin }) {
  const features = [
    { iconName: "checklist", text: "Content task management" },
    { iconName: "check", text: "Client approval workflows" },
    { iconName: "users", text: "Team & workload tracking" },
    { iconName: "barchart", text: "Reports & analytics" },
    { iconName: "bell", text: "Real-time notifications" },
    { iconName: "image", text: "Brand asset library" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -120, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.10) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 80, right: 160, width: 180, height: 180, borderRadius: "50%", border: "1.5px solid rgba(255,106,0,0.12)" }} />
        <div style={{ position: "absolute", bottom: 100, left: 100, width: 120, height: 120, borderRadius: "50%", border: "1.5px solid rgba(255,106,0,0.10)" }} />
        <svg style={{ position: "absolute", top: 200, left: 40, opacity: 0.12 }} width="120" height="120" viewBox="0 0 120 120">{[0, 1, 2, 3, 4].map(r => [0, 1, 2, 3, 4].map(c => <circle key={`${r}${c}`} cx={c * 24 + 12} cy={r * 24 + 12} r="2" fill="#FF6A00" />))}</svg>
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(229,231,235,0.6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>A</div>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, color: "#151515" }}>AgencyFlow CRM</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={onLogin}>Sign In</button>
            <button className="btn btn-primary btn-sm" onClick={onStartCompany}>Get Started</button>
          </div>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 40px" }}>
          <div style={{ textAlign: "center", maxWidth: 640, marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--light-orange)", border: "1px solid rgba(255,106,0,0.2)", borderRadius: 99, padding: "5px 14px", marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>Built for Digital Marketing Agencies</span>
            </div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.12, color: "#151515", marginBottom: 18 }}>
              The operating system<br />
              <span style={{ background: "linear-gradient(135deg,#FF6A00,#E95A00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>for your agency</span>
            </h1>
            <p style={{ fontSize: "clamp(15px,2vw,17px)", color: "var(--muted)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 32px" }}>
              Manage your agency, clients, content, approvals, and team from one place.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {features.map(f => (
                <span key={f.text} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: "#fff", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--dark)", fontWeight: 500 }}>
                  <SvgIcon name={f.iconName} size={13} color="var(--primary)" />
                  {f.text}
                </span>
              ))}
            </div>
          </div>

          {/* Two action cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, width: "100%", maxWidth: 680 }}>

            {/* Start company card */}
            <div
              onClick={onStartCompany}
              style={{ background: "linear-gradient(145deg,#FF6A00,#E95A00)", borderRadius: 20, padding: "36px 32px", cursor: "pointer", position: "relative", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 8px 32px rgba(255,106,0,0.28)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(255,106,0,0.38)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,106,0,0.28)"; }}
            >
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <SvgIcon name="building" size={24} color="rgba(255,255,255,0.95)" />
                </div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 21, color: "#fff", marginBottom: 8 }}>Start a New Company</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, marginBottom: 24 }}>Register your agency workspace and go live in minutes.</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "9px 18px", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                  Create Workspace
                  <SvgIcon name="arrowRight" size={16} color="#fff" />
                </div>
              </div>
            </div>

            {/* Login card */}
            <div
              onClick={onLogin}
              style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", cursor: "pointer", border: "1.5px solid var(--border)", position: "relative", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.10)"; e.currentTarget.style.borderColor = "#FF6A00"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,106,0,0.04)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--light-orange)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <SvgIcon name="logout" size={22} color="var(--primary)" />
                </div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 21, color: "#151515", marginBottom: 8 }}>Login to Existing Company</h2>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, marginBottom: 24 }}>Access your dashboard as Super Admin, Manager, Account Manager, Employee, or Client.</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--light-orange)", border: "1.5px solid rgba(255,106,0,0.3)", borderRadius: 10, padding: "9px 18px", color: "var(--primary)", fontSize: 14, fontWeight: 700 }}>
                  Sign In
                  <SvgIcon name="arrowRight" size={16} color="var(--primary)" />
                </div>
              </div>
            </div>
          </div>

          {/* Social proof row */}
          <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {["8 Clients Managed", "7 Team Members", "50+ Monthly Tasks", "Multi-Role Access"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SvgIcon name="check" size={10} color="#16A34A" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </main>

        <footer style={{ padding: "16px 40px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>AgencyFlow CRM . Built for digital agencies</span>
        </footer>
      </div>
    </div>
  );
}


export default WelcomePage;
