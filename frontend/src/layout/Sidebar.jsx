// Sidebar component
import { useApp } from "../shared/AppContext";
import { ROLE_META, NAV_CONFIG } from "../shared/constants";
import { SvgIcon, Avatar } from "../shared/components";

function Sidebar({ activePage, setPage, mobileOpen, setMobileOpen }) {
  const { session, logout } = useApp();
  const role = session?.role || "employee";
  const sections = NAV_CONFIG[role] || NAV_CONFIG.employee;
  const roleMeta = ROLE_META[role] || {};

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <nav className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            {(session?.companyName || "A").charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="logo-text truncate">{session?.companyName || "AgencyFlow"}</div>
            <div className="logo-sub">CRM Platform</div>
          </div>
        </div>

        {/* Role pill */}
        <div style={{ padding: "10px 16px 4px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 99, padding: "5px 11px",
          }}>
            <SvgIcon name={roleMeta.iconName || "user"} size={13} color="rgba(255,255,255,0.55)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.03em" }}>
              {roleMeta.label}
            </span>
          </div>
        </div>

        {/* Navigation */}
        {sections.map(sec => (
          <div className="sidebar-section" key={sec.label}>
            <div className="sidebar-section-label">{sec.label}</div>
            {sec.items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => { setPage(item.id); setMobileOpen(false); }}
              >
                <span style={{ flexShrink: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: activePage === item.id ? 1 : 0.65 }}>
                  <SvgIcon name={item.iconName || "alert"} size={15} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}

        {/* Footer user card */}
        <div className="sidebar-footer">
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.07)",
            marginBottom: 8, cursor: "default",
          }}>
            <Avatar name={session?.name || "User"} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.name || "User"}
              </div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.email || roleMeta.label}
              </div>
            </div>
          </div>
          <div
            className="nav-item"
            onClick={logout}
            style={{ color: "rgba(220,80,80,0.75)" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(220,80,80,0.75)"}
          >
            <span style={{ flexShrink: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SvgIcon name="logout" size={15} color="currentColor" />
            </span>
            <span>Sign Out</span>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
