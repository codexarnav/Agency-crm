// Monthly Content Planner Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, SearchBar, Modal,
} from "../shared/components";
import { getPlanner, savePlanner } from "../services/api";
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
  deadline: ["deadline", "due date"],
  status: ["status", "approval", "approval status"]
};

const PLANNER_FIELDS = [
  { value: "platform", label: "Platform" },
  { value: "postingDate", label: "Posting Date" },
  { value: "contentType", label: "Content Type" },
  { value: "description", label: "Description" },
  { value: "priority", label: "Priority" },
  { value: "assignedTo", label: "Assigned To" },
  { value: "deadline", label: "Deadline" },
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

  const client = clients.find(c => c.id === selClientId);

  const makeRow = (o = {}) => ({
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    clientId: selClientId, clientName: client?.name || "", companyId: "comp_1",
    platform: client?.platforms?.[0] || "Instagram", postingDate: "", day: "",
    contentType: "Reel", contentDescription: "", captionCopy: "", priority: "medium",
    assignedEmployeeId: "", assignedTo: "", assignmentType: "manual",
    internalDeadline: "", productionStatus: "todo", approvalStatus: "pending",
    publishingStatus: "not_scheduled", contentLink: "", managerNotes: "",
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    setImporting(true);
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        if (!jsonData || jsonData.length === 0) {
          showToast("The uploaded file is empty.", "warning");
          setImporting(false);
          return;
        }

        let headerRowIdx = 0;
        while (headerRowIdx < jsonData.length && 
               (!jsonData[headerRowIdx] || 
                jsonData[headerRowIdx].filter(x => x !== undefined && x !== null && String(x).trim() !== "").length === 0)) {
          headerRowIdx++;
        }

        if (headerRowIdx >= jsonData.length) {
          showToast("No valid columns or data found in the spreadsheet.", "warning");
          setImporting(false);
          return;
        }

        const headers = jsonData[headerRowIdx].map(h => h !== undefined && h !== null ? String(h).trim() : "");
        const rawRows = jsonData.slice(headerRowIdx + 1);
        const filteredRows = rawRows.filter(r => r && r.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ""));

        if (filteredRows.length === 0) {
          showToast("No data rows found below the header column.", "warning");
          setImporting(false);
          return;
        }

        const initialMapping = {};
        headers.forEach(h => {
          if (!h) return;
          initialMapping[h] = findMatchedField(h) || "";
        });

        setImportHeaders(headers);
        setImportRows(filteredRows);
        setMappings(initialMapping);
        setReviewModal(true);
      } catch (err) {
        showToast("Error reading spreadsheet: " + err.message, "danger");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateMapping = (header, field) => {
    setMappings(prev => ({ ...prev, [header]: field }));
  };

  const confirmExcelImport = () => {
    if (!importHeaders.length || !importRows.length) return;
    
    let addedCount = 0;
    const newPlannerRows = importRows.map(rowArr => {
      const r = {};
      r.platform = client?.platforms?.[0] || "Instagram";
      r.postingDate = "";
      r.day = "";
      r.contentType = "Reel";
      r.contentDescription = "";
      r.captionCopy = "";
      r.priority = "medium";
      r.assignedEmployeeId = "";
      r.assignedTo = "";
      r.assignmentType = "manual";
      r.internalDeadline = "";
      r.productionStatus = "todo";
      r.approvalStatus = "pending";
      r.publishingStatus = "not_scheduled";
      r.contentLink = "";
      r.managerNotes = "";
      r.clientFeedback = "";
      r.revisionCount = 0;
      r.maxRevisions = 2;

      importHeaders.forEach((h, colIdx) => {
        const field = mappings[h];
        if (!field) return;

        let val = rowArr[colIdx];
        if (val === undefined || val === null) {
          val = "";
        } else {
          val = String(val).trim();
        }

        if (field === "platform") {
          r.platform = val || r.platform;
        } else if (field === "postingDate") {
          const parsedDate = parseSpreadsheetDate(val);
          if (parsedDate) {
            r.postingDate = parsedDate;
            r.day = calcDayName(parsedDate);
          }
        } else if (field === "contentType") {
          r.contentType = val || r.contentType;
        } else if (field === "description") {
          r.contentDescription = val;
        } else if (field === "priority") {
          const normPrio = val.toLowerCase();
          if (["high", "medium", "low", "urgent"].includes(normPrio)) {
            r.priority = normPrio;
          } else {
            r.priority = "medium";
          }
        } else if (field === "assignedTo") {
          const emp = employees.find(e => {
            const name = (e.name || "").toLowerCase();
            const username = (e.username || "").toLowerCase();
            const v = val.toLowerCase();
            return name === v || username === v || name.includes(v) || v.includes(name);
          });
          if (emp) {
            r.assignedEmployeeId = emp.id;
            r.assignedTo = emp.name || emp.username || "";
          } else {
            r.assignedTo = val;
          }
        } else if (field === "deadline") {
          const parsedDeadline = parseSpreadsheetDate(val);
          r.internalDeadline = parsedDeadline || val;
        } else if (field === "status") {
          const normVal = val.toLowerCase();
          if (normVal.includes("todo") || normVal === "to do") r.productionStatus = "todo";
          else if (normVal.includes("progress")) r.productionStatus = "in_progress";
          else if (normVal.includes("review")) r.productionStatus = "ready_for_review";
          else if (normVal.includes("done") || normVal.includes("complete")) r.productionStatus = "completed";
        }
      });

      if (r.postingDate && !r.internalDeadline) {
        r.internalDeadline = calcInternalDeadline(r.postingDate, r.contentType, r.priority);
      }

      addedCount++;
      return makeRow(r);
    });

    setRows(prev => [...prev, ...newPlannerRows]);
    setReviewModal(false);
    showToast(`Imported ${addedCount} content items successfully. Review before saving!`, "success");
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Platform", "Posting Date", "Day", "Content Type", "Description", "Priority", "Assigned To", "Deadline", "Status"],
      ["Instagram", "2026-06-12", "Friday", "Reel", "Brand awareness Reel description", "High", "", "2026-06-11", "Todo"],
      ["YouTube", "2026-06-15", "Monday", "Short", "Product showcase description", "Medium", "", "2026-06-14", "Todo"]
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
                {["Platform", "Posting Date", "Day", "Content Type", "Description", "Priority", "Assigned To", "Deadline", "Status", ""].map(h => (
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
                    <select value={row.platform} onChange={e => upd(row.id, "platform", e.target.value)} style={{ width: "100%", padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", cursor: "pointer", minWidth: 100 }} onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}>
                      {PLATFORMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "7px 8px" }}>
                    <input type="date" value={row.postingDate} onChange={e => upd(row.id, "postingDate", e.target.value)} style={{ width: "100%", padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", minWidth: 110 }} onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }} />
                  </td>
                  <td style={{ padding: "7px 8px" }}><span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{row.day || " - "}</span></td>
                  <td style={{ padding: "7px 8px" }}>
                    <select value={row.contentType} onChange={e => upd(row.id, "contentType", e.target.value)} style={{ padding: "5px 6px", border: "1.5px solid transparent", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "transparent", outline: "none", cursor: "pointer", minWidth: 110 }} onFocus={e => { e.target.style.borderColor = "#FF6A00"; e.target.style.background = "#fff"; }} onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }}>
                      {CONTENT_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
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
                  <td style={{ padding: "7px 8px" }}><span style={{ fontSize: 11.5, color: row.internalDeadline ? "#374151" : "#9CA3AF" }}>{row.internalDeadline || " - "}</span></td>
                  <td style={{ padding: "7px 8px" }}><ProdMBadge s={row.productionStatus} /></td>
                  <td style={{ padding: "7px 8px" }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => { setEditRowIdx(idx); setTaskModal(true); }} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px 5px", borderRadius: 5, fontSize: 13, lineHeight: 1 }}>edit</button>
                      <button onClick={() => { const dup = { ...row, id: `r_${Date.now()}` }; const n = [...rows]; n.splice(idx + 1, 0, dup); setRows(n); }} title="Duplicate" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px 5px", borderRadius: 5, fontSize: 14, lineHeight: 1 }}>+</button>
                      <button onClick={() => { setRows(p => p.filter(r => r.id !== row.id)); setSelected(p => { const n = new Set(p); n.delete(row.id); return n; }); }} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "3px 5px", borderRadius: 5, fontSize: 14, lineHeight: 1 }}>x</button>
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

      {/* Excel Review & Mapping Modal */}
      {reviewModal && (
        <Modal
          open={reviewModal}
          onClose={() => setReviewModal(false)}
          title="Review Spreadsheet Import"
          size="lg"
          footer={
            <div style={{ display: "flex", width: "100%", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setReviewModal(false)}>Cancel</Btn>
              <Btn onClick={confirmExcelImport}>Confirm Import</Btn>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              We've analyzed your spreadsheet headers. Review the auto-detected mapping and adjust manually if needed.
            </p>

            {/* Match Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Matched Columns</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#15803D" }}>
                  {Object.entries(mappings).filter(([_, f]) => f !== "").length}
                </span>
              </div>
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>Missing Planner Fields</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#D97706" }}>
                  {PLANNER_FIELDS.filter(f => !Object.values(mappings).includes(f.value)).length}
                </span>
              </div>
              <div style={{ background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase" }}>Ignored / Extra</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#374151" }}>
                  {Object.entries(mappings).filter(([_, f]) => f === "").length}
                </span>
              </div>
            </div>

            {/* Mappings Configurations */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--dark)", marginBottom: 8 }}>Column Mapping Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "240px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "#FAFAFA" }}>
                {importHeaders.map((h, idx) => {
                  if (!h) return null;
                  const currentVal = mappings[h] || "";
                  return (
                    <div key={h + "_" + idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fff", border: "1px solid var(--border)", borderRadius: 6 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)" }}>{h}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>Example: "{importRows[0]?.[idx] !== undefined ? String(importRows[0][idx]).slice(0, 30) : "-"}"</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>maps to</span>
                        <select
                          value={currentVal}
                          onChange={e => updateMapping(h, e.target.value)}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid var(--border)", fontSize: 12.5, outline: "none", background: currentVal ? "var(--light-orange)" : "#fff", color: currentVal ? "var(--primary)" : "var(--dark)", fontWeight: currentVal ? 700 : 500 }}
                        >
                          <option value="">Do not map (Ignore)</option>
                          {PLANNER_FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List Matched Details */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Summary of Mapping Status</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "100px", overflowY: "auto", fontSize: 12.5 }}>
                {Object.entries(mappings).map(([h, field]) => {
                  if (!field) return null;
                  const fieldLabel = PLANNER_FIELDS.find(f => f.value === field)?.label;
                  return (
                    <div key={h} style={{ color: "#16A34A", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                      <span>✓</span>
                      <span><strong>{fieldLabel}</strong> ← matched from "{h}"</span>
                    </div>
                  );
                })}
                {PLANNER_FIELDS.filter(f => !Object.values(mappings).includes(f.value)).map(f => (
                  <div key={f.value} style={{ color: "#D97706", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                    <span>⚠</span>
                    <span><strong>{f.label}</strong> not found (will be blank)</span>
                  </div>
                ))}
                {Object.entries(mappings).filter(([_, f]) => f === "").map(([h]) => (
                  <div key={h} style={{ color: "#4B5563", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                    <span>•</span>
                    <span>Additional column detected & ignored: "{h}"</span>
                  </div>
                ))}
              </div>
            </div>

            <span style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "right", marginTop: 4 }}>
              Rows to import: <strong>{importRows.length}</strong>
            </span>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -- Content Calendar Page -- */

export default MonthlyPlannerPage;
