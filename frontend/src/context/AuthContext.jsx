// AuthContext — fetches current user from backend on startup
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser, getToken, removeToken } from "../services/api";

const AuthContext = createContext(null);

// Map backend role enum → frontend role key
const roleMap = {
  SUPER_ADMIN: "superadmin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  CLIENT: "client",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((res) => {
        const u = res.user;
        setUser({
          id: u.id,
          email: u.email,
          username: u.username,
          role: roleMap[u.role] || u.role?.toLowerCase(),
          backendRole: u.role,
          companyId: u.companyId,
          profilePicture: u.profilePicture,
          phoneNumber: u.phoneNumber,
          mustChangePassword: u.mustChangePassword,
        });
      })
      .catch(() => {
        // Token invalid / expired — clear it
        removeToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  // Allow updating user after login (called from login page)
  const setAuthUser = useCallback((backendUser, token) => {
    if (token) {
      // Token is already saved by the login page via saveToken
    }
    if (backendUser) {
      setUser({
        id: backendUser.id,
        email: backendUser.email,
        username: backendUser.username,
        role: roleMap[backendUser.role] || backendUser.role?.toLowerCase(),
        backendRole: backendUser.role,
        companyId: backendUser.companyId,
        profilePicture: backendUser.profilePicture,
        phoneNumber: backendUser.phoneNumber,
        mustChangePassword: backendUser.mustChangePassword,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
