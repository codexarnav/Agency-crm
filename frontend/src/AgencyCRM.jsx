// AgencyCRM - Main entry point (split into separate files)
import { useState, useEffect } from "react";
import css from "./shared/globalStyles";
import { LSUtils } from "./shared/utils";
import { ROLE_META } from "./shared/constants";
import { removeToken, getToken } from "./shared/api";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./layout/AppShell";
import WelcomePage from "./pages/LandingPage";
import CompanyRegistrationPage from "./pages/CompanyRegistrationPage";
import RoleLoginPage from "./pages/RoleLoginPage";

function AppInner() {
  const { user: authUser, loading: authLoading, logout: authLogout } = useAuth();

  const [screen, setScreen] = useState(() => {
    const existing = LSUtils.getCurrentSession();
    if (existing && typeof existing === "object" && existing.role) return "app";
    // If there's a JWT token, wait for AuthContext to resolve
    if (getToken()) return "loading";
    return "welcome";
  });
  const [session, setSession] = useState(() => {
    const existing = LSUtils.getCurrentSession();
    return (existing && typeof existing === "object" && existing.role) ? existing : null;
  });
  const [regToast, setRegToast] = useState(null);

  const updateSession = (newDetails) => {
    setSession(prev => {
      if (!prev) return null;
      const next = { ...prev, ...newDetails };
      LSUtils.setCurrentSession(next);
      return next;
    });
  };

  // When AuthContext finishes loading, sync session
  useEffect(() => {
    if (authLoading) return;

    if (authUser && !session) {
      // JWT is valid but no localStorage session — create one from authUser
      const newSession = {
        id: authUser.id,
        name: authUser.username || authUser.email,
        email: authUser.email,
        role: authUser.role,
        companyId: authUser.companyId,
        companyName: "Your Agency",
        displayRole: ROLE_META[authUser.role]?.label || authUser.role,
        profilePicture: authUser.profilePicture || "",
      };
      LSUtils.setCurrentSession(newSession);
      setSession(newSession);
      setScreen("app");
    } else if (!authUser && !session && screen === "loading") {
      // No valid token and no session — go to welcome
      setScreen("welcome");
    }
  }, [authUser, authLoading, session, screen]);

  // After company registration success
  const handleRegisterSuccess = (sess) => {
    setSession(sess);
    setRegToast({ message: `Workspace created successfully. Welcome, ${sess.name.split(" ")[0]}!`, type: "success" });
    setScreen("app");
    sessionStorage.setItem("welcome_shown", "1");
  };

  // After login success
  const handleLoginSuccess = (sess) => {
    setSession(sess);
    setScreen("app");
  };

  // Logout  -  clear session and JWT token, keep all data
  const handleLogout = () => {
    LSUtils.logoutUser();
    removeToken();
    authLogout();
    sessionStorage.removeItem("welcome_shown");
    setSession(null);
    setScreen("welcome");
  };

  // Show loading while AuthContext resolves
  if (screen === "loading" || authLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFA" }}>
          <div style={{ textAlign: "center" }}>
            <span className="spin" style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: "#FF6A00", borderRadius: "50%" }} />
            <p style={{ marginTop: 16, fontSize: 14, color: "#6B7280", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Loading AgencyFlow...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {screen === "welcome" && (
        <WelcomePage
          onStartCompany={() => setScreen("register")}
          onLogin={() => setScreen("login")}
        />
      )}

      {screen === "register" && (
        <CompanyRegistrationPage
          onSuccess={handleRegisterSuccess}
          onBack={() => setScreen("welcome")}
        />
      )}

      {screen === "login" && (
        <RoleLoginPage
          onLogin={handleLoginSuccess}
          onBack={() => setScreen("welcome")}
        />
      )}

      {screen === "app" && session && (
        <AppShell session={session} logout={handleLogout} regToast={regToast} updateSession={updateSession} />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}