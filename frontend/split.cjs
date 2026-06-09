/**
 * Script to split AgencyCRM.jsx into separate page-wise files.
 * Run with: node split.js
 * 
 * This reads the original monolithic file and creates well-organized separate files,
 * preserving all logic exactly as-is.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const ORIGINAL = fs.readFileSync(path.join(SRC, 'AgencyCRM.jsx'), 'utf-8');
const lines = ORIGINAL.split(/\r?\n/);

function extract(startLine, endLine) {
  // 1-indexed to 0-indexed
  return lines.slice(startLine - 1, endLine).join('\n');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(relPath, content) {
  const fullPath = path.join(SRC, relPath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`  Created: ${relPath}`);
}

console.log('Starting split of AgencyCRM.jsx...\n');

// ============================================================
// 1. shared/constants.js
// ============================================================
writeFile('shared/constants.js', `// Constants extracted from AgencyCRM.jsx

export const THEME = {
  primary: "#FF6A00",
  deep: "#E95A00",
  light: "#FFF3E8",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  dark: "#151515",
  muted: "#6B7280",
  border: "#E5E7EB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  purple: "#7C3AED",
};

${extract(489, 690)}

${extract(938, 964)}

${extract(966, 1095)}

${extract(6327, 6331)}

export const MAX_REVISIONS = 2;
`);

// ============================================================
// 2. shared/utils.js
// ============================================================
writeFile('shared/utils.js', `// Utility functions extracted from AgencyCRM.jsx
import { LS_KEYS } from './constants';

${extract(507, 559)}

export { LSUtils };
`);

// ============================================================
// 3. shared/AppContext.jsx
// ============================================================
writeFile('shared/AppContext.jsx', `// App context extracted from AgencyCRM.jsx
import { createContext, useContext } from "react";

const AppContext = createContext(null);

function useApp() {
  return useContext(AppContext);
}

export { AppContext, useApp };
`);

// ============================================================
// 4. shared/components.jsx - All reusable UI components
// ============================================================
writeFile('shared/components.jsx', `// Reusable UI components extracted from AgencyCRM.jsx
import { useState, useEffect } from "react";
import { useApp } from "./AppContext";
import { ROLE_META, LS_KEYS, MOCK } from "./constants";
import { LSUtils } from "./utils";

// SvgIcon
${extract(900, 936)}

// Btn
${extract(698, 711)}

// StatusBadge
${extract(714, 742)}

// Avatar
${extract(745, 754)}

// ProgressBar
${extract(757, 768)}

// FormInput
${extract(771, 786)}

// SearchBar
${extract(789, 803)}

// FilterBar
${extract(806, 817)}

// EmptyState
${extract(820, 831)}

// Modal
${extract(834, 850)}

// Toast
${extract(853, 870)}

// DataTable
${extract(873, 895)}

// AnimStatCard
${extract(1435, 1472)}

// RoleBanner
${extract(1475, 1517)}

// AnnouncementBanner
${extract(1520, 1557)}

// ActivityFeed
${extract(1560, 1595)}

// PendingApprovals
${extract(1598, 1631)}

// UpcomingDeadlines
${extract(1634, 1674)}

// QuickActions
${extract(1677, 1723)}

// InfoRow
${extract(6582, 6590)}

export {
  SvgIcon, Btn, StatusBadge, Avatar, ProgressBar, FormInput, SearchBar,
  FilterBar, EmptyState, Modal, Toast, DataTable, AnimStatCard,
  RoleBanner, AnnouncementBanner, ActivityFeed, PendingApprovals,
  UpcomingDeadlines, QuickActions, InfoRow,
};
`);

// ============================================================
// 5. shared/taskConstants.js - Task status constants, badges, helpers
// ============================================================
writeFile('shared/taskConstants.js', `// Task-related constants, badge components, and helper functions
import { SvgIcon } from "./components";
import { LSUtils } from "./utils";
import { LS_KEYS } from "./constants";
import { useApp } from "./AppContext";
import { useState, useEffect } from "react";

export const MAX_REVISIONS = 2;

${extract(3077, 3094)}

// MicroBadge components
${extract(3095, 3102)}

// AI assignment helpers
${extract(3104, 3136)}

// Approval helpers
${extract(2072, 2101)}

// ApprovalTimeline
${extract(2104, 2136)}

// RevisionHistory
${extract(2139, 2183)}

// ApprovalModal
${extract(2186, 2375)}

// ClientApprovalModal
${extract(2378, 2482)}

// TaskDetailDrawer
${extract(3139, 3226)}

// TaskCreateModal
${extract(3229, 3363)}

export {
  MicroBadge, ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  CONTENT_TYPES_LIST, PLATFORMS_LIST, PRIORITIES_LIST,
  PROD_STATUSES_LIST, APPROV_STATUSES_LIST, PUB_STATUSES_LIST,
  PROD_LABELS_MAP, APPROV_LABELS_MAP, PUB_LABELS_MAP, PRIO_LABELS_MAP,
  PROD_COLORS, APPROV_COLORS, PUB_COLORS, PRIO_COLORS,
  AI_SKILL_RULES, doAIAssign, calcInternalDeadline, calcDayName,
  approvalStep, persistTaskUpdate, addRevision,
  ApprovalTimeline, RevisionHistory, ApprovalModal, ClientApprovalModal,
  TaskDetailDrawer, TaskCreateModal,
};
`);

// ============================================================
// 6. Layout: AppShell, Sidebar, Topbar
// ============================================================
writeFile('layout/Sidebar.jsx', `// Sidebar component
import { useApp } from "../shared/AppContext";
import { ROLE_META, NAV_CONFIG } from "../shared/constants";
import { SvgIcon, Avatar } from "../shared/components";

${extract(1097, 1188)}

export default Sidebar;
`);

writeFile('layout/Topbar.jsx', `// Topbar component
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { ROLE_META, NAV_CONFIG, LS_KEYS } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { SvgIcon, Avatar } from "../shared/components";

${extract(1190, 1432)}

export default Topbar;
`);

writeFile('layout/AppShell.jsx', `// AppShell - main layout with sidebar, topbar, and page routing
import { useState, useEffect, useCallback } from "react";
import { AppContext, useApp } from "../shared/AppContext";
import { ROLE_META, NAV_CONFIG, LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { Toast } from "../shared/components";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

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
import EmployeeWorkloadPage from "../pages/EmployeeWorkloadPage";
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
import ComingSoonPage from "../pages/ComingSoonPage";

${extract(6208, 6325)}

export default AppShell;
`);

// ============================================================
// 7. Auth pages
// ============================================================
writeFile('pages/LandingPage.jsx', `// Landing / Welcome page
import { useState } from "react";
import { SvgIcon } from "../shared/components";
import { ROLE_META } from "../shared/constants";

${extract(7370, 7489)}

export default WelcomePage;
`);

writeFile('pages/CompanyRegistrationPage.jsx', `// Company Registration page
import { useState } from "react";
import { SvgIcon, FormInput, Btn } from "../shared/components";
import { INDUSTRY_OPTIONS, TIMEZONE_OPTIONS, MOCK, LS_KEYS, SAMPLE_CREDENTIALS } from "../shared/constants";
import { LSUtils } from "../shared/utils";

${extract(7490, 7596)}

export default CompanyRegistrationPage;
`);

writeFile('pages/RoleLoginPage.jsx', `// Role-based Login page
import { useState } from "react";
import { SvgIcon, FormInput, Btn } from "../shared/components";
import { ROLE_META, SAMPLE_CREDENTIALS, LS_KEYS } from "../shared/constants";
import { LSUtils } from "../shared/utils";

${extract(7597, 7699)}

export default RoleLoginPage;
`);

// ============================================================
// 8. Dashboard pages
// ============================================================
writeFile('pages/SuperAdminDashboard.jsx', `// Super Admin Dashboard
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
} from "../shared/components";

${extract(1725, 1840)}

export default SuperAdminDashboard;
`);

writeFile('pages/ManagerDashboard.jsx', `// Manager Dashboard
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
} from "../shared/components";

${extract(1841, 1909)}

export default ManagerDashboard;
`);

writeFile('pages/AccountManagerDashboard.jsx', `// Account Manager Dashboard
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
} from "../shared/components";

${extract(1910, 1976)}

export default AccountManagerDashboard;
`);

writeFile('pages/EmployeeDashboard.jsx', `// Employee Dashboard
import { useState } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
  Avatar, StatusBadge, Btn,
} from "../shared/components";

${extract(1977, 2067)}

export default EmployeeDashboard;
`);

writeFile('pages/ClientDashboard.jsx', `// Client Dashboard
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, SvgIcon,
  StatusBadge, Avatar, Btn, EmptyState, FilterBar, SearchBar,
} from "../shared/components";
import {
  ClientApprovalModal, approvalStep, persistTaskUpdate, addRevision,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge,
  MAX_REVISIONS,
} from "../shared/taskConstants";

${extract(2667, 3075)}

export default ClientDashboard;
`);

// ============================================================
// 9. Feature pages
// ============================================================
writeFile('pages/ApprovalsPage.jsx', `// Approvals Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, FilterBar,
  SearchBar, DataTable, Modal,
} from "../shared/components";
import {
  approvalStep, persistTaskUpdate, addRevision,
  ApprovalModal, ApprovalTimeline, RevisionHistory,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  MAX_REVISIONS,
  PROD_LABELS_MAP, APPROV_LABELS_MAP,
} from "../shared/taskConstants";

${extract(2484, 2666)}

export default ApprovalsPage;
`);

writeFile('pages/MonthlyPlannerPage.jsx', `// Monthly Content Planner Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar, Modal,
} from "../shared/components";
import {
  TaskDetailDrawer, TaskCreateModal,
  calcDayName, calcInternalDeadline, doAIAssign,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  CONTENT_TYPES_LIST, PLATFORMS_LIST, PRIORITIES_LIST,
  PROD_STATUSES_LIST, APPROV_STATUSES_LIST, PUB_STATUSES_LIST,
  PROD_LABELS_MAP, APPROV_LABELS_MAP, PUB_LABELS_MAP, PRIO_LABELS_MAP,
} from "../shared/taskConstants";

${extract(3366, 3611)}

export default MonthlyPlannerPage;
`);

writeFile('pages/ContentCalendarPage.jsx', `// Content Calendar Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, StatusBadge, EmptyState, Avatar, FilterBar,
} from "../shared/components";
import {
  TaskDetailDrawer,
  ProdMBadge, PrioMBadge,
} from "../shared/taskConstants";

${extract(3612, 3794)}

export default ContentCalendarPage;
`);

writeFile('pages/AgencyTaskOverviewPage.jsx', `// Agency Task Overview Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  FilterBar, DataTable,
} from "../shared/components";
import {
  TaskDetailDrawer, TaskCreateModal,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  PROD_LABELS_MAP, APPROV_LABELS_MAP,
  PROD_STATUSES_LIST, APPROV_STATUSES_LIST,
} from "../shared/taskConstants";

${extract(3795, 3919)}

export default AgencyTaskOverviewPage;
`);

writeFile('pages/EmployeeKanbanPage.jsx', `// Employee Kanban Board Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState,
} from "../shared/components";
import {
  TaskDetailDrawer,
  ProdMBadge, PrioMBadge,
  PROD_STATUSES_LIST, PROD_LABELS_MAP, PROD_COLORS,
} from "../shared/taskConstants";

${extract(3920, 4015)}

export default EmployeeKanbanPage;
`);

writeFile('pages/NotificationsPage.jsx', `// Notifications Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, StatusBadge,
} from "../shared/components";

${extract(4016, 4197)}

export default NotificationsPage;
`);

writeFile('pages/ActivityLogPage.jsx', `// Activity Log Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, Avatar,
} from "../shared/components";

${extract(4198, 4414)}

export default ActivityLogPage;
`);

writeFile('pages/AnnouncementsPage.jsx', `// Announcements Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, StatusBadge, Avatar,
} from "../shared/components";

${extract(4415, 4670)}

export default AnnouncementsPage;
`);

writeFile('pages/ReportsPage.jsx', `// Reports Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, Avatar, StatusBadge,
} from "../shared/components";

// Report helpers
${extract(4671, 4715)}

${extract(4716, 4996)}

export default ReportsPage;
`);

writeFile('pages/BrandAssetsPage.jsx', `// Brand Assets Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, SearchBar, FilterBar, Modal, FormInput,
  Avatar, StatusBadge,
} from "../shared/components";

// BrandAssetModal
${extract(4997, 5020)}

${extract(5021, 5192)}

export default BrandAssetsPage;
`);

writeFile('pages/HolidayCalendarPage.jsx', `// Holiday Calendar Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, StatusBadge,
} from "../shared/components";

${extract(5193, 5409)}

export default HolidayCalendarPage;
`);

writeFile('pages/EmployeeAvailabilityPage.jsx', `// Employee Availability Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, Avatar, StatusBadge,
  SearchBar, FilterBar,
} from "../shared/components";

${extract(5412, 5713)}

export default EmployeeAvailabilityPage;
`);

writeFile('pages/WorkspacePage.jsx', `// Workspace / Settings Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, Avatar, StatusBadge,
  ProgressBar, DataTable,
} from "../shared/components";

// AddUserModal
${extract(5714, 5786)}

${extract(5787, 5955)}

export default WorkspacePage;
`);

writeFile('pages/EmployeeWorkloadPage.jsx', `// Employee Workload Kanban Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, ProgressBar,
} from "../shared/components";

${extract(5956, 6012)}

export default EmployeeWorkloadKanbanPage;
`);

writeFile('pages/EmployeeTasksPage.jsx', `// Employee Tasks Page (for employee role)
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar, FilterBar,
} from "../shared/components";
import {
  TaskDetailDrawer,
  ProdMBadge, PrioMBadge,
  PROD_STATUSES_LIST, PROD_LABELS_MAP,
} from "../shared/taskConstants";

${extract(6013, 6078)}

export default EmployeeTasksPage;
`);

writeFile('pages/EmployeeDeadlinesPage.jsx', `// Employee Deadlines Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState,
} from "../shared/components";
import { ProdMBadge, PrioMBadge } from "../shared/taskConstants";

${extract(6079, 6129)}

export default EmployeeDeadlinesPage;
`);

writeFile('pages/ClientCalendarPage.jsx', `// Client Calendar Page (for client role)
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, FilterBar,
} from "../shared/components";
import { ProdMBadge, PrioMBadge } from "../shared/taskConstants";

${extract(6130, 6189)}

export default ClientCalendarPage;
`);

writeFile('pages/ClientsPage.jsx', `// Clients Management Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK, CLIENT_STATUSES, CLIENT_INDUSTRIES, PLATFORM_OPTIONS, DELIVERABLE_TYPES } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  FilterBar, Modal, FormInput, DataTable, ProgressBar, InfoRow,
} from "../shared/components";

// Client helpers
${extract(6332, 6341)}

// ClientFormModal
${extract(6342, 6473)}

// ClientDrawer
${extract(6474, 6581)}

// ClientsPage
${extract(6591, 6840)}

export default ClientsPage;
`);

writeFile('pages/TeamPage.jsx', `// Team / Employee Management Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar,
  FilterBar, Modal, FormInput, DataTable, ProgressBar,
} from "../shared/components";

// TasksPage (Agency Task Overview variant for manager)
${extract(6841, 6968)}

// Workload helpers
${extract(6969, 6986)}

// EmployeeFormModal
${extract(6987, 7078)}

// TeamPage
${extract(7079, 7369)}

export { TasksPage };
export default TeamPage;
`);

writeFile('pages/ComingSoonPage.jsx', `// Coming Soon placeholder page
import { SvgIcon } from "../shared/components";

${extract(6190, 6207)}

export default ComingSoonPage;
`);

// ============================================================
// 10. New slim AgencyCRM.jsx entry point
// ============================================================
// Use the original lines 7701-7761 directly from the source file
const agencyCRMContent = [
  '// AgencyCRM - Main entry point (split into separate files)',
  'import { useState } from "react";',
  'import css from "./shared/globalStyles";',
  'import { LSUtils } from "./shared/utils";',
  'import { ROLE_META } from "./shared/constants";',
  'import AppShell from "./layout/AppShell";',
  'import WelcomePage from "./pages/LandingPage";',
  'import CompanyRegistrationPage from "./pages/CompanyRegistrationPage";',
  'import RoleLoginPage from "./pages/RoleLoginPage";',
  '',
  extract(7701, 7761),
].join('\n');

writeFile('AgencyCRM.jsx', agencyCRMContent);

console.log('\nDone! All files created successfully.');
console.log('\nFile structure:');
console.log('  src/shared/     - constants, utils, context, components, taskConstants');
console.log('  src/layout/     - AppShell, Sidebar, Topbar');
console.log('  src/pages/      - All page components (one per file)');
console.log('  src/AgencyCRM.jsx - Slim entry point');
