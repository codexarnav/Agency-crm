// Reusable UI components extracted from AgencyCRM.jsx
import { useState, useEffect } from "react";
import { useApp } from "./AppContext";
import { ROLE_META, LS_KEYS, MOCK } from "./constants";
import { LSUtils } from "./utils";

// SvgIcon
const SvgIcon = ({ name, size = 16, color = "currentColor" }) => {
  const paths = {
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
    pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
    building: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    handshake: <><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l1.06 1.06L12 21.23l7.36-7.94 1.06-1.06a5.4 5.4 0 0 0 0-7.65z" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    repeat: <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
    checklist: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    barchart: <><path d="M18 20V10M12 20V4M6 20v-6" /></>,
    gift: <><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
    megaphone: <><path d="M3 11l19-9-9 19-2-8-8-2z" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
    send: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
    kanban: <><rect x="3" y="3" width="5" height="18" /><rect x="10" y="3" width="5" height="11" /><rect x="17" y="3" width="5" height="15" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    palette: <><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    video: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.alert}
    </svg>
  );
};

// Btn
// Button
function Btn({ variant = "primary", size = "", icon, children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// StatusBadge
function StatusBadge({ status }) {
  const map = {
    active: { cls: "badge-success", dot: "dot-success", label: "Active" },
    inactive: { cls: "badge-muted", dot: "dot-muted", label: "Inactive" },
    paused: { cls: "badge-warning", dot: "dot-warning", label: "Paused" },
    pending: { cls: "badge-warning", dot: "dot-warning", label: "Pending" },
    in_progress: { cls: "badge-info", dot: "dot-primary", label: "In Progress" },
    production: { cls: "badge-info", dot: "dot-primary", label: "Production" },
    review: { cls: "badge-purple", dot: "", label: "In Review" },
    approved: { cls: "badge-success", dot: "dot-success", label: "Approved" },
    rejected: { cls: "badge-danger", dot: "dot-danger", label: "Rejected" },
    published: { cls: "badge-success", dot: "dot-success", label: "Published" },
    scheduled: { cls: "badge-info", dot: "dot-primary", label: "Scheduled" },
    revision_requested: { cls: "badge-warning", dot: "dot-warning", label: "Revision Needed" },
    under_review: { cls: "badge-purple", dot: "", label: "Under Review" },
    not_required: { cls: "badge-muted", dot: "dot-muted", label: "N/A" },
    high: { cls: "badge-danger", dot: "dot-danger", label: "High" },
    medium: { cls: "badge-warning", dot: "dot-warning", label: "Medium" },
    low: { cls: "badge-muted", dot: "dot-muted", label: "Low" },
    completed: { cls: "badge-success", dot: "dot-success", label: "Completed" },
    
    // Publishing Statuses
    DRAFT: { cls: "badge-muted", dot: "dot-muted", label: "Draft" },
    SCHEDULED: { cls: "badge-info", dot: "dot-primary", label: "Scheduled" },
    POSTING: { cls: "badge-purple", dot: "", label: "Posting" },
    POSTED: { cls: "badge-success", dot: "dot-success", label: "Posted" },
    FAILED: { cls: "badge-danger", dot: "dot-danger", label: "Failed" },
    CANCELLED: { cls: "badge-danger", dot: "dot-danger", label: "Cancelled" },
    NOT_SCHEDULED: { cls: "badge-muted", dot: "dot-muted", label: "Not Scheduled" },
    FAILED_TO_POST: { cls: "badge-danger", dot: "dot-danger", label: "Failed" },
    RESCHEDULED: { cls: "badge-info", dot: "dot-primary", label: "Rescheduled" },
    
    draft: { cls: "badge-muted", dot: "dot-muted", label: "Draft" },
    posting: { cls: "badge-purple", dot: "", label: "Posting" },
    posted: { cls: "badge-success", dot: "dot-success", label: "Posted" },
    failed: { cls: "badge-danger", dot: "dot-danger", label: "Failed" },
    cancelled: { cls: "badge-danger", dot: "dot-danger", label: "Cancelled" },
    not_scheduled: { cls: "badge-muted", dot: "dot-muted", label: "Not Scheduled" },
    failed_to_post: { cls: "badge-danger", dot: "dot-danger", label: "Failed" },
    rescheduled: { cls: "badge-info", dot: "dot-primary", label: "Rescheduled" },
  };
  const info = map[status] || { cls: "badge-muted", dot: "dot-muted", label: status };
  return (
    <span className={`badge ${info.cls}`}>
      {info.dot && <span className={`dot ${info.dot}`} style={{ width: 6, height: 6 }} />}
      {info.label}
    </span>
  );
}

// Avatar
function Avatar({ name, src, size = "md", color = "#FF6A00", className = "" }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const safeName = name || "";
  const initials = safeName.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
  const colors = ["#FF6A00", "#7C3AED", "#16A34A", "#0EA5E9", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16"];
  const charCode = safeName.charCodeAt(0);
  const bg = isNaN(charCode) ? color : (colors[charCode % colors.length] || color);

  if (src && src.trim() && !imgError) {
    return (
      <img
        src={src}
        alt={safeName}
        className={`avatar avatar-${size} ${className}`}
        style={{ objectFit: "cover", borderRadius: "50%", display: "block" }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`avatar avatar-${size} ${className}`} style={{ background: bg + "22", color: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {initials || "?"}
    </div>
  );
}

// ProgressBar
function ProgressBar({ value, max = 100, color = "var(--primary)", height = 6, showLabel = false }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct >= 80 ? "var(--danger)" : pct >= 60 ? "var(--warning)" : color;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="progress-bar-wrap" style={{ flex: 1, height }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor, height }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 32 }}>{pct}%</span>}
    </div>
  );
}

// FormInput
function FormInput({ label, hint, error, type = "text", ...props }) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPass ? "text" : "password") : type;

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {type === "textarea" ? (
        <textarea className={`form-input ${error ? "error" : ""}`} rows={3} {...props} />
      ) : type === "select" ? (
        <select className={`form-input ${error ? "error" : ""}`} {...props} />
      ) : (
        <div style={{ position: "relative" }}>
          <input type={actualType} className={`form-input ${error ? "error" : ""}`} style={isPassword ? { paddingRight: 40 } : {}} {...props} />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4
              }}
            >
              {showPass ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// SearchBar
function SearchBar({ value, onChange, placeholder = "Search...", style = {} }) {
  return (
    <div className="search-bar" style={style}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button onClick={() => onChange("")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "flex" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}

// FilterBar
function FilterBar({ filters, active, onChange }) {
  return (
    <div className="filter-bar">
      {filters.map(f => (
        <button key={f.value} className={`filter-chip ${active === f.value ? "active" : ""}`} onClick={() => onChange(f.value)}>
          {f.label}
          {f.count !== undefined && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>{f.count}</span>}
        </button>
      ))}
    </div>
  );
}

// EmptyState
function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon || <SvgIcon name="alert" size={28} color="var(--primary)" />}
      </div>
      <p className="empty-title">{title}</p>
      <p className="empty-desc">{desc}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

// Modal
function Modal({ open, onClose, title, children, footer, size = "" }) {
  if (!open) return null;
  const sizeClass = size === "lg" ? "modal-lg" : size === "fullscreen" ? "modal-fullscreen" : "";
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${sizeClass}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Toast
function Toast({ toasts, remove }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || ""}`} style={{ cursor: "pointer" }} onClick={() => remove(t.id)}>
          <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            {t.type === "success" ? <SvgIcon name="check" size={14} color="#fff" /> :
              t.type === "danger" ? <SvgIcon name="alert" size={14} color="#fff" /> :
                t.type === "warning" ? <SvgIcon name="alert" size={14} color="#151515" /> :
                  <SvgIcon name="alert" size={14} color="#fff" />}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </div>
      ))}
    </div>
  );
}

// DataTable
function DataTable({ columns, data, onRowClick, emptyState }) {
  if (!data || data.length === 0) return emptyState || <EmptyState icon={<SvgIcon name="checklist" size={28} color="var(--primary)" />} title="No data found" desc="Nothing to show here yet." />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={c.width ? { width: c.width } : {}} className={c.hideOnMobile ? "hide-mobile" : ""}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick && onRowClick(row)} style={onRowClick ? { cursor: "pointer" } : {}}>
              {columns.map(c => (
                <td key={c.key} className={c.hideOnMobile ? "hide-mobile" : ""}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// AnimStatCard
function AnimStatCard({ label, value, sub, iconName, iconBg, iconColor, trend, delay = 0 }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const num = parseInt(value) || 0;
    if (num === 0) { setDisplayed(0); return; }
    const step = Math.ceil(num / 20);
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, num);
      setDisplayed(cur);
      if (cur >= num) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p className="stat-label">{label}</p>
        {iconName && (
          <div className="stat-icon" style={{ background: iconBg || "var(--light-orange)", color: iconColor || "var(--primary)" }}>
            <SvgIcon name={iconName} size={18} color={iconColor || "var(--primary)"} />
          </div>
        )}
      </div>
      <p className="stat-value stat-value-anim" style={{ animationDelay: `${delay}ms` }}>
        {typeof value === "string" && !parseInt(value) ? value : displayed}
      </p>
      {sub && (
        <p className="stat-sub">
          {trend === "up" && <span style={{ color: "var(--success)", fontWeight: 700 }}>^</span>}
          {trend === "down" && <span style={{ color: "var(--danger)", fontWeight: 700 }}>v</span>}
          {sub}
        </p>
      )}
    </div>
  );
}

// RoleBanner
function RoleBanner({ session }) {
  const role = session?.role || "employee";
  const meta = ROLE_META[role] || {};
  const greetings = {
    superadmin: "You have full control of the workspace.",
    manager: "Monitor team performance and content flow.",
    accountmanager: "Your clients are counting on you today.",
    employee: "Here's what needs your attention today.",
    client: "Review your content and share your feedback.",
  };
  const gradients = {
    superadmin: "linear-gradient(135deg, #1E1B4B, #312E81)",
    manager: "linear-gradient(135deg, #E95A00, #FF6A00)",
    accountmanager: "linear-gradient(135deg, #065F46, #047857)",
    employee: "linear-gradient(135deg, #1D4ED8, #2563EB)",
    client: "linear-gradient(135deg, #5B21B6, #7C3AED)",
  };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="role-banner" style={{ background: gradients[role] || gradients.employee }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <SvgIcon name={meta.iconName || "user"} size={22} color="rgba(255,255,255,0.9)" />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "clamp(15px,2.5vw,19px)", color: "#fff", marginBottom: 3 }}>
          {greeting}, {session?.name?.split(" ")[0] || "there"}
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{greetings[role]}</p>
      </div>
      <div style={{ marginLeft: "auto", position: "relative", zIndex: 1, textAlign: "right" }} className="hide-mobile">
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(255,255,255,0.15)" }}>
          <SvgIcon name={meta.iconName || "user"} size={12} color="rgba(255,255,255,0.85)" />
          {meta.label}
        </span>
      </div>
    </div>
  );
}

// AnnouncementBanner
function AnnouncementBanner({ announcements }) {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  if (!announcements || announcements.length === 0) return null;
  const a = announcements[idx];
  if (!vis) return null;

  return (
    <div style={{ background: "var(--light-orange)", border: "1.5px solid rgba(255,106,0,0.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,106,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <SvgIcon name="megaphone" size={16} color="var(--deep)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--deep)" }}>{a.title}</span>
          <StatusBadge status={a.priority} />
        </div>
        <p style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>{a.body}</p>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
        {announcements.length > 1 && (
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIdx(i => (i - 1 + announcements.length) % announcements.length)} style={{ width: 24, height: 24, color: "var(--muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{idx + 1}/{announcements.length}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIdx(i => (i + 1) % announcements.length)} style={{ width: 24, height: 24, color: "var(--muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setVis(false)} style={{ width: 24, height: 24, color: "var(--muted)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

// ActivityFeed
function ActivityFeed({ logs }) {
  const actionMeta = {
    task_created: { iconName: "checklist", color: "var(--primary)", label: "Task created" },
    status_updated: { iconName: "repeat", color: "#0EA5E9", label: "Status updated" },
    feedback_added: { iconName: "chat", color: "var(--success)", label: "Feedback added" },
    company_registered: { iconName: "building", color: "var(--purple)", label: "Workspace created" },
    login: { iconName: "user", color: "var(--warning)", label: "User logged in" },
  };
  if (!logs || logs.length === 0) return <EmptyState icon={<SvgIcon name="clock" size={28} color="var(--primary)" />} title="No activity yet" desc="Actions and events will appear here." />;
  return (
    <div>
      {logs.slice(0, 8).map((log, i) => {
        const m = actionMeta[log.action] || { iconName: "alert", color: "var(--muted)", label: log.action };
        return (
          <div key={log.id || i} className="activity-item">
            <div className="activity-dot-wrap">
              <div className="activity-dot" style={{ background: m.color }} />
              {i < logs.slice(0, 8).length - 1 && <div className="activity-line" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <SvgIcon name={m.iconName} size={13} color={m.color} />
                <span>{m.label}</span>
                {log.details?.taskTitle && <span style={{ color: "var(--muted)", fontWeight: 400 }}> -  {log.details.taskTitle}</span>}
                {log.details?.companyName && <span style={{ color: "var(--muted)", fontWeight: 400 }}> -  {log.details.companyName}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {new Date(log.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// PendingApprovals
function PendingApprovals({ tasks, limit = 4 }) {
  const pending = tasks.filter(t => t.approvalStatus === "pending").slice(0, limit);
  if (pending.length === 0) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><SvgIcon name="check" size={24} color="var(--success)" /></div>
      All caught up  -  no pending approvals.
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {pending.map(t => (
        <div key={t.id} className="approval-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }} className="truncate">{t.contentDescription}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{t.clientName} . {t.platform} . {t.contentType}</div>
            </div>
            <StatusBadge status={t.priority} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Avatar name={t.assignedTo} size="sm" />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t.assignedTo}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-success btn-sm" style={{ padding: "3px 10px", fontSize: 11.5 }}>Approve</button>
              <button className="btn btn-outline btn-sm" style={{ padding: "3px 10px", fontSize: 11.5 }}>Review</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// UpcomingDeadlines
function UpcomingDeadlines({ tasks, limit = 5 }) {
  const upcoming = tasks
    .filter(t => t.internalDeadline && t.productionStatus !== "approved")
    .sort((a, b) => new Date(a.internalDeadline) - new Date(b.internalDeadline))
    .slice(0, limit);
  if (upcoming.length === 0) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><SvgIcon name="calendar" size={24} color="var(--muted)" /></div>
      No upcoming deadlines.
    </div>
  );
  return (
    <div>
      {upcoming.map(t => {
        const dDate = new Date(t.internalDeadline);
        const diff = Math.ceil((dDate - new Date()) / (1000 * 60 * 60 * 24));
        const isOverdue = diff < 0;
        const isUrgent = diff >= 0 && diff <= 2;
        const badgeBg = isOverdue ? "#FEE2E2" : isUrgent ? "#FEF9C3" : "#F0FDF4";
        const badgeColor = isOverdue ? "#B91C1C" : isUrgent ? "#854D0E" : "#166534";
        return (
          <div key={t.id} className="deadline-item">
            <div className="deadline-day-badge" style={{ background: badgeBg }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: badgeColor, lineHeight: 1 }}>{dDate.getDate()}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: badgeColor }}>{dDate.toLocaleString("default", { month: "short" }).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{t.contentDescription}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{t.clientName} . {t.platform}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: badgeBg, color: badgeColor }}>
                {isOverdue ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Today" : `${diff}d left`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// QuickActions
function QuickActions({ role, setPage }) {
  const actions = {
    superadmin: [
      { iconName: "checklist", label: "New Task", page: "tasks", color: "#1D4ED8" },
      { iconName: "users", label: "Add User", page: "users", color: "#059669" },
      { iconName: "handshake", label: "New Client", page: "clients", color: "#FF6A00" },
      { iconName: "megaphone", label: "Announce", page: "announcements", color: "#7C3AED" },
    ],
    manager: [
      { iconName: "checklist", label: "New Task", page: "tasks", color: "#1D4ED8" },
      { iconName: "check", label: "Approvals", page: "approvals", color: "#16A34A" },
      { iconName: "barchart", label: "Workload", page: "workload", color: "#F59E0B" },
      { iconName: "barchart", label: "Reports", page: "reports", color: "#E95A00" },
    ],
    accountmanager: [
      { iconName: "check", label: "Approvals", page: "approvals", color: "#16A34A" },
      { iconName: "chat", label: "Feedback", page: "feedback", color: "#0EA5E9" },
      { iconName: "calendar", label: "Planner", page: "planner", color: "#FF6A00" },
      { iconName: "send", label: "Publishing", page: "publishing", color: "#7C3AED" },
    ],
    employee: [
      { iconName: "checklist", label: "My Tasks", page: "tasks", color: "#1D4ED8" },
      { iconName: "kanban", label: "Kanban", page: "kanban", color: "#F59E0B" },
      { iconName: "clock", label: "Deadlines", page: "deadlines", color: "#DC2626" },
      { iconName: "bell", label: "Notifs", page: "notifications", color: "#E95A00" },
    ],
    client: [
      { iconName: "check", label: "Approve", page: "approvals", color: "#16A34A" },
      { iconName: "chat", label: "Feedback", page: "feedback", color: "#0EA5E9" },
      { iconName: "calendar", label: "Calendar", page: "calendar", color: "#FF6A00" },
      { iconName: "image", label: "Assets", page: "assets", color: "#7C3AED" },
    ],
  };
  const items = actions[role] || actions.employee;
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
      {items.map(a => (
        <button key={a.label} className="quick-action" onClick={() => setPage(a.page)}>
          <span className="qa-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: a.color + "14" }}>
            <SvgIcon name={a.iconName} size={18} color={a.color} />
          </span>
          <span className="qa-label">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

// InfoRow
function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "1px solid #F9FAFB" }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--dark)", fontWeight: 500 }}>{value || " - "}</span>
    </div>
  );
}


// ImageUploadDropdown
function ImageUploadDropdown({ value, onChange, name, placeholder = "User", label = "Profile Picture", showToast }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [urlVal, setUrlVal] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const handler = () => setDropdownOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const triggerUpload = (e) => {
    e.stopPropagation();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        if (showToast) showToast("Only image files are allowed", "danger");
        else alert("Only image files are allowed");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      setUploading(true);
      try {
        const token = localStorage.getItem("crm_auth_token") || LSUtils.getData(LS_KEYS.SESSION)?.token;
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
        onChange(data.url);
        if (showToast) showToast("Image uploaded successfully!", "success");
      } catch (err) {
        if (showToast) showToast(err.message || "Upload failed", "danger");
        else alert(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (urlVal.trim()) {
      onChange(urlVal.trim());
      setUrlVal("");
      setUrlInputOpen(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, padding: 12, background: "#F9FAFB", borderRadius: 8, border: "1px solid var(--border)", width: "100%" }}>
      <Avatar name={name || placeholder} src={value} size="md" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, position: "relative" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)" }}>{label}</span>
        <div style={{ display: "flex", gap: 8, position: "relative" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px" }}
            >
              <SvgIcon name="image" size={13} />
              {uploading ? "Uploading..." : "Change Image"}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {dropdownOpen && (
              <div 
                className="user-dropdown-menu" 
                style={{ 
                  top: "100%", 
                  left: 0, 
                  marginTop: 6, 
                  boxShadow: "var(--shadow-lg)", 
                  border: "1px solid var(--border)", 
                  borderRadius: 8, 
                  background: "#fff", 
                  minWidth: 160,
                  zIndex: 350
                }}
              >
                <button type="button" className="dropdown-item" onClick={triggerUpload} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📷</span> Upload Photo...
                </button>
                <button 
                  type="button" 
                  className="dropdown-item" 
                  onClick={(e) => { e.stopPropagation(); setUrlInputOpen(true); setDropdownOpen(false); }}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span>🔗</span> Use Image Link...
                </button>
                {value && (
                  <button type="button" className="dropdown-item danger" onClick={() => onChange("")} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>❌</span> Remove Image
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {urlInputOpen && (
          <div style={{ display: "flex", gap: 6, marginTop: 6, width: "100%", maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <input
              type="text"
              className="form-input"
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{ fontSize: 12, padding: "5px 8px", flex: 1 }}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleUrlSubmit} style={{ padding: "4px 10px" }}>Add</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setUrlInputOpen(false)} style={{ padding: "4px 10px" }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

export {
  SvgIcon, Btn, StatusBadge, Avatar, ProgressBar, FormInput, SearchBar,
  FilterBar, EmptyState, Modal, Toast, DataTable, AnimStatCard,
  RoleBanner, AnnouncementBanner, ActivityFeed, PendingApprovals,
  UpcomingDeadlines, QuickActions, InfoRow, ImageUploadDropdown,
};
