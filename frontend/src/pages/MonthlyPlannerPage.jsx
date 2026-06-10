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

  const importSample = () => {
    if (!selClientId) { showToast("Select a client first.", "warning"); return; }
    setImporting(true);
    setTimeout(() => {
      const [yr, mo] = selMonth.split("-").map(Number);
      const pad = n => String(n).padStart(2, "0");
      const sample = [
        { contentType: "Reel", platform: "Instagram", contentDescription: "Brand awareness Reel - 30 sec intro", priority: "high", postingDate: `${yr}-${pad(mo)}-05` },
        { contentType: "Carousel", platform: "Instagram", contentDescription: "5-slide product showcase carousel", priority: "medium", postingDate: `${yr}-${pad(mo)}-08` },
        { contentType: "Story", platform: "Instagram", contentDescription: "Behind-the-scenes story series", priority: "low", postingDate: `${yr}-${pad(mo)}-10` },
        { contentType: "Static Post", platform: "Facebook", contentDescription: "Offer announcement graphic", priority: "medium", postingDate: `${yr}-${pad(mo)}-13` },
        { contentType: "Short", platform: "YouTube", contentDescription: "Product spotlight short video", priority: "medium", postingDate: `${yr}-${pad(mo)}-16` },
        { contentType: "Caption", platform: "Instagram", contentDescription: "Motivational caption for week 3", priority: "low", postingDate: `${yr}-${pad(mo)}-19` },
        { contentType: "Reel", platform: "Instagram", contentDescription: "Client testimonial Reel", priority: "high", postingDate: `${yr}-${pad(mo)}-22` },
        { contentType: "Carousel", platform: "LinkedIn", contentDescription: "Industry insights carousel", priority: "medium", postingDate: `${yr}-${pad(mo)}-25` },
      ].map(r => makeRow({ ...r, day: calcDayName(r.postingDate), internalDeadline: calcInternalDeadline(r.postingDate, r.contentType, r.priority) }));
      setRows(sample);
      setImporting(false);
      showToast("Sample plan imported  -  8 content ideas loaded.", "success");
    }, 600);
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
          <Btn variant="outline" size="sm" onClick={importSample} disabled={importing}>{importing ? "Importing..." : "Import Sample"}</Btn>
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
                <tr><td colSpan={12} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: 13.5 }}>No rows yet. Click <strong>+ Add Row</strong> or <strong>Import Sample</strong>.</td></tr>
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
    </div>
  );
}

/* -- Content Calendar Page -- */

export default MonthlyPlannerPage;
