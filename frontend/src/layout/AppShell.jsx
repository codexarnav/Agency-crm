// AppShell - main layout with sidebar, topbar, and page routing
import { useState, useEffect, useCallback } from "react";
import { AppContext } from "../shared/AppContext";
import { ROLE_META, NAV_CONFIG, LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { Toast } from "../shared/components";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getClients, getTasks, getEmployees, getNotifications, getAnnouncements } from "../services/api";

// Page imports
import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import ManagerDashboard from "../pages/ManagerDashboard";
import AccountManagerDashboard from "../pages/AccountManagerDashboard";
import EmployeeDashboard from "../pages/EmployeeDashboard";
import ClientDashboard from "../pages/ClientDashboard";
import ClientsPage from "../pages/ClientsPage";
import MonthlyPlannerPage from "../pages/MonthlyPlannerPage";
import ContentCalendarPage from "../pages/ContentCalendarPage";
import AgencyTaskOverviewPage from "../pages/AgencyTaskOverviewPage";
import EmployeeKanbanPage from "../pages/EmployeeKanbanPage";
import EmployeeTasksPage from "../pages/EmployeeTasksPage";
import EmployeeDeadlinesPage from "../pages/EmployeeDeadlinesPage";
import EmployeeWorkloadKanbanPage from "../pages/EmployeeWorkloadPage";
import EmployeeAvailabilityPage from "../pages/EmployeeAvailabilityPage";
import ClientCalendarPage from "../pages/ClientCalendarPage";
import ApprovalsPage from "../pages/ApprovalsPage";
import NotificationsPage from "../pages/NotificationsPage";
import ActivityLogPage from "../pages/ActivityLogPage";
import AnnouncementsPage from "../pages/AnnouncementsPage";
import ReportsPage from "../pages/ReportsPage";
import BrandAssetsPage from "../pages/BrandAssetsPage";
import HolidayCalendarPage from "../pages/HolidayCalendarPage";
import WorkspacePage from "../pages/WorkspacePage";
import TeamPage from "../pages/TeamPage";
import ManagersPage from "../pages/Managers";
import EmployeesPage from "../pages/Employees";
import ComingSoonPage from "../pages/ComingSoonPage";
import ShootsPage from "../pages/ShootsPage";
import PublishingQueue from "../pages/PublishingQueue";
import PublishingCalendar from "../pages/PublishingCalendar";
import SettingsPage from "../pages/SettingsPage";
import ClientSocialOnboardingPage from "../pages/ClientSocialOnboardingPage";

function AppShell({ session, logout, updateSession }) {
  const [page, setPage] = useState(() => {
    if (window.location.pathname === "/client/settings/social") {
      return "settings_social";
    }
    const role = session?.role;
    if (role === "superadmin" || role === "manager") {
      return "users";
    }
    return "dashboard";
  });

  useEffect(() => {
    if (page === "settings_social") {
      if (window.location.pathname !== "/client/settings/social") {
        window.history.pushState({}, "", "/client/settings/social");
      }
    } else {
      if (window.location.pathname === "/client/settings/social") {
        window.history.pushState({}, "", "/");
      }
    }
  }, [page]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshClients = useCallback(async () => {
    try {
      const res = await getClients();
      setClients(res.data || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await getTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, []);

  const refreshEmployees = useCallback(async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!session?.id) return;
    try {
      const res = await getNotifications(session.id);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [session?.id]);

  const refreshAnnouncements = useCallback(async () => {
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    }
  }, []);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Fetch initial data from backend
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        refreshClients(),
        refreshTasks(),
        refreshEmployees(),
        refreshNotifications(),
        refreshAnnouncements()
      ]);
      setLoading(false);
    };
    loadAll();
  }, [refreshClients, refreshTasks, refreshEmployees, refreshNotifications, refreshAnnouncements]);

  // Welcome toast once per session
  useEffect(() => {
    const shown = sessionStorage.getItem("welcome_shown");
    if (!shown) {
      const m = ROLE_META[session?.role] || {};
      showToast(`Welcome back, ${session?.name?.split(" ")[0] || "User"}. You're signed in as ${m.label || "Guest"}.`, "success");
      sessionStorage.setItem("welcome_shown", "1");
    }
  }, []);

  // Deadline notification scanner
  useEffect(() => {
    if (loading || tasks.length === 0) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const newNotifs = [];

    tasks.forEach(t => {
      if (!t.internalDeadline || t.productionStatus === "completed" || t.approvalStatus === "final_approved") return;
      const dl = new Date(t.internalDeadline); dl.setHours(0, 0, 0, 0);
      const diff = Math.ceil((dl - today) / 86400000);
      const key = `dl_notif_${t.id}_${diff}`;
      if (sessionStorage.getItem(key)) return;

      let title = "", msg = "", type = "deadline";
      if (diff === 2) { title = "Deadline in 2 days"; msg = `${t.contentDescription} for ${t.clientName} is due ${t.internalDeadline}`; }
      else if (diff === 1) { title = "Deadline tomorrow"; msg = `${t.contentDescription} for ${t.clientName} must be ready by tomorrow`; type = "overdue"; }
      else if (diff === 0) { title = "Deadline today!"; msg = `${t.contentDescription} for ${t.clientName} is due today`; type = "overdue"; }
      else if (diff < 0) { title = "Overdue task"; msg = `${t.contentDescription} for ${t.clientName} was due ${t.internalDeadline}`; type = "overdue"; }

      if (title) {
        const targets = [session?.id, t.assignedEmployeeId].filter(Boolean);
        const isDup = (notifications || []).some(n => n.content === msg);
        if (!isDup) {
          targets.forEach(uid => newNotifs.push({ userId: uid, message: msg }));
          sessionStorage.setItem(key, "1");
        }
      }
    });

    if (newNotifs.length > 0) {
      import("../services/api").then(async (api) => {
        for (const n of newNotifs) {
          try {
            await api.createNotification({
              senderId: session?.id || n.userId,
              receiverId: n.userId,
              type: "SYSTEM",
              content: n.message
            });
          } catch (err) {
            console.error("Failed to save deadline notification to DB:", err);
          }
        }
        refreshNotifications();
      }).catch(err => console.error(err));
    }
  }, [loading, tasks, notifications, session?.id, refreshNotifications]);

  const ctx = {
    session,
    logout,
    updateSession,
    notifications,
    clients,
    tasks,
    employees,
    showToast,
    LSUtils,
    MOCK,
    refreshClients,
    refreshTasks,
    refreshEmployees,
    refreshNotifications,
    announcements,
    refreshAnnouncements
  };

  const renderPage = () => {
    const role = session?.role || "employee";

    // Dashboard is role-specific
    if (page === "dashboard") {
      if (role === "superadmin") return <SuperAdminDashboard setPage={setPage} />;
      if (role === "manager") return <ManagerDashboard setPage={setPage} />;
      if (role === "accountmanager") return <AccountManagerDashboard setPage={setPage} />;
      if (role === "employee") return <EmployeeDashboard setPage={setPage} />;
      if (role === "client") return <ClientDashboard setPage={setPage} />;
    }

    // Full modules
    switch (page) {
      // Protected: Managers — superadmin only
      case "managers":
        if (role !== "superadmin") { setPage("dashboard"); return null; }
        return <ManagersPage />;
      // Protected: Employees Management — superadmin + manager
      case "employees_mgmt":
        if (role !== "superadmin" && role !== "manager") { setPage("dashboard"); return null; }
        return <EmployeesPage />;
      case "clients": return <ClientsPage />;
      case "tasks": return role === "employee" ? <EmployeeTasksPage /> : <AgencyTaskOverviewPage />;
      case "planner": return <MonthlyPlannerPage />;
      case "calendar": return role === "client" ? <ClientCalendarPage /> : <ContentCalendarPage />;
      case "workload": return <EmployeeWorkloadKanbanPage />;
      case "availability": return <EmployeeAvailabilityPage />;
      case "team": return <TeamPage />;
      case "kanban": return <EmployeeKanbanPage />;
      case "deadlines": return <EmployeeDeadlinesPage />;
      case "approvals": return role === "client" ? <ClientDashboard setPage={setPage} /> : <ApprovalsPage />;
      case "feedback": return <AgencyTaskOverviewPage />;
      case "notifications": return <NotificationsPage />;
      case "activity": return <ActivityLogPage />;
      case "announcements": return <AnnouncementsPage />;
      case "reports": return <ReportsPage />;
      case "assets": return <BrandAssetsPage />;
      case "holidays": return <HolidayCalendarPage />;
      case "workspace": return <WorkspacePage />;
      case "users": return <WorkspacePage teamOnly={true} />;
      case "publishing": return <AgencyTaskOverviewPage />;
      case "publishing_queue":
        if (role !== "superadmin" && role !== "manager") { setPage("dashboard"); return null; }
        return <PublishingQueue />;
      case "publishing_calendar":
        if (role !== "superadmin" && role !== "manager") { setPage("dashboard"); return null; }
        return <PublishingCalendar />;
      case "shoots": return <ShootsPage />;
      case "settings_social": return <ClientSocialOnboardingPage />;
      case "settings": return <SettingsPage />;
      default: return <ComingSoonPage title={(NAV_CONFIG[role] || []).flatMap(s => s.items).find(i => i.id === page)?.label || page} />;
    }
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <Sidebar activePage={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="main-area">
          <Topbar page={page} setMobileOpen={setMobileOpen} setPage={setPage} />
          <div className="page-content">
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", color: "var(--muted)" }}>
                <span className="spin" style={{ display: "inline-block", width: 32, height: 32, border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
                <p style={{ marginTop: 16, fontWeight: 600, fontSize: 14 }}>Loading dashboard data...</p>
              </div>
            ) : renderPage()}
          </div>
        </div>
        <Toast toasts={toasts} remove={removeToast} />
      </div>
    </AppContext.Provider>
  );
}

export default AppShell;
