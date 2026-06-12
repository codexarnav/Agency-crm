import { useState } from "react";
import { SvgIcon, FormInput, Btn } from "../shared/components";
import { apiChangeOnboardingPassword, saveToken } from "../services/api";

function OnboardingChangePasswordPage({ session, updateSession, logout }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current temporary password.");
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiChangeOnboardingPassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setSuccess(true);
        saveToken(res.token);
        
        // Short timeout for visual feedback
        setTimeout(() => {
          updateSession({
            ...res.user,
            mustChangePassword: false
          });
        }, 1000);
      } else {
        setError(res.message || "Failed to update password.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please check your credentials.");
      setLoading(false);
    }
  };

  const Spinner = () => (
    <span
      className="spin"
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        marginRight: 8
      }}
    />
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: -120, right: -120, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,106,0,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />
      
      <header style={{ padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "#fff", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: "#fff" }}>A</div>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15, color: "#151515" }}>AgencyFlow CRM</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Log Out
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px 60px", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: success ? "linear-gradient(135deg,#10B981,#059669)" : "linear-gradient(135deg,#FF6A00,#E95A00)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <SvgIcon name={success ? "check" : "lock"} size={24} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, color: "#151515", marginBottom: 6 }}>
              {success ? "Password Updated!" : "Update Your Password"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
              {success 
                ? "Your password has been changed successfully. Redirecting you to the dashboard..." 
                : "You are using a temporary password. Please create a new password to continue."
              }
            </p>
          </div>

          <div className="card" style={{ padding: 28, textAlign: "left" }}>
            {success ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "3px solid #E5E7EB", borderTopColor: "#10B981", borderRadius: "50%" }} />
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>Loading workspace settings...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "var(--danger)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                    <SvgIcon name="alert" size={14} color="var(--danger)" />
                    {error}
                  </div>
                )}

                <FormInput
                  label="Temporary Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password from email"
                />

                <FormInput
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />

                <FormInput
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: "100%", justifyContent: "center", padding: "11px 22px", fontSize: 15, borderRadius: 10, marginTop: 12 }}
                >
                  {loading ? <><Spinner />Updating Password...</> : "Update and Continue"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingChangePasswordPage;
