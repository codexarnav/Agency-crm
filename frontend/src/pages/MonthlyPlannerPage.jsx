// Monthly Content Planner Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar, Modal,
} from "../shared/components";
import { getPlanner, savePlanner, importPlannerExcel } from "../services/api";
import {
  TaskDetailDrawer, TaskCreateModal,
  calcDayName, calcInternalDeadline, doAIAssign,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  CONTENT_TYPES_LIST, PLATFORMS_LIST, PRIORITIES_LIST,
  PROD_STATUSES_LIST, APPROV_STATUSES_LIST, PUB_STATUSES_LIST,
  PROD_LABELS_MAP, APPROV_LABELS_MAP, PUB_LABELS_MAP, PRIO_LABELS_MAP,
} from "../shared/taskConstants";
import * as XLSX from "xlsx";

const FIELD_ALIASES = {
  platform: ["platform", "channel", "social platform", "social media"],
  postingDate: ["posting date", "date", "publish date", "post date", "schedule date", "publish on"],
  contentType: ["content type", "type", "format", "post type"],
  description: ["description", "caption", "content", "idea", "creative brief", "brief", "copy"],
  assignedTo: ["assigned to", "owner", "employee", "team", "assignee", "responsible"],
  priority: ["priority", "importance"],
  deadline: ["deadline", "due date", "days remaining", "days left"],
  status: ["status", "approval", "approval status"]
};

const PLANNER_FIELDS = [
  { value: "platform", label: "Platform" },
  { value: "postingDate", label: "Posting Date" },
  { value: "contentType", label: "Content Type" },
  { value: "description", label: "Description" },
  { value: "priority", label: "Priority" },
  { value: "assignedTo", label: "Assigned To" },
  { value: "deadline", label: "Days Remaining" },
  { value: "status", label: "Status" }
];

function normalizeHeader(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchedField(header) {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const normAliases = aliases.map(normalizeHeader);
    if (normAliases.includes(norm)) {
      return field;
    }
  }
  return null;
}

function parseSpreadsheetDate(val) {
  if (val === undefined || val === null || val === "") return null;
  
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  if (typeof val === "number" || (!isNaN(val) && !isNaN(parseFloat(val)))) {
    const serial = parseFloat(val);
    const utcDays = Math.floor(serial - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const dm = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dm) {
    const p1 = parseInt(dm[1]);
    const p2 = parseInt(dm[2]);
    const year = parseInt(dm[3]);
    let day = p1;
    let month = p2;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      day = p2;
      month = p1;
    } else {
      day = p1;
      month = p2;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

const calcDaysRemaining = (deadlineStr) => {
  if (!deadlineStr) return { text: " - ", color: "#9CA3AF", fontWeight: "400" };
  const deadlineDate = new Date(deadlineStr);
  if (isNaN(deadlineDate.getTime())) return { text: deadlineStr, color: "#374151", fontWeight: "400" };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { text: "Today", color: "#D97706", fontWeight: "600" };
  if (diffDays === 1) return { text: "1 day remaining", color: "#D97706", fontWeight: "600" };
  if (diffDays > 1) return { text: `${diffDays} days remaining`, color: "#059669", fontWeight: "600" };
  return { text: `${Math.abs(diffDays)} days overdue`, color: "#DC2626", fontWeight: "600" };
};

const DateInputCell = ({ value, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Format YYYY-MM-DD to "Dth Month"
  const getDisplayValue = (val) => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = months[monthIdx] || "";
      
      let suffix = "th";
      if (day < 11 || day > 13) {
        switch (day % 10) {
          case 1: suffix = "st"; break;
          case 2: suffix = "nd"; break;
          case 3: suffix = "rd"; break;
        }
      }
      return `${day}${suffix} ${monthName}`;
    }
    return val;
  };

  const showHighlight = isFocused || isHovered;

  return (
    <div 
      style={{ position: "relative", width: "100%", minWidth: 125 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        type={isFocused ? "date" : "text"}
        value={isFocused ? value : getDisplayValue(value)}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Select date"
        style={{
          width: "100%",
          padding: "5px 24px 5px 6px",
          border: `1.5px solid ${showHighlight ? "#FF6A00" : "transparent"}`,
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "'DM Sans',sans-serif",
          background: showHighlight ? "#fff" : "transparent",
          outline: "none",
          boxSizing: "border-box"
        }}
      />
      {!isFocused && (
        <span 
          style={{ 
            position: "absolute", 
            right: 8, 
            top: "50%", 
            transform: "translateY(-50%)", 
            pointerEvents: "none", 
            fontSize: 12,
            color: "var(--muted)",
            opacity: 0.6
          }}
        >
          📅
        </span>
      )}
    </div>
  );
};

function MonthlyPlannerPage() {
  const { clients, employees, session, showToast, refreshTasks } = useApp();
  const [selClientId, setSelClientId] = useState(clients[0]?.id || "");
  const [selMonth, setSelMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [editRowIdx, setEditRowIdx] = useState(null);
  const [taskModal, setTaskModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkEmp, setBulkEmp] = useState("");

  const [reviewModal, setReviewModal] = useState(false);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importRows, setImportRows] = useState([]);
  const [mappings, setMappings] = useState({});
  const [aiPreviewModal, setAiPreviewModal] = useState(false);
  const [aiImportRows, setAiImportRows] = useState([]);
  const [aiWarnings, setAiWarnings] = useState([]);

  const client = clients.find(c => c.id === selClientId);

  const makeRow = (o = {}) => ({
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    clientId: selClientId, clientName: client?.name || "", companyId: "comp_1",
    platform: client?.platforms?.[0] || "Instagram", postingDate: "", day: "",
    contentType: "Reel", contentDescription: "", captionCopy: "", priority: "medium",
    assignedEmployeeId: "", assignedTo: "", assignmentType: "manual",
    internalDeadline: "", productionStatus: "todo", approvalStatus: "pending",
    publishingStatus: "not_scheduled", contentLink: "", postLink: "", managerNotes: "",
    clientFeedback: "", revisionCount: 0, maxRevisions: 2,
    createdBy: session?.id || "user", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...o,
  });

  const upd = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value };
      if (["postingDate", "contentType", "priority"].includes(field)) {
        u.day = calcDayName(u.postingDate);
        u.internalDeadline = calcInternalDeadline(u.postingDate, u.contentType, u.priority);
      }
      if (field === "assignedEmployeeId") {
        const e = employees.find(x => x.id === value);
        u.assignedTo = e?.name || "";
      }
      return u;
    }));
  };

  const toggleSel = id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selAll = () => setSelected(rows.length === selected.size ? new Set() : new Set(rows.map(r => r.id)));

  const triggerExcelUpload = () => {
    if (!selClientId) { showToast("Select a client first.", "warning"); return; }
    const fileEl = document.getElementById("excel-file-uploader");
    if (fileEl) fileEl.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selClientId) {
      showToast("Select a client first.", "warning");
      return;
    }

    const [year, month] = selMonth.split("-");
    setImporting(true);

    try {
      const res = await importPlannerExcel(file, selClientId, month, year);
      if (res.success) {
        setAiImportRows(res.rows || []);
        setAiWarnings(res.warnings || []);
        setAiPreviewModal(true);
        showToast(`AI parsed ${res.rows?.length || 0} rows. Review them before importing!`, "success");
      } else {
        showToast(res.message || "Failed to parse spreadsheet.", "danger");
      }
    } catch (err) {
      showToast(err.message || "Error importing spreadsheet: " + err.message, "danger");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const confirmExcelImport = () => {
    if (!aiImportRows.length) return;

    let addedCount = 0;
    const newPlannerRows = aiImportRows.map(row => {
      let assignedEmployeeId = "";
      let assignedTo = row.assignedTo || "";
      if (assignedTo) {
        const emp = employees.find(e => {
          const name = (e.name || "").toLowerCase();
          const username = (e.username || "").toLowerCase();
          const v = assignedTo.toLowerCase();
          return name === v || username === v || name.includes(v) || v.includes(name);
        });
        if (emp) {
          assignedEmployeeId = emp.id;
          assignedTo = emp.name || emp.username || "";
        }
      }

      addedCount++;
      return makeRow({
        platform: row.platform || client?.platforms?.[0] || "Instagram",
        postingDate: row.postingDate || "",
        day: row.day || "",
        contentType: row.contentType || "Reel",
        contentDescription: row.description || "",
        captionCopy: row.captionCopy || "",
        contentLink: row.fileUrl || "",
        postLink: row.postLink || "",
        clientFeedback: row.feedback || "",
        priority: ["low", "medium", "high", "urgent"].includes(row.priority?.toLowerCase()) ? row.priority.toLowerCase() : "medium",
        assignedEmployeeId,
        assignedTo,
        productionStatus: ["todo", "in_progress", "ready_for_review", "changes_required", "blocked", "completed"].includes(row.status?.toLowerCase()) ? row.status.toLowerCase() : "todo",
        confidence: row.confidence
      });
    });

    setRows(prev => [...prev, ...newPlannerRows]);
    setAiPreviewModal(false);
    showToast(`Imported ${addedCount} content items successfully. Review before saving!`, "success");
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "Day", "Content", "Type", "Content Description", "Platform", "Assigned To", "Priority", "Status", "File", "Thumbnail", "Feedback", "Post Link"],
      ["2026-06-02", "Monday", "Brand awareness Reel", "Reel", "Hook: Why most brands fail at social media → cut to: 3 things we do differently", "Instagram", "", "High", "Todo", "", "", "", ""],
      ["2026-06-04", "Wednesday", "Product showcase", "Carousel", "Swipe through our top 5 features — designed to convert", "Instagram", "", "Medium", "Todo", "", "", "", ""]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${client?.name || "Client"}_Content_Plan_Template.xlsx`);
    showToast("Template downloaded successfully.", "success");
  };

  const aiAssignAll = () => {
    let count = 0;
    setRows(prev => prev.map(r => {
      if (r.assignedEmployeeId) return r;
      const emp = doAIAssign(r.contentType, employees);
      if (!emp) return r;
      count++;
      return { ...r, assignedEmployeeId: emp.id, assignedTo: emp.name, assignmentType: "ai_assigned" };
    }));
    showToast(`AI assigned ${count} unassigned tasks.`, "success");
  };

  const bulkApply = () => {
    if (bulkStatus) { setRows(p => p.map(r => selected.has(r.id) ? { ...r, productionStatus: bulkStatus } : r)); showToast(`Updated ${selected.size} rows to "${PROD_LABELS_MAP[bulkStatus]}"`, "success"); }
    if (bulkEmp) { const e = employees.find(x => x.id === bulkEmp); setRows(p => p.map(r => selected.has(r.id) ? { ...r, assignedEmployeeId: bulkEmp, assignedTo: e?.name || "", assignmentType: "manual" } : r)); showToast(`Bulk assigned ${selected.size} tasks.`, "success"); }
  };

  const bulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selected.size} selected items?`)) {
      setRows(prev => prev.filter(r => !selected.has(r.id)));
      setSelected(new Set());
      showToast("Deleted selected items. Click 'Save Plan' to sync with database.", "info");
    }
  };

  useEffect(() => {
    const fetchPlan = async () => {
      if (!selClientId || !selMonth) return;
      try {
        const res = await getPlanner(selClientId, selMonth);
        setRows(res.data || []);
      } catch (err) {
        showToast(err.message || "Failed to load planner data", "danger");
      }
    };
    fetchPlan();
  }, [selClientId, selMonth]);

  const savePlan = async () => {
    if (!rows.length) { showToast("Add at least one row.", "warning"); return; }
    setSaving(true);
    try {
      const cleanedTasks = rows.map(r => {
        const item = { ...r };
        if (item.id && item.id.startsWith("r_")) {
          delete item.id;
        }
        return item;
      });

      const res = await savePlanner({
        clientId: selClientId,
        planMonth: selMonth,
        tasks: cleanedTasks
      });

      refreshTasks();
      setRows(res.data || []);
      showToast(`Plan saved - ${res.data.length} tasks synced in database.`, "success");
    } catch (err) {
      showToast(err.message || "Failed to save plan", "danger");
    } finally {
      setSaving(false);
    }
  };

  const approved = rows.filter(r => ["client_approved", "final_approved"].includes(r.approvalStatus)).length;
  const pct = rows.length ? Math.round((approved / rows.length) * 100) : 0;

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Monthly Content Planner</h1>
          <p className="page-subtitle">Plan, assign, and save monthly content in a spreadsheet-like view.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <SvgIcon name="download" size={13} /> Download Template
          </Btn>
          <Btn variant="outline" size="sm" onClick={triggerExcelUpload} disabled={importing}>
            <SvgIcon name="upload" size={13} /> {importing ? "Uploading..." : "Upload Excel"}
          </Btn>
          <Btn variant="outline" size="sm" style={{ borderColor: "#7C3AED", color: "#7C3AED" }} onClick={aiAssignAll}>
            <SvgIcon name="target" size={13} color="#7C3AED" /> AI Auto-Assign All
          </Btn>
          <Btn size="sm" onClick={savePlan} disabled={saving}>{saving ? "Saving..." : "Save Plan"}</Btn>
        </div>
      </div>

      {/* Client + month + progress */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 180px" }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Client</label>
            <select className="form-input" value={selClientId} onChange={e => setSelClientId(e.target.value)} style={{ fontSize: 13.5 }}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>Month</label>
            <input type="month" className="form-input" value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ fontSize: 13.5 }} />
          </div>
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Progress  -  {rows.length} planned</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, background: "#E5E7EB", borderRadius: 99, overflow: "hidden", height: 8 }}>
                <div style={{ width: `${pct}%`, height: 8, background: "#FF6A00", borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#FF6A00", whiteSpace: "nowrap" }}>{approved}/{rows.length} approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{ background: "var(--light-orange)", border: "1.5px solid rgba(255,106,0,0.25)", borderRadius: 10, padding: "9px 14px", marginBottom: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>{selected.size} selected</span>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ padding: "5px 9px", borderRadius: 7, border: "1.5px solid var(--border)", fontSize: 12.5, outline: "none" }}>
              <option value="">Update status...</option>
              {PROD_STATUSES_LIST.map(s => <option key={s} value={s}>{PROD_LABELS_MAP[s]}</option>)}
            </select>
            <select value={bulkEmp} onChange={e => setBulkEmp(e.target.value)} style={{ padding: "5px 9px", borderRadius: 7, border: "1.5px solid var(--border)", fontSize: 12.5, outline: "none" }}>
              <option value="">Bulk assign...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <Btn variant="outline" size="sm" onClick={bulkApply}>Apply</Btn>
          </div>
          <Btn variant="danger" size="sm" onClick={bulkDelete}>Delete Selected</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Btn>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                <th style={{ padding: "9px 10px", width: 36 }}><input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={selAll} /></th>
                <th style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", textAlign: "left", whiteSpace: "nowrap" }}>#</th>
                {["Platform", "Posting Date", "Day", "Content Type", "Description", "Priority", "Assigned To", "Days Remaining", "Status", "Post Link", ""].map(h => (
                  <th key={h} style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 13.5 }}>No rows yet. Click <strong>+ Add Row</strong> or <strong>Upload Excel</strong>.</td></tr>
              ) : rows.map((row, idx) => (
                <tr key={row.id} style={{ background: selected.has(row.id) ? "#FFF8F0" : "", animation: "fadeIn 0.2s ease" }} onMouseEnter={e => { if (!selected.has(row.id)) e.currentTarget.style.background = "#FAFAFA"; }} onMouseLeave={e => { if (!selected.has(row.id)) e.currentTarget.style.background = ""; }}>
                  <td style={{ padding: "7px 10px" }}><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSel(row.id)} /></td>
                  <td style={{ padding: "7px 10px", fontSize: 11.5, color: "#9CA3AF", textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ padding: "7px 8px" }}>
                    {PLATFORMS_LIST.includes(row.platform) ? (
                      <select
                        value={row.platform}
                        onChange={e => {
                          if (e.target.value === "Others") {
                            upd(row.id, "platform", "");
                          } else {
                            upd(row.id, "platform", e.target.value);
                          }
                        }}
                        style={{ width: "100%", padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", cursor: "pointer", minWidth: 100 }}
                        onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }}
                        onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}
                      >
                        {PLATFORMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="Others">Others</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "center", minWidth: 100 }}>
                        <input
                          value={row.platform}
                          onChange={e => upd(row.id, "platform", e.target.value)}
                          placeholder="Type platform..."
                          style={{ width: "100%", padding: "5px 6px", border: "1.5px solid #FF6A00", borderRadius: 6, fontSize: 12, background: "#fff", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={() => upd(row.id, "platform", PLATFORMS_LIST[0])}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 10, padding: 2 }}
                          title="Select default"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <DateInputCell value={row.postingDate} onChange={e => upd(row.id, "postingDate", e.target.value)} />
                  </td>
                  <td style={{ padding: "7px 8px" }}><span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{row.day || " - "}</span></td>
                  <td style={{ padding: "7px 8px" }}>
                    {CONTENT_TYPES_LIST.includes(row.contentType) ? (
                      <select
                        value={row.contentType}
                        onChange={e => {
                          if (e.target.value === "Others") {
                            upd(row.id, "contentType", "");
                          } else {
                            upd(row.id, "contentType", e.target.value);
                          }
                        }}
                        style={{ padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", cursor: "pointer", minWidth: 110 }}
                        onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }}
                        onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}
                      >
                        {CONTENT_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                        <option value="Others">Others</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "center", minWidth: 110 }}>
                        <input
                          value={row.contentType}
                          onChange={e => upd(row.id, "contentType", e.target.value)}
                          placeholder="Type content type..."
                          style={{ width: "100%", padding: "5px 6px", border: "1.5px solid #FF6A00", borderRadius: 6, fontSize: 12, background: "#fff", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={() => upd(row.id, "contentType", CONTENT_TYPES_LIST[0])}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 10, padding: 2 }}
                          title="Select default"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <input value={row.contentDescription} onChange={e => upd(row.id, "contentDescription", e.target.value)} placeholder="Describe content..." style={{ width: "100%", minWidth: 180, padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none" }} onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }} />
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <select value={row.priority} onChange={e => upd(row.id, "priority", e.target.value)} style={{ padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", cursor: "pointer" }} onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}>
                      {PRIORITIES_LIST.map(p => <option key={p} value={p}>{PRIO_LABELS_MAP[p]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 120 }}>
                      <select value={row.assignedEmployeeId} onChange={e => upd(row.id, "assignedEmployeeId", e.target.value)} style={{ flex: 1, padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", cursor: "pointer", minWidth: 80 }} onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}>
                        <option value=""> - </option>
                        {employees.map(e => <option key={e.id} value={e.id}>{(e.name || e.username || "").split(" ")[0]}</option>)}
                      </select>
                      {row.assignmentType === "ai_assigned" && <span style={{ fontSize: 10, background: "#EDE9FE", color: "#5B21B6", padding: "1px 5px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>AI</span>}
                    </div>
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    {(() => {
                      const info = calcDaysRemaining(row.internalDeadline);
                      return (
                        <span style={{ fontSize: 11.5, color: info.color, fontWeight: info.fontWeight }}>
                          {info.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "7px 8px" }}><ProdMBadge s={row.productionStatus} /></td>
                  <td style={{ padding: "7px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input 
                        value={row.postLink || ""} 
                        onChange={e => upd(row.id, "postLink", e.target.value)} 
                        placeholder="Live link..." 
                        style={{ 
                          width: "100%", 
                          minWidth: 120, 
                          padding: "5px 6px", 
                          border: "1.5px solid transparent", 
                          borderRadius: 6, 
                          fontSize: 12, 
                          fontFamily: "'DM Sans',sans-serif", 
                          background: "transparent", 
                          outline: "none" 
                        }} 
                        onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} 
                        onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }} 
                      />
                      {row.postLink && (row.postLink.startsWith("http://") || row.postLink.startsWith("https://")) && (
                        <a 
                          href={row.postLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ fontSize: 13, textDecoration: "none", color: "#FF6A00" }} 
                          title="Open Live Post"
                        >
                          🔗
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => { const dup = { ...row, id: `r_${Date.now()}` }; const n = [...rows]; n.splice(idx + 1, 0, dup); setRows(n); }} title="Duplicate" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px 5px", borderRadius: 5, fontSize: 14, lineHeight: 1 }}>+</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "9px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}>
          <Btn variant="outline" size="sm" onClick={() => setRows(p => [...p, makeRow()])}>+ Add Row</Btn>
          <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: "auto" }}>{rows.length} rows . {selected.size} selected</span>
        </div>
      </div>

      {/* Edit row modal */}
      {taskModal && editRowIdx !== null && rows[editRowIdx] && (
        <TaskCreateModal open={taskModal} onClose={() => { setTaskModal(false); setEditRowIdx(null); }} defaultClientId={selClientId} />
      )}

      {/* Hidden file input */}
      <input
        type="file"
        id="excel-file-uploader"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* AI Preview Modal */}
      {aiPreviewModal && (
        <Modal
          open={aiPreviewModal}
          onClose={() => setAiPreviewModal(false)}
          title="Review AI Spreadsheet Import"
          size="lg"
          footer={
            <div style={{ display: "flex", width: "100%", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setAiPreviewModal(false)}>Cancel</Btn>
              <Btn onClick={confirmExcelImport}>Import Rows</Btn>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Gemini has intelligently mapped the columns and extracted content calendar items. Review the preview below before adding them to your planner.
            </p>

            {/* Warnings Alert */}
            {aiWarnings.length > 0 && (
              <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Validation Warnings & Skipped Rows</span>
                <div style={{ maxHeight: 90, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {aiWarnings.map((w, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: "#D97706", fontWeight: 500 }}>
                      • {w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Day</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Platform</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Type</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Content</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Caption / Brief</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Assigned To</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Post Link</th>
                    <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", textAlign: "center" }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {aiImportRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                        No valid content rows extracted.
                      </td>
                    </tr>
                  ) : (
                    aiImportRows.map((row, idx) => {
                      const score = typeof row.confidence === "number" ? row.confidence : 0.95;
                      const pct = Math.round(score * 100);
                      let confBg = "#ECFDF5";
                      let confColor = "#047857";
                      if (score < 0.7) {
                        confBg = "#FEF2F2";
                        confColor = "#B91C1C";
                      } else if (score < 0.9) {
                        confBg = "#FFFBEB";
                        confColor = "#B45309";
                      }

                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.postingDate || " - "}</td>
                          <td style={{ padding: "8px 10px" }}>{row.day || " - "}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: 11.5, color: "var(--primary)", fontWeight: 700 }}>{row.platform || "Instagram"}</span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ background: "#EFF6FF", color: "#1D4ED8", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                              {row.contentType || "Reel"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.description}>
                            {row.description}
                          </td>
                          <td style={{ padding: "8px 10px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "#6B7280" }} title={row.captionCopy}>
                            {row.captionCopy || <span style={{ color: "#D1D5DB" }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 10px" }}>{row.assignedTo || " - "}</td>
                          <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{row.status || "todo"}</td>
                          <td style={{ padding: "8px 10px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.postLink}>
                            {row.postLink || <span style={{ color: "#D1D5DB" }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <span style={{ background: confBg, color: confColor, padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Total rows to import: <strong>{aiImportRows.length}</strong>
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -- Content Calendar Page -- */

export default MonthlyPlannerPage;
