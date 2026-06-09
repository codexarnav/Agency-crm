// Holiday Calendar Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, StatusBadge,
} from "../shared/components";

const HOLIDAY_TYPES = [
  { value: "national", label: "National Holiday", color: "#DC2626", bg: "#FEE2E2" },
  { value: "festival", label: "Festival", color: "#7C3AED", bg: "#EDE9FE" },
  { value: "agency", label: "Agency Holiday", color: "#FF6A00", bg: "#FFF3E8" },
  { value: "team_off", label: "Team Off", color: "#0EA5E9", bg: "#DBEAFE" },
  { value: "custom", label: "Custom Off", color: "#6B7280", bg: "#F3F4F6" },
];

function HolidayCalendarPage() {
  const { session, employees, showToast } = useApp();
  const canManage = ["superadmin", "manager"].includes(session?.role || "");

  const [holidays, setHolidays] = useState(() => {
    const stored = LSUtils.getData(LS_KEYS.HOLIDAYS);
    return stored || MOCK.holidays.map(h => ({ ...h, type: h.type || "national", appliesTo: "all", description: "" }));
  });

  const today = new Date();
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: "", date: "", type: "national", description: "", appliesTo: "all", specificEmployeeId: "" });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const monthHolidays = holidays.filter(h => {
    const d = new Date(h.date);
    return d.getFullYear() === curYear && d.getMonth() === curMonth;
  });

  const allTasks = LSUtils.getData(LS_KEYS.TASKS) || MOCK.tasks;
  const holidayDates = new Set(holidays.map(h => h.date));

  // Tasks with posting dates on holidays
  const warningTasks = allTasks.filter(t => t.postingDate && holidayDates.has(t.postingDate));

  const saveHoliday = () => {
    if (!form.name.trim() || !form.date) { showToast("Name and date are required.", "warning"); return; }
    const isEdit = !!editTarget;
    const entry = { ...form, id: isEdit ? editTarget.id : `hol_${Date.now()}`, companyId: "comp_1" };
    const updated = isEdit ? holidays.map(h => h.id === editTarget.id ? entry : h) : [...holidays, entry];
    setHolidays(updated);
    LSUtils.setData(LS_KEYS.HOLIDAYS, updated);
    LSUtils.createActivityLog("holiday_added", "holiday", entry.id, session?.id, { name: entry.name, date: entry.date });
    showToast(`Holiday "${entry.name}" ${isEdit ? "updated" : "added"}.`, "success");
    setModalOpen(false);
    setEditTarget(null);
    setForm({ name: "", date: "", type: "national", description: "", appliesTo: "all", specificEmployeeId: "" });
  };

  const deleteHoliday = (id) => {
    const updated = holidays.filter(h => h.id !== id);
    setHolidays(updated);
    LSUtils.setData(LS_KEYS.HOLIDAYS, updated);
    showToast("Holiday removed.", "danger");
  };

  const openEdit = (h) => { setEditTarget(h); setForm({ ...h }); setModalOpen(true); };
  const openCreate = () => { setEditTarget(null); setForm({ name: "", date: "", type: "national", description: "", appliesTo: "all", specificEmployeeId: "" }); setModalOpen(true); };

  const typeMeta = (type) => HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[0];

  // Build calendar grid
  const first = new Date(curYear, curMonth, 1);
  const last = new Date(curYear, curMonth + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.unshift({ date: new Date(curYear, curMonth, -i), other: true });
  for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(curYear, curMonth, d), other: false });
  const rem = 7 - (cells.length % 7);
  if (rem < 7) for (let d = 1; d <= rem; d++) cells.push({ date: new Date(curYear, curMonth + 1, d), other: true });

  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = fmt(today);

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Holiday Calendar</h1>
          <p className="page-subtitle">{holidays.length} holidays defined for the agency.</p>
        </div>
        {canManage && <Btn icon={<SvgIcon name="arrowRight" size={13} color="#fff" />} onClick={openCreate}>Add Holiday</Btn>}
      </div>

      {/* Posting warnings */}
      {warningTasks.length > 0 && (
        <div style={{ background: "#FEF9C3", border: "1.5px solid #F59E0B", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <SvgIcon name="alert" size={16} color="#854D0E" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#854D0E", marginBottom: 3 }}>{warningTasks.length} content item(s) scheduled on a holiday</div>
            <div style={{ fontSize: 12.5, color: "#713F12" }}>
              {warningTasks.slice(0, 3).map(t => <span key={t.id} style={{ display: "inline-block", marginRight: 8 }}>{t.clientName} - {t.postingDate}</span>)}
              {warningTasks.length > 3 && <span>+{warningTasks.length - 3} more</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        {/* Calendar */}
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
                const dayHols = holidays.filter(h => h.date === ds);
                const isToday = ds === todayStr;
                const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                return (
                  <div key={i} style={{ border: "1px solid var(--border)", padding: "5px", minHeight: 80, background: isToday ? "var(--light-orange)" : cell.other ? "#F9FAFB" : isWeekend ? "#FAFAFA" : "#fff", opacity: cell.other ? 0.5 : 1 }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "var(--primary)" : "transparent", color: isToday ? "#fff" : isWeekend ? "var(--muted)" : "#374151" }}>{cell.date.getDate()}</span>
                    {dayHols.map(h => {
                      const m = typeMeta(h.type);
                      return <div key={h.id} title={h.name} style={{ marginTop: 2, padding: "2px 5px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: m.bg, color: m.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: canManage ? "pointer" : "default" }} onClick={() => canManage && openEdit(h)}>{h.name}</div>;
                    })}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ padding: "9px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, flexWrap: "wrap" }}>
              {HOLIDAY_TYPES.map(t => <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)" }}><div style={{ width: 10, height: 10, borderRadius: 3, background: t.bg, border: `1.5px solid ${t.color}` }} />{t.label}</div>)}
            </div>
          </div>
        </div>

        {/* Sidebar: month list + upcoming */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13.5 }}>This Month</div>
            {monthHolidays.length === 0 ? (
              <p style={{ padding: "20px 14px", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>No holidays this month</p>
            ) : monthHolidays.map(h => {
              const m = typeMeta(h.type);
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: m.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: m.color, lineHeight: 1 }}>{new Date(h.date).getDate()}</span>
                    <span style={{ fontSize: 9, color: m.color, fontWeight: 600 }}>{monthNames[new Date(h.date).getMonth()].slice(0, 3).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{m.label}</div>
                  </div>
                  {canManage && <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openEdit(h)} style={{ padding: "3px 7px", borderRadius: 6, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Edit</button>
                    <button onClick={() => deleteHoliday(h.id)} style={{ padding: "3px 7px", borderRadius: 6, border: "1.5px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: 11.5, color: "var(--danger)", fontWeight: 600 }}>Del</button>
                  </div>}
                </div>
              );
            })}
          </div>

          {/* Upcoming (next 90 days) */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13.5 }}>Upcoming (90 days)</div>
            {holidays
              .filter(h => { const d = new Date(h.date); return d >= today && d <= new Date(today.getTime() + 90 * 86400000); })
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 6)
              .map(h => {
                const m = typeMeta(h.type);
                const diff = Math.ceil((new Date(h.date) - today) / 86400000);
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{h.date}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: m.bg, color: m.color }}>{diff === 0 ? "Today" : `${diff}d`}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); }} title={editTarget ? "Edit Holiday" : "Add Holiday"}
        footer={<><Btn variant="outline" onClick={() => { setModalOpen(false); setEditTarget(null); }}>Cancel</Btn><Btn onClick={saveHoliday}>{editTarget ? "Save" : "Add Holiday"}</Btn></>}
      >
        <FormInput label="Holiday Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Diwali, Agency Off Day" />
        <FormInput label="Date *" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        <div className="form-group">
          <label className="form-label">Holiday Type</label>
          <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {HOLIDAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Applies To</label>
          <select className="form-input" value={form.appliesTo} onChange={e => setForm(p => ({ ...p, appliesTo: e.target.value }))}>
            <option value="all">All Team</option>
            <option value="specific">Specific Employee</option>
          </select>
        </div>
        {form.appliesTo === "specific" && (
          <div className="form-group">
            <label className="form-label">Select Employee</label>
            <select className="form-input" value={form.specificEmployeeId || ""} onChange={e => setForm(p => ({ ...p, specificEmployeeId: e.target.value }))}>
              <option value="">Choose employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.designation}</option>)}
            </select>
          </div>
        )}
        <FormInput label="Description (optional)" type="textarea" value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Add details about this holiday..." />
      </Modal>
    </div>
  );
}

export default HolidayCalendarPage;
