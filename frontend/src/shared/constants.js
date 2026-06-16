// Constants extracted from AgencyCRM.jsx

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

export const LS_KEYS = {
  COMPANIES: "crm_companies",
  USERS: "crm_users",
  CLIENTS: "crm_clients",
  EMPLOYEES: "crm_employees",
  TASKS: "crm_tasks",
  DELIVERABLES: "crm_deliverables",
  NOTIFICATIONS: "crm_notifications",
  ANNOUNCEMENTS: "crm_announcements",
  ACTIVITY_LOGS: "crm_activity_logs",
  BRAND_ASSETS: "crm_brand_assets",
  HOLIDAYS: "crm_holidays",
  AVAILABILITY: "crm_availability",
  FEEDBACK: "crm_feedback",
  REVISIONS: "crm_revisions",
  SESSION: "crm_session",
};

export const MOCK = {
  companies: [
    { id: "comp_1", name: "Orbit Agency", logo: null, email: "hello@orbitagency.in", phone: "+91 98000 00000", address: "Mumbai, Maharashtra", plan: "enterprise", createdAt: "2023-01-01" },
  ],
  users: [
    { id: "user_super", companyId: "comp_1", name: "Admin User", email: "admin@orbitagency.in", role: "superadmin", avatar: null, active: true },
    { id: "user_mgr1", companyId: "comp_1", name: "Karan Mehta", email: "karan@orbitagency.in", role: "accountmanager", avatar: null, active: true },
    { id: "user_mgr2", companyId: "comp_1", name: "Riya Sharma", email: "riya@orbitagency.in", role: "manager", avatar: null, active: true },
  ],
  clients: [
    { id: "client_1", companyId: "comp_1", name: "Guardian Pharmacy", brandName: "Guardian", industry: "Healthcare", contactPerson: "Dr. Anil Gupta", email: "anil@guardianpharma.com", phone: "+91 98111 00001", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "Facebook"], monthlyDeliverables: 30, deliverableBreakdown: { "Reel/Short": 12, "Static/Carousel": 10, "Story": 8 }, joinedAt: "2023-03-15", startDate: "2023-03-15", renewalDate: "2024-03-15", brandColor: "#00A651", notes: "Monthly 30 posts. Focus on health awareness campaigns." },
    { id: "client_2", companyId: "comp_1", name: "Laundry Buoy", brandName: "Laundry Buoy", industry: "Consumer Services", contactPerson: "Sumit Taneja", email: "sumit@laundrybuoy.com", phone: "+91 98111 00002", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "Google Business Profile"], monthlyDeliverables: 20, deliverableBreakdown: { "Reel/Short": 8, "Static/Carousel": 8, "Story": 4 }, joinedAt: "2023-05-20", startDate: "2023-05-20", renewalDate: "2024-05-20", brandColor: "#2196F3", notes: "Seasonal promotions." },
    { id: "client_3", companyId: "comp_1", name: "Mangla Stone Group", brandName: "Mangla Stone", industry: "Construction & Real Estate", contactPerson: "Raj Mangla", email: "raj@manglastone.com", phone: "+91 98111 00003", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "LinkedIn", "YouTube"], monthlyDeliverables: 25, deliverableBreakdown: { "Video": 4, "Reel/Short": 10, "Static/Carousel": 8, "Story": 3 }, joinedAt: "2022-11-01", startDate: "2022-11-01", renewalDate: "2023-11-01", brandColor: "#795548", notes: "Luxury stone products." },
    { id: "client_4", companyId: "comp_1", name: "Solar Saarthi", brandName: "Solar Saarthi", industry: "Renewable Energy", contactPerson: "Vivek Pandey", email: "vivek@solarsaarthi.in", phone: "+91 98111 00004", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "Facebook", "YouTube"], monthlyDeliverables: 20, deliverableBreakdown: { "Reel/Short": 8, "Static/Carousel": 8, "Story": 4 }, joinedAt: "2023-07-10", startDate: "2023-07-10", renewalDate: "2024-07-10", brandColor: "#FFC107", notes: "Education-first approach." },
    { id: "client_5", companyId: "comp_1", name: "Premium Autoz", brandName: "Premium Autoz", industry: "Automotive", contactPerson: "Harshit Khurana", email: "harshit@premiumautoz.com", phone: "+91 98111 00005", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "YouTube", "Facebook", "LinkedIn"], monthlyDeliverables: 40, deliverableBreakdown: { "Video": 8, "Reel/Short": 16, "Static/Carousel": 12, "Story": 4 }, joinedAt: "2023-01-28", startDate: "2023-01-28", renewalDate: "2024-01-28", brandColor: "#212121", notes: "Luxury cars. Cinematic content." },
    { id: "client_6", companyId: "comp_1", name: "Nature's Orbit", brandName: "Nature's Orbit", industry: "Organic & Wellness", contactPerson: "Preethi Iyer", email: "preethi@naturesorbit.com", phone: "+91 98111 00006", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "Facebook"], monthlyDeliverables: 20, deliverableBreakdown: { "Reel/Short": 8, "Static/Carousel": 8, "Story": 4 }, joinedAt: "2023-09-05", startDate: "2023-09-05", renewalDate: "2024-09-05", brandColor: "#4CAF50", notes: "Aesthetic-first. Earthy tones." },
    { id: "client_7", companyId: "comp_1", name: "CarFlow", brandName: "CarFlow", industry: "Automotive Tech", contactPerson: "Arjun Sethi", email: "arjun@carflow.app", phone: "+91 98111 00007", status: "paused", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "X/Twitter"], monthlyDeliverables: 15, deliverableBreakdown: { "Reel/Short": 6, "Static/Carousel": 6, "Story": 3 }, joinedAt: "2023-04-12", startDate: "2023-04-12", renewalDate: "2024-04-12", brandColor: "#E91E63", notes: "App-based car service. Paused due to rebranding." },
    { id: "client_8", companyId: "comp_1", name: "U Decor", brandName: "U Decor", industry: "Interior Design", contactPerson: "Sneha Verma", email: "sneha@udecor.in", phone: "+91 98111 00008", status: "active", assignedManager: "user_mgr2", assignedAM: "user_mgr1", platforms: ["Instagram", "YouTube"], monthlyDeliverables: 25, deliverableBreakdown: { "Video": 4, "Reel/Short": 10, "Static/Carousel": 8, "Story": 3 }, joinedAt: "2023-06-18", startDate: "2023-06-18", renewalDate: "2024-06-18", brandColor: "#9C27B0", notes: "Transformation content. Before/after style posts." },
  ],
  employees: [
    { id: "emp_1", companyId: "comp_1", userId: null, name: "Rahul Chauhan", designation: "Video Editor", department: "Production", email: "rahul@orbitagency.in", phone: "+91 99000 00001", skills: ["Video Editing", "Color Grading", "Motion Graphics", "Premiere Pro"], status: "active", joinedAt: "2022-08-01", currentLoad: 7, maxLoad: 10, avatar: null },
    { id: "emp_2", companyId: "comp_1", userId: null, name: "Priya Nair", designation: "Graphic Designer", department: "Creative", email: "priya@orbitagency.in", phone: "+91 99000 00002", skills: ["Graphic Design", "Photoshop", "Illustrator", "Brand Identity"], status: "active", joinedAt: "2022-10-15", currentLoad: 8, maxLoad: 10, avatar: null },
    { id: "emp_3", companyId: "comp_1", userId: null, name: "Aman Kapoor", designation: "Content Writer", department: "Content", email: "aman@orbitagency.in", phone: "+91 99000 00003", skills: ["Copywriting", "SEO", "Content Strategy", "Social Media Copy"], status: "active", joinedAt: "2023-01-10", currentLoad: 6, maxLoad: 10, avatar: null },
    { id: "emp_4", companyId: "comp_1", userId: null, name: "Neha Joshi", designation: "Social Media Manager", department: "Strategy", email: "neha@orbitagency.in", phone: "+91 99000 00004", skills: ["Social Strategy", "Community Management", "Analytics", "Paid Ads"], status: "active", joinedAt: "2022-12-05", currentLoad: 9, maxLoad: 10, avatar: null },
    { id: "emp_5", companyId: "comp_1", userId: "user_mgr1", name: "Karan Mehta", designation: "Account Manager", department: "Management", email: "karan@orbitagency.in", phone: "+91 99000 00005", skills: ["Client Relations", "Project Management", "Strategy", "Reporting"], status: "active", joinedAt: "2022-06-01", currentLoad: 5, maxLoad: 8, avatar: null },
    { id: "emp_6", companyId: "comp_1", userId: "user_mgr2", name: "Riya Sharma", designation: "Brand Strategist", department: "Strategy", email: "riya@orbitagency.in", phone: "+91 99000 00006", skills: ["Brand Strategy", "Market Research", "Campaign Planning", "Analytics"], status: "active", joinedAt: "2022-09-20", currentLoad: 6, maxLoad: 8, avatar: null },
    { id: "emp_7", companyId: "comp_1", userId: null, name: "Mohit Rawat", designation: "Motion Designer", department: "Production", email: "mohit@orbitagency.in", phone: "+91 99000 00007", skills: ["After Effects", "Motion Design", "2D Animation", "Lottie"], status: "active", joinedAt: "2023-03-01", currentLoad: 7, maxLoad: 10, avatar: null },
  ],
  tasks: [
    {
      id: "task_001", companyId: "comp_1", clientId: "client_1", clientName: "Guardian Pharmacy",
      platform: "Instagram", postingDate: "2025-05-12", day: "Monday",
      contentType: "Reel", contentDescription: "World Health Day Awareness Reel - 30 seconds",
      captionCopy: "World Health Day awareness post. #WorldHealthDay #GuardianPharmacy",
      assignedTo: "Rahul Chauhan", assignedEmployeeId: "emp_1", assignmentType: "primary",
      internalDeadline: "2025-05-10", priority: "high",
      productionStatus: "in_progress", approvalStatus: "pending", publishingStatus: "scheduled",
      contentLink: "", managerNotes: "Keep it under 30 sec. Use brand font for text overlays.",
      clientFeedback: "", revisionCount: 0, maxRevisions: 2,
      createdBy: "user_mgr1", createdAt: "2025-05-02T10:00:00Z", updatedAt: "2025-05-05T14:30:00Z",
    },
    {
      id: "task_002", companyId: "comp_1", clientId: "client_2", clientName: "Laundry Buoy",
      platform: "Instagram", postingDate: "2025-05-14", day: "Wednesday",
      contentType: "Carousel", contentDescription: "5-slide carousel on laundry tips",
      captionCopy: "5 laundry hacks you never knew you needed! #LaundryBuoy",
      assignedTo: "Priya Nair", assignedEmployeeId: "emp_2", assignmentType: "primary",
      internalDeadline: "2025-05-12", priority: "medium",
      productionStatus: "review", approvalStatus: "pending", publishingStatus: "pending",
      contentLink: "https://drive.google.com/placeholder", managerNotes: "Use brand blue. Keep copy punchy.",
      clientFeedback: "Looks good! Change slide 3 font size please.", revisionCount: 1, maxRevisions: 2,
      createdBy: "user_mgr1", createdAt: "2025-05-01T09:00:00Z", updatedAt: "2025-05-06T11:00:00Z",
    },
    {
      id: "task_003", companyId: "comp_1", clientId: "client_5", clientName: "Premium Autoz",
      platform: "YouTube", postingDate: "2025-05-16", day: "Friday",
      contentType: "Long Video", contentDescription: "Cinematic showcase of Mercedes GLE 2025 - 3 min",
      captionCopy: "Power and precision  -  2025 Mercedes GLE reveal. #PremiumAutoz",
      assignedTo: "Rahul Chauhan", assignedEmployeeId: "emp_1", assignmentType: "primary",
      internalDeadline: "2025-05-13", priority: "high",
      productionStatus: "production", approvalStatus: "not_required", publishingStatus: "pending",
      contentLink: "", managerNotes: "Cinematic grade. Use Hans Zimmer-style background score.",
      clientFeedback: "", revisionCount: 0, maxRevisions: 3,
      createdBy: "user_mgr2", createdAt: "2025-04-28T08:00:00Z", updatedAt: "2025-05-04T16:00:00Z",
    },
    {
      id: "task_004", companyId: "comp_1", clientId: "client_6", clientName: "Nature's Orbit",
      platform: "Instagram", postingDate: "2025-05-13", day: "Tuesday",
      contentType: "Static Post", contentDescription: "Product spotlight - Organic Aloe Vera Gel",
      captionCopy: "Pure. Organic. Our Aloe Vera Gel is straight from nature. #NaturesOrbit",
      assignedTo: "Priya Nair", assignedEmployeeId: "emp_2", assignmentType: "primary",
      internalDeadline: "2025-05-11", priority: "medium",
      productionStatus: "approved", approvalStatus: "approved", publishingStatus: "scheduled",
      contentLink: "https://drive.google.com/placeholder2",
      managerNotes: "Earthy tones only. No harsh filters.", clientFeedback: "Perfect! Great work.", revisionCount: 1, maxRevisions: 2,
      createdBy: "user_mgr1", createdAt: "2025-05-03T10:00:00Z", updatedAt: "2025-05-07T09:00:00Z",
    },
    {
      id: "task_005", companyId: "comp_1", clientId: "client_8", clientName: "U Decor",
      platform: "Pinterest", postingDate: "2025-05-15", day: "Thursday",
      contentType: "Carousel", contentDescription: "Before/After - Living Room Transformation in Bangalore",
      captionCopy: "From dull to stunning  -  our latest living room transformation. #UDecor",
      assignedTo: "Mohit Rawat", assignedEmployeeId: "emp_7", assignmentType: "primary",
      internalDeadline: "2025-05-13", priority: "low",
      productionStatus: "pending", approvalStatus: "pending", publishingStatus: "pending",
      contentLink: "",
      managerNotes: "Vertical format for Pinterest. Split-screen effect for before/after.", clientFeedback: "", revisionCount: 0, maxRevisions: 2,
      createdBy: "user_mgr1", createdAt: "2025-05-06T08:00:00Z", updatedAt: "2025-05-06T08:00:00Z",
    },
  ],
  deliverables: [
    { id: "del_1", taskId: "task_001", companyId: "comp_1", clientId: "client_1", type: "video", fileUrl: "", fileName: "guardian_reel_v1.mp4", version: 1, uploadedBy: "emp_1", status: "under_review", createdAt: "2025-05-05T14:00:00Z" },
    { id: "del_2", taskId: "task_002", companyId: "comp_1", clientId: "client_2", type: "image_set", fileUrl: "", fileName: "laundrybuoy_carousel_v1.zip", version: 1, uploadedBy: "emp_2", status: "revision_requested", createdAt: "2025-05-05T11:00:00Z" },
  ],
  notifications: [
    { id: "notif_1", userId: "user_super", type: "task", title: "New task assigned", message: "You have been assigned to Guardian Pharmacy Reel", link: "/tasks/task_001", read: false, createdAt: "2025-05-05T10:00:00Z" },
    { id: "notif_2", userId: "user_super", type: "feedback", title: "Client feedback received", message: "Laundry Buoy left feedback on carousel post", link: "/tasks/task_002", read: false, createdAt: "2025-05-06T09:00:00Z" },
    { id: "notif_3", userId: "user_super", type: "deadline", title: "Deadline approaching", message: "Premium Autoz YouTube video due in 2 days", link: "/tasks/task_003", read: true, createdAt: "2025-05-05T08:00:00Z" },
    { id: "notif_4", userId: "user_super", type: "approval", title: "Content approved!", message: "Nature's Orbit Aloe Vera post approved by client", link: "/tasks/task_004", read: true, createdAt: "2025-05-07T09:00:00Z" },
  ],
  announcements: [
    { id: "ann_1", companyId: "comp_1", title: "Agency Offsite - May 20-21", body: "Team offsite at Lonavala. All hands mandatory. Logistics shared on WhatsApp group.", type: "event", priority: "high", createdBy: "user_super", createdAt: "2025-05-04T10:00:00Z", expiresAt: "2025-05-21T00:00:00Z" },
    { id: "ann_2", companyId: "comp_1", title: "New Client Onboarded: Solar Saarthi", body: "Welcome Solar Saarthi to the Orbit Agency family! Karan is the assigned AM. Please check the brief in the shared drive.", type: "info", priority: "medium", createdBy: "user_mgr2", createdAt: "2025-05-03T11:00:00Z", expiresAt: null },
  ],
  activityLogs: [
    { id: "log_1", action: "task_created", entityType: "task", entityId: "task_001", userId: "user_mgr1", details: { taskTitle: "Guardian Pharmacy Reel" }, timestamp: "2025-05-02T10:00:00Z" },
    { id: "log_2", action: "status_updated", entityType: "task", entityId: "task_002", userId: "emp_2", details: { from: "production", to: "review" }, timestamp: "2025-05-06T11:00:00Z" },
    { id: "log_3", action: "feedback_added", entityType: "task", entityId: "task_002", userId: "client_2", details: { message: "Change slide 3 font" }, timestamp: "2025-05-06T13:00:00Z" },
  ],
  brandAssets: [
    { id: "asset_1", clientId: "client_1", companyId: "comp_1", name: "Guardian Pharmacy Brand Kit", type: "brand_kit", fileUrl: "", tags: ["logo", "colors", "fonts"], uploadedBy: "user_mgr1", createdAt: "2023-03-15T10:00:00Z" },
    { id: "asset_2", clientId: "client_5", companyId: "comp_1", name: "Premium Autoz Cinematic Pack", type: "video_template", fileUrl: "", tags: ["templates", "reels", "youtube"], uploadedBy: "user_mgr2", createdAt: "2023-01-28T10:00:00Z" },
  ],
  holidays: [
    { id: "hol_1", companyId: "comp_1", date: "2025-08-15", name: "Independence Day", type: "national" },
    { id: "hol_2", companyId: "comp_1", date: "2025-10-02", name: "Gandhi Jayanti", type: "national" },
    { id: "hol_3", companyId: "comp_1", date: "2025-11-12", name: "Diwali", type: "national" },
  ],
  availabilityRecords: [
    { id: "avail_1", employeeId: "emp_4", companyId: "comp_1", date: "2025-05-10", status: "half_day", reason: "Doctor appointment", approvedBy: "user_mgr2" },
    { id: "avail_2", employeeId: "emp_1", companyId: "comp_1", date: "2025-05-15", status: "leave", reason: "Personal work", approvedBy: "user_mgr1" },
  ],
  feedback: [
    { id: "fb_1", taskId: "task_002", clientId: "client_2", companyId: "comp_1", message: "Looks good! Change slide 3 font size please.", sentiment: "positive", revisionRequested: true, createdAt: "2025-05-06T13:00:00Z" },
    { id: "fb_2", taskId: "task_004", clientId: "client_6", companyId: "comp_1", message: "Perfect! Great work.", sentiment: "positive", revisionRequested: false, createdAt: "2025-05-07T09:00:00Z" },
  ],
  revisions: [
    { id: "rev_1", taskId: "task_002", companyId: "comp_1", round: 1, requestedBy: "client_2", notes: "Change slide 3 font size", assignedTo: "emp_2", status: "in_progress", dueDate: "2025-05-08", createdAt: "2025-05-06T14:00:00Z" },
  ],
};

export const ROLE_META = {
  superadmin: { label: "Super Admin", iconName: "shield", color: "#4F46E5", bg: "#EEF2FF", desc: "Full platform access" },
  manager: { label: "Manager", iconName: "target", color: "#E95A00", bg: "#FFF3E8", desc: "Team & project oversight" },
  accountmanager: { label: "Account Manager", iconName: "briefcase", color: "#059669", bg: "#ECFDF5", desc: "Client relationship lead" },
  employee: { label: "Employee", iconName: "pen", color: "#0EA5E9", bg: "#F0F9FF", desc: "Production & content work" },
  client: { label: "Client", iconName: "building", color: "#7C3AED", bg: "#F5F3FF", desc: "Review & approve content" },
};

export const SAMPLE_CREDENTIALS = [
  { username: "superadmin", password: "super123", role: "superadmin", userId: "user_super", name: "Admin User", companyId: "comp_1", displayRole: "Super Admin" },
  { username: "admin", password: "admin123", role: "manager", userId: "user_mgr2", name: "Riya Sharma", companyId: "comp_1", displayRole: "Manager" },
  { username: "client_abc", password: "client123", role: "client", userId: "client_1", name: "Guardian Pharmacy", companyId: "comp_1", displayRole: "Client" },
  { username: "rahul_ed", password: "rahul123", role: "employee", userId: "emp_1", name: "Rahul Chauhan", companyId: "comp_1", displayRole: "Employee" },
];

export const INDUSTRY_OPTIONS = [
  "Digital Marketing", "Advertising Agency", "Content Creation", "Social Media Agency",
  "PR & Communications", "Design Studio", "Video Production", "E-commerce",
  "Technology", "Healthcare", "Real Estate", "Education", "Finance", "Other",
];

export const TIMEZONE_OPTIONS = [
  "Asia/Kolkata (IST +5:30)", "Asia/Dubai (GST +4:00)", "Asia/Singapore (SGT +8:00)",
  "Europe/London (GMT +0:00)", "Europe/Paris (CET +1:00)", "America/New_York (EST -5:00)",
  "America/Los_Angeles (PST -8:00)", "Australia/Sydney (AEST +10:00)",
];

export const NAV_CONFIG = {
  superadmin: [
    {
      label: "Overview", items: [
        { id: "dashboard", label: "Company Overview", iconName: "dashboard" },
        { id: "workspace", label: "Workspace", iconName: "settings" },
      ]
    },
    {
      label: "User Management", items: [
        { id: "managers", label: "Managers", iconName: "shield" },
        { id: "employees_mgmt", label: "Team", iconName: "users" },
      ]
    },
    {
      label: "Clients & Content", items: [
        { id: "clients", label: "Client Management", iconName: "handshake" },
        { id: "shoots", label: "Shoot Management", iconName: "video" },
        { id: "planner", label: "Monthly Content Planner", iconName: "calendar" },
        { id: "tasks", label: "Agency Task Overview", iconName: "checklist" },
        { id: "calendar", label: "Content & Publishing Calendar", iconName: "calendar" },
      ]
    },
    {
      label: "Publishing", items: [
        { id: "publishing_queue", label: "Publishing Queue", iconName: "checklist" },
        { id: "publishing_calendar", label: "Publishing Calendar", iconName: "calendar" },
      ]
    },
    {
      label: "Operations", items: [
        { id: "approvals", label: "Approvals", iconName: "check", badge: "3" },
        { id: "assets", label: "Brand Assets", iconName: "image" },
      ]
    },
    {
      label: "Reports & Admin", items: [
        { id: "reports", label: "Reports", iconName: "barchart" },
        { id: "holidays", label: "Holiday Calendar", iconName: "gift" },
        { id: "announcements", label: "Announcements", iconName: "megaphone" },
        { id: "notifications", label: "Notifications", iconName: "bell", badge: "2" },
        { id: "activity", label: "Activity Log", iconName: "clock" },
        { id: "settings", label: "Settings", iconName: "settings" },
      ]
    },
  ],
  manager: [
    {
      label: "Overview", items: [
        { id: "dashboard", label: "Company Overview", iconName: "dashboard" },
      ]
    },
    {
      label: "User Management", items: [
        { id: "employees_mgmt", label: "Team", iconName: "users" },
      ]
    },
    {
      label: "Clients & Content", items: [
        { id: "clients", label: "Client Management", iconName: "handshake" },
        { id: "shoots", label: "Shoot Management", iconName: "video" },
        { id: "planner", label: "Monthly Content Planner", iconName: "calendar" },
        { id: "calendar", label: "Content & Publishing Calendar", iconName: "calendar" },
      ]
    },
    {
      label: "Publishing", items: [
        { id: "publishing_queue", label: "Publishing Queue", iconName: "checklist" },
        { id: "publishing_calendar", label: "Publishing Calendar", iconName: "calendar" },
      ]
    },
    {
      label: "Team", items: [
        { id: "tasks", label: "Agency Task Overview", iconName: "checklist", badge: "5" },
        { id: "workload", label: "Employee Workload", iconName: "barchart" },
        { id: "availability", label: "Employee Availability", iconName: "users" },
        { id: "approvals", label: "Approvals", iconName: "check", badge: "3" },
        { id: "assets", label: "Brand Assets", iconName: "image" },
      ]
    },
    {
      label: "Admin", items: [
        { id: "reports", label: "Reports", iconName: "barchart" },
        { id: "holidays", label: "Holiday Calendar", iconName: "gift" },
        { id: "announcements", label: "Announcements", iconName: "megaphone" },
        { id: "notifications", label: "Notifications", iconName: "bell", badge: "2" },
        { id: "activity", label: "Activity Log", iconName: "clock" },
      ]
    },
  ],
  accountmanager: [
    {
      label: "My Work", items: [
        { id: "dashboard", label: "My Client Overview", iconName: "dashboard" },
        { id: "clients", label: "Assigned Clients", iconName: "handshake" },
      ]
    },
    {
      label: "Content", items: [
        { id: "planner", label: "Monthly Planner", iconName: "calendar" },
        { id: "shoots", label: "Shoots", iconName: "video" },
        { id: "tasks", label: "Agency Task Overview", iconName: "checklist" },
        { id: "calendar", label: "Content Calendar", iconName: "calendar" },
        { id: "approvals", label: "Approvals", iconName: "check", badge: "3" },
      ]
    },
    {
      label: "Insights", items: [
        { id: "reports", label: "Reports", iconName: "barchart" },
        { id: "assets", label: "Brand Assets", iconName: "image" },
      ]
    },
    {
      label: "Info", items: [
        { id: "notifications", label: "Notifications", iconName: "bell", badge: "2" },
        { id: "announcements", label: "Announcements", iconName: "megaphone" },
      ]
    },
  ],
  employee: [
    {
      label: "My Work", items: [
        { id: "dashboard", label: "My Overview", iconName: "dashboard" },
        { id: "shoots", label: "My Shoots", iconName: "video" },
        { id: "tasks", label: "My Tasks", iconName: "checklist", badge: "4" },
        { id: "kanban", label: "Kanban Board", iconName: "kanban" },
        { id: "deadlines", label: "Deadlines", iconName: "clock" },
      ]
    },
    {
      label: "Info", items: [
        { id: "notifications", label: "Notifications", iconName: "bell", badge: "2" },
        { id: "announcements", label: "Announcements", iconName: "megaphone" },
      ]
    },
  ],
  client: [
    {
      label: "My Workspace", items: [
        { id: "dashboard", label: "My Overview", iconName: "dashboard" },
        { id: "calendar", label: "Content Calendar", iconName: "calendar" },
      ]
    },
    {
      label: "Reviews", items: [
        { id: "approvals", label: "Approvals", iconName: "check", badge: "2" },
      ]
    },
    {
      label: "Resources", items: [
        { id: "assets", label: "Brand Assets", iconName: "image" },
        { id: "announcements", label: "Announcements", iconName: "megaphone" },
      ]
    },
  ],
};

export const CLIENT_STATUSES = ["active", "paused", "completed", "on_hold"];
export const CLIENT_INDUSTRIES = ["Healthcare", "Consumer Services", "Construction & Real Estate", "Renewable Energy", "Automotive", "Organic & Wellness", "Automotive Tech", "Interior Design", "E-commerce", "Education", "Food & Beverage", "Technology", "Finance", "Real Estate", "Retail", "Fashion & Apparel", "Travel & Tourism", "Other"];
export const PLATFORM_OPTIONS = ["Instagram", "Facebook", "YouTube", "LinkedIn", "X/Twitter", "Google Business Profile", "Website/Blog", "Other"];
export const DELIVERABLE_TYPES = ["Video", "Reel/Short", "Static/Carousel", "Story"];


export const MAX_REVISIONS = 2;

export const AUDIENCE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "all_clients", label: "All Clients" },
  { value: "all_employees", label: "All Employees" },
  { value: "specific_client", label: "Specific Client" },
  { value: "specific_employee", label: "Specific Employee" },
  { value: "managers_only", label: "Managers Only" },
  { value: "account_managers", label: "Account Managers Only" },
];

export const DESIGNATION_OPTIONS = [
  "Video Editor", "Graphic Designer", "Content Writer", "Social Media Manager",
  "Account Manager", "Manager", "Strategist", "Photographer", "Motion Designer",
  "Creative Director", "Copywriter", "Reel Editor", "Thumbnail Designer",
  "Web Developer", "Team Lead", "UI/UX Designer", "SEO Specialist", "Other",
];

export const ACCESS_TYPES = [
  { value: "superadmin", label: "Super Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountmanager", label: "Account Manager" },
  { value: "employee", label: "Employee" },
];

export const ACTION_META = {
  task_created: { label: "Task Created", color: "#FF6A00", icon: "checklist" },
  task_updated: { label: "Task Updated", color: "#0EA5E9", icon: "pen" },
  approval_action: { label: "Approval Action", color: "#7C3AED", icon: "check" },
  client_approved: { label: "Client Approved", color: "#16A34A", icon: "check" },
  client_rejected: { label: "Changes Requested", color: "#DC2626", icon: "repeat" },
  task_status_updated: { label: "Status Updated", color: "#0EA5E9", icon: "repeat" },
  employee_created: { label: "Employee Added", color: "#059669", icon: "users" },
  employee_updated: { label: "Employee Updated", color: "#0EA5E9", icon: "users" },
  employee_deleted: { label: "Employee Removed", color: "#DC2626", icon: "users" },
  client_created: { label: "Client Created", color: "#FF6A00", icon: "handshake" },
  client_updated: { label: "Client Updated", color: "#0EA5E9", icon: "handshake" },
  client_deleted: { label: "Client Deleted", color: "#DC2626", icon: "handshake" },
  company_registered: { label: "Company Registered", color: "#7C3AED", icon: "building" },
  status_updated: { label: "Status Updated", color: "#0EA5E9", icon: "repeat" },
  feedback_added: { label: "Feedback Added", color: "#059669", icon: "chat" },
  announcement_sent: { label: "Announcement Sent", color: "#FF6A00", icon: "megaphone" },
  deadline_changed: { label: "Deadline Changed", color: "#F59E0B", icon: "clock" },
};
