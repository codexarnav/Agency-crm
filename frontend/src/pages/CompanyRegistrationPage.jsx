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
  const [showPassword, setShowPassword] = useState(false);
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
        profilePicture: res.user.profilePicture || "",
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
    <div className="onboarding-split-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .onboarding-split-container {
          display: grid;
          grid-template-columns: 1fr;
          min-height: 100vh;
          width: 100%;
          background: #FAFAFA;
        }

        @media (min-width: 1024px) {
          .onboarding-split-container {
            grid-template-columns: 1fr 1fr;
          }
        }

        .onboarding-hero-col {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          background: linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%);
          border-right: 1px solid var(--border);
          box-sizing: border-box;
          position: relative;
        }

        @media (min-width: 1024px) {
          .onboarding-hero-col {
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
          }
        }

        @media (max-width: 1023px) {
          .onboarding-hero-col {
            padding: 32px 24px;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }
        }

        .onboarding-form-col {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          background: #FAFAFA;
          box-sizing: border-box;
        }

        @media (max-width: 1023px) {
          .onboarding-form-col {
            padding: 32px 16px;
          }
        }

        .premium-form-card {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01);
          border: 1px solid var(--border);
          padding: 40px;
          box-sizing: border-box;
          text-align: left;
        }

        @media (max-width: 480px) {
          .premium-form-card {
            padding: 24px 20px;
            border-radius: 16px;
          }
        }

        .illustration-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          height: 300px;
          margin: 32px auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .dashboard-base {
          width: 100%;
          height: 85%;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 10;
          position: relative;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          padding-bottom: 10px;
        }

        .dashboard-header-dots {
          display: flex;
          gap: 6px;
        }

        .dashboard-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .floating-card-1 {
          position: absolute;
          top: -10px;
          right: -15px;
          width: 170px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          padding: 12px;
          z-index: 20;
          animation: float-1 6s ease-in-out infinite;
          box-sizing: border-box;
        }

        .floating-card-2 {
          position: absolute;
          bottom: -10px;
          left: -15px;
          width: 160px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          padding: 12px;
          z-index: 20;
          animation: float-2 7s ease-in-out infinite;
          box-sizing: border-box;
        }

        .floating-card-3 {
          position: absolute;
          bottom: 25px;
          right: -25px;
          width: 140px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
          padding: 12px;
          z-index: 20;
          animation: float-3 8s ease-in-out infinite;
          box-sizing: border-box;
        }

        @keyframes float-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes float-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(6px); }
        }

        @keyframes float-3 {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.02); }
        }

        .progress-container {
          margin-top: auto;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          padding-top: 24px;
        }

        .progress-steps-list {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .progress-step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .progress-dot-active {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          box-shadow: 0 0 0 4px rgba(255, 106, 0, 0.12);
        }

        .progress-dot-completed {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--success);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 8px;
          font-weight: 700;
        }

        .progress-dot-upcoming {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          background: transparent;
          display: inline-block;
          box-sizing: border-box;
        }
      ` }} />

      {/* Left Hero Column */}
      <div className="onboarding-hero-col">
        {/* Upper Branding and Back Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", zIndex: 30 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", padding: "6px 12px", borderRadius: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)", background: "rgba(255,106,0,0.1)", padding: "4px 8px", borderRadius: 6, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>AGENCY OPERATING SYSTEM</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifySpace: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 11, color: "#fff" }}>A</div>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "#151515" }}>AgencyFlow CRM</span>
            </div>
          </div>
        </div>

        {/* Main Content & Illustration */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", margin: "40px 0" }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "clamp(24px, 4.5vw, 36px)", lineHeight: 1.2, color: "#151515", marginBottom: 16 }}>
            Build your agency workspace.
          </h1>
          <p style={{ fontSize: "clamp(13.5px, 1.8vw, 15px)", color: "#555", lineHeight: 1.6, maxWidth: 440, marginBottom: 16 }}>
            Set up your workspace in a few simple steps and start managing clients, campaigns, deliverables, and your team—all from one place.
          </p>

          {/* Premium SaaS Illustration */}
          <div className="illustration-container">
            <div className="dashboard-base">
              <div className="dashboard-header">
                <div className="dashboard-header-dots">
                  <span className="dashboard-dot" style={{ background: '#FF5F56' }} />
                  <span className="dashboard-dot" style={{ background: '#FFBD2E' }} />
                  <span className="dashboard-dot" style={{ background: '#27C93F' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.02em" }}>workspace_dashboard</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600 }}>
                    <span style={{ color: "var(--dark)" }}>Q3 Campaign Launch</span>
                    <span style={{ color: "var(--primary)" }}>80%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(0,0,0,0.05)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: "80%", height: "100%", background: "var(--primary)", borderRadius: 3 }} />
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600 }}>
                    <span style={{ color: "var(--dark)" }}>SaaS Brand Strategy</span>
                    <span style={{ color: "var(--primary)" }}>45%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(0,0,0,0.05)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: "45%", height: "100%", background: "var(--primary)", borderRadius: 3 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                <div style={{ background: "rgba(255,255,255,0.5)", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.03)" }}>
                  <span style={{ display: "block", fontSize: 8, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Active Clients</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--dark)" }}>12</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.5)", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.03)" }}>
                  <span style={{ display: "block", fontSize: 8, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Tasks Done</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--success)" }}>94%</span>
                </div>
              </div>
            </div>

            {/* Floating Card 1: Kickoff event */}
            <div className="floating-card-1">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,106,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                  📅
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--dark)" }}>Client Kickoff</span>
                  <span style={{ display: "block", fontSize: 8, color: "var(--muted)" }}>Today at 3 PM</span>
                </div>
              </div>
            </div>

            {/* Floating Card 2: Task Checklist */}
            <div className="floating-card-2">
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>Task Checklist</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--muted)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  <span style={{ textDecoration: "line-through" }}>Wireframe review</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--dark)", fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
                  <span>Design Feedback</span>
                </div>
              </div>
            </div>

            {/* Floating Card 3: Stats sparkline */}
            <div className="floating-card-3">
              <span style={{ display: "block", fontSize: 8, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Monthly Growth</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--dark)", display: "block", marginTop: 2 }}>+24.5%</span>
            </div>
          </div>
        </div>

        {/* Progress Tracker (bottom) */}
        <div className="progress-container">
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "block", marginBottom: 12 }}>Setup Progress</span>
          <div className="progress-steps-list">
            <div className="progress-step-item">
              {step > 1 ? (
                <span className="progress-dot-completed">✓</span>
              ) : (
                <span className="progress-dot-active">●</span>
              )}
              <span style={{ fontWeight: step >= 1 ? 700 : 500, color: step >= 1 ? "var(--dark)" : "var(--muted)" }}>Company Details</span>
            </div>

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", opacity: 0.5 }}><polyline points="9 18 15 12 9 6"></polyline></svg>

            <div className="progress-step-item">
              {step > 2 ? (
                <span className="progress-dot-completed">✓</span>
              ) : step === 2 ? (
                <span className="progress-dot-active">●</span>
              ) : (
                <span className="progress-dot-upcoming" />
              )}
              <span style={{ fontWeight: step >= 2 ? 700 : 500, color: step >= 2 ? "var(--dark)" : "var(--muted)" }}>Super Admin</span>
            </div>

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", opacity: 0.5 }}><polyline points="9 18 15 12 9 6"></polyline></svg>

            <div className="progress-step-item">
              <span className="progress-dot-upcoming" />
              <span style={{ fontWeight: 500, color: "var(--muted)" }}>Invite Team</span>
            </div>

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", opacity: 0.5 }}><polyline points="9 18 15 12 9 6"></polyline></svg>

            <div className="progress-step-item">
              <span className="progress-dot-upcoming" />
              <span style={{ fontWeight: 500, color: "var(--muted)" }}>Ready to Launch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column (Form Column) */}
      <div className="onboarding-form-col">
        {step === 1 ? (
          <div className="premium-form-card fade-in">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Company Details</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Tell us about your agency workspace.</p>
            <div className="grid-2">
              <FormInput label="Company Name *" value={company.name} onChange={e => setC("name", e.target.value)} placeholder="e.g. Orbit Digital Agency" error={errors.name} />
              <FormInput label="Company Email *" type="email" value={company.email} onChange={e => setC("email", e.target.value)} placeholder="hello@youragency.com" error={errors.email} />
            </div>
            <FormInput label="Registered Address" value={company.address} onChange={e => setC("address", e.target.value)} placeholder="123 Business Park, Mumbai" />
            <div className="grid-2">
              <FormInput label="Contact Number *" value={company.phone} onChange={e => setC("phone", e.target.value)} placeholder="+91 98000 00000" error={errors.phone} />
              <FormInput label="Website" value={company.website} onChange={e => setC("website", e.target.value)} placeholder="https://youragency.com" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Industry Type *</label>
                <select className={`form-input ${errors.industry ? "error" : ""}`} value={company.industry} onChange={e => setC("industry", e.target.value)}>
                  <option value="">Select industry...</option>
                  {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                {errors.industry && <p className="form-error">{errors.industry}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Est. Employees</label>
                <select className="form-input" value={company.employeeCount} onChange={e => setC("employeeCount", e.target.value)}>
                  <option value="">Select range...</option>
                  {["1-5", "6-10", "11-25", "26-50", "51-100", "100+"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <FormInput label="Company Logo URL" value={company.logoUrl} onChange={e => setC("logoUrl", e.target.value)} placeholder="https://.../logo.png" hint="Direct image URL" />
              <FormInput label="GST / Tax ID (Optional)" value={company.gst} onChange={e => setC("gst", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select className="form-input" value={company.timezone} onChange={e => setC("timezone", e.target.value)}>
                {TIMEZONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-primary btn-lg" onClick={() => { if (validateStep1()) setStep(2); }} style={{ minWidth: 160, justifyContent: "center" }}>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="premium-form-card fade-in">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Super Admin Account</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Primary admin for <strong>{company.name}</strong>.</p>
            {apiError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "var(--danger)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                <SvgIcon name="alert" size={14} color="var(--danger)" />
                {apiError}
              </div>
            )}
            <div className="grid-2">
              <FormInput label="Full Name *" value={admin.name} onChange={e => setA("name", e.target.value)} placeholder="Your full name" error={errors.adminName} />
              <FormInput label="Email Address *" type="email" value={admin.email} onChange={e => setA("email", e.target.value)} placeholder="admin@youragency.com" error={errors.adminEmail} />
            </div>
            <FormInput label="Phone Number *" value={admin.phone} onChange={e => setA("phone", e.target.value)} placeholder="+91 98000 00000" error={errors.adminPhone} />
            <div className="grid-2">
              <FormInput label="Create Password *" type={showPassword ? "text" : "password"} value={admin.password} onChange={e => setA("password", e.target.value)} placeholder="Min. 6 characters" error={errors.password} />
              <FormInput label="Confirm Password *" type={showPassword ? "text" : "password"} value={admin.confirmPassword} onChange={e => setA("confirmPassword", e.target.value)} placeholder="Re-enter password" error={errors.confirmPassword} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input id="show-pass" type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} style={{ cursor: "pointer" }} />
              <label htmlFor="show-pass" style={{ fontSize: 13, color: "var(--muted)", cursor: "pointer", userSelect: "none" }}>Show passwords</label>
            </div>
            <div style={{ background: "var(--light-orange)", border: "1px solid rgba(255,106,0,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10 }}>
              <div style={{ flexShrink: 0, width: 20, height: 20, marginTop: 1 }}>
                <SvgIcon name="shield" size={18} color="var(--primary)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)", marginBottom: 2 }}>Super Admin Privileges</p>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Full access to manage clients, team, tasks, approvals, reports, and all workspace settings.</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 12 }}>
              <button className="btn btn-outline" onClick={() => { setStep(1); setErrors({}); }}>
                Back
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{ minWidth: 200, justifyContent: "center" }}>
                {loading ? <><Spinner /> Creating workspace...</> : "Create Workspace"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default CompanyRegistrationPage;
