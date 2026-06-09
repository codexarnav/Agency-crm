// Company Registration page
import { useState } from "react";
import { SvgIcon, FormInput, Btn } from "../shared/components";
import { INDUSTRY_OPTIONS, TIMEZONE_OPTIONS, MOCK, LS_KEYS } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { apiSignup, saveToken } from "../shared/api";

function CompanyRegistrationPage({ onSuccess, onBack }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [company, setCompany] = useState({ name: "", address: "", phone: "", email: "", website: "", industry: "", employeeCount: "", logoUrl: "", gst: "", timezone: "Asia/Kolkata (IST +5:30)" });
  const [admin, setAdmin] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const setC = (k, v) => setCompany(p => ({ ...p, [k]: v }));
  const setA = (k, v) => setAdmin(p => ({ ...p, [k]: v }));
  const validateStep1 = () => {
    const e = {};
    if (!company.name.trim()) e.name = "Company name is required";
    if (!company.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(company.email)) e.email = "Enter a valid email";
    if (!company.phone.trim()) e.phone = "Phone number is required";
    if (!company.industry) e.industry = "Select an industry";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateStep2 = () => {
    const e = {};
    if (!admin.name.trim()) e.adminName = "Name is required";
    if (!admin.email.trim()) e.adminEmail = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(admin.email)) e.adminEmail = "Enter a valid email";
    if (!admin.phone.trim()) e.adminPhone = "Phone is required";
    if (!admin.password) e.password = "Password is required";
    else if (admin.password.length < 6) e.password = "Minimum 6 characters";
    if (admin.password !== admin.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await apiSignup({
        companyName: company.name,
        companyEmail: company.email,
        address: company.address,
        phoneNumber: company.phone,
        website: company.website,
        industryType: company.industry,
        employeeCount: company.employeeCount ? parseInt(company.employeeCount) || null : null,
        companyLogo: company.logoUrl || null,
        gstId: company.gst || null,
        timezone: company.timezone,
        adminName: admin.name,
        adminEmail: admin.email,
        adminPhone: admin.phone,
        password: admin.password,
        profilePicture: null,
      });
      // Save JWT
      saveToken(res.token);
      // Seed localStorage with mock data so the rest of the app works
      LSUtils.seedIfEmpty(LS_KEYS.CLIENTS, MOCK.clients);
      LSUtils.seedIfEmpty(LS_KEYS.EMPLOYEES, MOCK.employees);
      LSUtils.seedIfEmpty(LS_KEYS.TASKS, MOCK.tasks);
      LSUtils.seedIfEmpty(LS_KEYS.NOTIFICATIONS, MOCK.notifications);
      LSUtils.seedIfEmpty(LS_KEYS.ANNOUNCEMENTS, MOCK.announcements);
      // Build session from API response
      const session = {
        id: res.user.id,
        name: res.user.username,
        email: res.user.email,
        role: "superadmin",
        companyId: res.company.id,
        companyName: res.company.name,
      };
      LSUtils.setCurrentSession(session);
      onSuccess(session);
    } catch (err) {
      setApiError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };
  const Spinner = () => <span className="spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />;
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "18px 40px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--border)", background: "#fff" }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6 }}>Back</button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: "#fff" }}>A</div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15, color: "#151515" }}>AgencyFlow CRM</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>Step {step} of 2</div>
      </header>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px 60px" }}>
        <div style={{ width: "100%", maxWidth: 580 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 32, alignItems: "center" }}>
            {[1, 2].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, background: step > s ? "var(--success)" : step === s ? "var(--primary)" : "var(--border)", color: step >= s ? "#fff" : "var(--muted)", transition: "all 0.3s" }}>{step > s ? "v" : s}</div>
                  <span style={{ fontSize: 13, fontWeight: step === s ? 700 : 400, color: step === s ? "var(--dark)" : "var(--muted)", whiteSpace: "nowrap" }}>{s === 1 ? "Company Details" : "Super Admin"}</span>
                </div>
                {s < 2 && <div style={{ flex: 1, height: 2, background: step > 1 ? "var(--success)" : "var(--border)", borderRadius: 2, marginLeft: 8 }} />}
              </div>
            ))}
          </div>
          {step === 1 ? (
            <div className="card fade-in" style={{ padding: 32 }}>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Company Details</h2>
              <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Tell us about your agency workspace.</p>
              <div className="grid-2"><FormInput label="Company Name *" value={company.name} onChange={e => setC("name", e.target.value)} placeholder="e.g. Orbit Digital Agency" error={errors.name} /><FormInput label="Company Email *" type="email" value={company.email} onChange={e => setC("email", e.target.value)} placeholder="hello@youragency.com" error={errors.email} /></div>
              <FormInput label="Registered Address" value={company.address} onChange={e => setC("address", e.target.value)} placeholder="123 Business Park, Mumbai" />
              <div className="grid-2"><FormInput label="Contact Number *" value={company.phone} onChange={e => setC("phone", e.target.value)} placeholder="+91 98000 00000" error={errors.phone} /><FormInput label="Website" value={company.website} onChange={e => setC("website", e.target.value)} placeholder="https://youragency.com" /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Industry Type *</label><select className={`form-input ${errors.industry ? "error" : ""}`} value={company.industry} onChange={e => setC("industry", e.target.value)}><option value="">Select industry...</option>{INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}</select>{errors.industry && <p className="form-error">{errors.industry}</p>}</div>
                <div className="form-group"><label className="form-label">Est. Employees</label><select className="form-input" value={company.employeeCount} onChange={e => setC("employeeCount", e.target.value)}><option value="">Select range...</option>{["1-5", "6-10", "11-25", "26-50", "51-100", "100+"].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              </div>
              <div className="grid-2"><FormInput label="Company Logo URL" value={company.logoUrl} onChange={e => setC("logoUrl", e.target.value)} placeholder="https://.../logo.png" hint="Direct image URL" /><FormInput label="GST / Tax ID (Optional)" value={company.gst} onChange={e => setC("gst", e.target.value)} placeholder="22AAAAA0000A1Z5" /></div>
              <div className="form-group"><label className="form-label">Timezone</label><select className="form-input" value={company.timezone} onChange={e => setC("timezone", e.target.value)}>{TIMEZONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button className="btn btn-primary btn-lg" onClick={() => { if (validateStep1()) setStep(2); }} style={{ minWidth: 160, justifyContent: "center" }}>Continue</button></div>
            </div>
          ) : (
            <div className="card fade-in" style={{ padding: 32 }}>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Super Admin Account</h2>
              <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Primary admin for <strong>{company.name}</strong>.</p>
              {apiError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "var(--danger)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><SvgIcon name="alert" size={14} color="var(--danger)" />{apiError}</div>}
              <div className="grid-2"><FormInput label="Full Name *" value={admin.name} onChange={e => setA("name", e.target.value)} placeholder="Your full name" error={errors.adminName} /><FormInput label="Email Address *" type="email" value={admin.email} onChange={e => setA("email", e.target.value)} placeholder="admin@youragency.com" error={errors.adminEmail} /></div>
              <FormInput label="Phone Number *" value={admin.phone} onChange={e => setA("phone", e.target.value)} placeholder="+91 98000 00000" error={errors.adminPhone} />
              <div className="grid-2"><FormInput label="Create Password *" type="password" value={admin.password} onChange={e => setA("password", e.target.value)} placeholder="Min. 6 characters" error={errors.password} /><FormInput label="Confirm Password *" type="password" value={admin.confirmPassword} onChange={e => setA("confirmPassword", e.target.value)} placeholder="Re-enter password" error={errors.confirmPassword} /></div>
              <div style={{ background: "var(--light-orange)", border: "1px solid rgba(255,106,0,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10 }}>
                <div style={{ flexShrink: 0, width: 20, height: 20, marginTop: 1 }}><SvgIcon name="shield" size={18} color="var(--primary)" /></div>
                <div><p style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)", marginBottom: 2 }}>Super Admin Privileges</p><p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Full access to manage clients, team, tasks, approvals, reports, and all workspace settings.</p></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 12 }}><button className="btn btn-outline" onClick={() => { setStep(1); setErrors({}); }}>Back</button><button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{ minWidth: 200, justifyContent: "center" }}>{loading ? <><Spinner /> Creating workspace...</> : "Create Workspace"}</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default CompanyRegistrationPage;
