// Employee Availability Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, Avatar, StatusBadge,
  SearchBar, FilterBar,
} from "../shared/components";
import {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability
} from "../services/api";

const AVAIL_STATUSES = [
  { value: "available", label: "Available", color: "#16A34A", bg: "#DCFCE7" },
  { value: "on_leave", label: "On Leave", color: "#6B7280", bg: "#F3F4F6" },
  { value: "half_day", label: "Half Day", color: "#F59E0B", bg: "#FEF9C3" },
  { value: "busy", label: "Busy", color: "#0EA5E9", bg: "#DBEAFE" },
  { value: "overloaded", label: "Overloaded", color: "#DC2626", bg: "#FEE2E2" },
  { value: "not_available", label: "Not Available", color: "#6B7280", bg: "#F3F4F6" },
];

function availMeta(s) {
  const val = s ? s.toLowerCase() : "available";
  return AVAIL_STATUSES.find(x => x.value === val) || AVAIL_STATUSES[0];
}

function StatMini({ label, value, color }) {
  return (
    <div className="stat-card" style={{ padding: "12px 16px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function EmployeeAvailabilityPage() {
  const { employees, session, showToast, tasks } = useApp();
  const canManage = ["superadmin", "manager"].includes(session?.role || "");

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const today = new Date();
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [view, setView] = useState("calendar");
  const [form, setForm] = useState({ employeeId: "", date: "", status: "on_leave", reason: "", notes: "" });

  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = fmt(today);

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const res = await getAvailability();
      // Map returned database date objects/strings to yyyy-mm-dd
      const list = (res.data || []).map(r => ({
        ...r,
        date: r.date ? new Date(r.date).toISOString().split("T")[0] : ""
      }));
      setRecords(list);
    } catch (err) {
      console.error(err);
      showToast("Failed to load availability records", "danger");
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const saveRecord = async () => {
    if (!form.employeeId || !form.date) { showToast("Employee and date are required.", "warning"); return; }
    const isEdit = !!editTarget;
    try {
      const payload = {
        employeeId: form.employeeId,
        date: form.date,
        status: form.status,
        reason: form.reason || "",
        notes: form.notes || ""
      };
      if (isEdit) {
        await updateAvailability(editTarget.id, payload);
      } else {
        await createAvailability(payload);
      }
      await fetchRecords();
      showToast(`Availability record ${isEdit ? "updated" : "added"}.`, "success");
      setModalOpen(false);
      setEditTarget(null);
      setForm({ employeeId: "", date: todayStr, status: "on_leave", reason: "", notes: "" });
    } catch (err) {
      showToast(err.message || "Failed to save record", "danger");
    }
  };

  const deleteRecord = async (id) => {
    try {
      await deleteAvailability(id);
      await fetchRecords();
      showToast("Availability record removed.", "success");
    } catch (err) {
      showToast(err.message || "Failed to remove record", "danger");
    }
  };

  // Build calendar
  const first = new Date(curYear, curMonth, 1);
  const last = new Date(curYear, curMonth + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.unshift({ date: new Date(curYear, curMonth, -i), other: true });
  for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(curYear, curMonth, d), other: false });
  const rem2 = 7 - (cells.length % 7);
  if (rem2 < 7) for (let d = 1; d <= rem2; d++) cells.push({ date: new Date(curYear, curMonth + 1, d), other: true });

  // Per-employee task counts
  const empStats = employees.map(e => {
    const active = tasks.filter(t => t.assignedEmployeeId === e.id && t.productionStatus !== "completed").length;
    const leaves = records.filter(r => r.employeeId === e.id && r.status.toLowerCase() === "on_leave");
    const upcomingLeave = leaves.find(r => new Date(r.date) >= today);
    const todayRecord = records.find(r => r.employeeId === e.id && r.date === todayStr);
    return { ...e, active, leaves: leaves.length, upcomingLeave, todayRecord };
  });

  const onLeaveToday = empStats.filter(e => e.todayRecord?.status.toLowerCase() === "on_leave");
  const overloadedToday = empStats.filter(e => e.active >= 8);

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Employee Availability</h1>
          <p className="page-subtitle">Track leaves, workload, and team availability.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {["calendar", "list", "chart"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", background: view === v ? "var(--light-orange)" : "transparent", border: "none", cursor: "pointer", color: view === v ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: view === v ? 700 : 500 }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {canManage && <Btn icon={<SvgIcon name="arrowRight" size={13} color="#fff" />} onClick={() => { setEditTarget(null); setForm({ employeeId: "", date: todayStr, status: "on_leave", reason: "", notes: "" }); setModalOpen(true); }}>Add Record</Btn>}
        </div>
      </div>

      {/* Alert banners */}
      {onLeaveToday.length > 0 && (
        <div style={{ background: "#F3F4F6", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <SvgIcon name="alert" size={15} color="var(--muted)" />
          <span style={{ fontSize: 13, color: "var(--dark)", fontWeight: 600 }}>{onLeaveToday.map(e => e.name).join(", ")} {onLeaveToday.length === 1 ? "is" : "are"} on leave today.</span>
        </div>
      )}
      {overloadedToday.length > 0 && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 9, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <SvgIcon name="alert" size={15} color="var(--danger)" />
          <span style={{ fontSize: 13, color: "#991B1B", fontWeight: 600 }}>{overloadedToday.map(e => e.name).join(", ")} {overloadedToday.length === 1 ? "is" : "are"} overloaded ({overloadedToday.map(e => `${e.active} tasks`).join(", ")}).</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatMini label="Total Team" value={employees.length} color="var(--dark)" />
        <StatMini label="On Leave Today" value={onLeaveToday.length} color="#6B7280" />
        <StatMini label="Overloaded" value={overloadedToday.length} color="var(--danger)" />
        <StatMini label="Available" value={empStats.filter(e => !e.todayRecord || e.todayRecord.status === "available").length} color="var(--success)" />
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15 }}>{monthNames[curMonth]} {curYear}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="filter-chip" onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); }}>Today</button>
              <button className="filter-chip" onClick={() => { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); } else setCurMonth(m => m - 1); }}>Prev</button>
              <button className="filter-chip" onClick={() => { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); } else setCurMonth(m => m + 1); }}>Next</button>
            </div>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ padding: "9px 6px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {cells.map((cell, i) => {
                const ds = fmt(cell.date);
                const dayRecs = records.filter(r => r.date === ds);
                const isToday = ds === todayStr;
                return (
                  <div key={i} style={{ border: "1px solid var(--border)", padding: "5px", minHeight: 80, background: isToday ? "var(--light-orange)" : cell.other ? "#F9FAFB" : "#fff", opacity: cell.other ? 0.5 : 1 }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "var(--primary)" : "transparent", color: isToday ? "#fff" : "#374151" }}>{cell.date.getDate()}</span>
                    {dayRecs.slice(0, 3).map(r => {
                      const emp = employees.find(e => e.id === r.employeeId);
                      const m = availMeta(r.status);
                      return <div key={r.id} title={`${emp?.name}: ${m.label}`} style={{ marginTop: 2, padding: "2px 5px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp?.name?.split(" ")[0]}: {m.label}</div>;
                    })}
                    {dayRecs.length > 3 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 3 }}>+{dayRecs.length - 3}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14 }}>All Availability Records</div>
          {records.length === 0 ? (
            <EmptyState icon={<SvgIcon name="users" size={28} color="var(--muted)" />} title="No records yet" desc="Add availability records for team members." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F9FAFB" }}>
                  {["Employee", "Date", "Status", "Reason", "Notes", "Actions"].map(h => <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[...records].sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => {
                    const emp = employees.find(e => e.id === r.employeeId);
                    const m = availMeta(r.status);
                    return (
                      <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={emp?.name || "?"} size="sm" /><span style={{ fontWeight: 600 }}>{emp?.name || "Unknown"}</span></div></td>
                        <td style={{ padding: "10px 12px", fontSize: 12.5 }}>{r.date}</td>
                        <td style={{ padding: "10px 12px" }}><span style={{ background: m.bg, color: m.color, padding: "2px 9px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{m.label}</span></td>
                        <td style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--muted)" }}>{r.reason || "-"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--muted)" }}>{r.notes || "-"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {canManage && <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => { setEditTarget(r); setForm({ ...r }); setModalOpen(true); }} style={{ padding: "3px 8px", borderRadius: 6, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Edit</button>
                            <button onClick={() => deleteRecord(r.id)} style={{ padding: "3px 8px", borderRadius: 6, border: "1.5px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: 11.5, color: "var(--danger)", fontWeight: 600 }}>Del</button>
                          </div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Chart / workload view */}
      {view === "chart" && (
        <div>
          <div className="grid-2" style={{ gap: 16 }}>
            {/* Workload chart */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Team Workload</p>
              {empStats.sort((a, b) => b.active - a.active).map(e => {
                const wl = e.active <= 3 ? { label: "Light", color: "#16A34A" } : e.active <= 7 ? { label: "Balanced", color: "#0EA5E9" } : e.active <= 10 ? { label: "Heavy", color: "#F59E0B" } : { label: "Overloaded", color: "#DC2626" };
                return (
                  <div key={e.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={e.name} size="sm" />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.designation}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: wl.color + "18", color: wl.color }}>{wl.label}</span>
                        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{e.active} tasks</span>
                      </div>
                    </div>
                    <div style={{ background: "#E5E7EB", borderRadius: 99, overflow: "hidden", height: 6 }}>
                      <div style={{ width: `${Math.min(100, (e.active / 12) * 100)}%`, height: 6, borderRadius: 99, background: wl.color, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upcoming leaves */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Upcoming Leaves</p>
              {empStats.filter(e => e.upcomingLeave).length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No upcoming leaves</p>
              ) : empStats.filter(e => e.upcomingLeave).sort((a, b) => new Date(a.upcomingLeave.date) - new Date(b.upcomingLeave.date)).map(e => {
                const diff = Math.ceil((new Date(e.upcomingLeave.date) - today) / 86400000);
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <Avatar name={e.name} size="sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.upcomingLeave.date} - {e.upcomingLeave.reason || "Leave"}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#F3F4F6", color: "var(--muted)" }}>{diff === 0 ? "Today" : `${diff}d away`}</span>
                  </div>
                );
              })}

              {/* Monthly leave summary */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--muted)" }}>LEAVE SUMMARY THIS MONTH</p>
                {employees.map(e => {
                  const monthLeaves = records.filter(r => r.employeeId === e.id && r.status === "on_leave" && r.date.startsWith(`${curYear}-${String(curMonth + 1).padStart(2, "0")}`)).length;
                  return monthLeaves > 0 ? (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5 }}>
                      <span style={{ fontWeight: 600 }}>{e.name}</span>
                      <span style={{ color: "var(--muted)" }}>{monthLeaves} day{monthLeaves > 1 ? "s" : ""}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); }} title={editTarget ? "Edit Availability" : "Add Availability Record"}
        footer={<><Btn variant="outline" onClick={() => { setModalOpen(false); setEditTarget(null); }}>Cancel</Btn><Btn onClick={saveRecord}>{editTarget ? "Save" : "Add Record"}</Btn></>}
      >
        <div className="form-group">
          <label className="form-label">Employee *</label>
          <select className="form-input" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
            <option value="">Select employee...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.designation}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <FormInput label="Date *" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {AVAIL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <FormInput label="Reason" value={form.reason || ""} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Medical leave, Personal work" />
        <FormInput label="Notes" type="textarea" value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes for the manager..." />
      </Modal>
    </div>
  );
}


export default EmployeeAvailabilityPage;
