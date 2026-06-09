// Announcements Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK, AUDIENCE_OPTIONS } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, EmptyState, Modal, FormInput, StatusBadge, Avatar, SearchBar,
} from "../shared/components";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from "../services/api";

function AnnouncementsPage() {
  const { session, clients, employees, showToast, announcements, refreshAnnouncements } = useApp();
  const canCreate = ["superadmin", "manager"].includes(session?.role || "");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  const blank = { title: "", body: "", priority: "medium", audience: "everyone", specificClientId: "", specificEmployeeId: "", expiresAt: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(blank); setEditTarget(null); setModalOpen(true); };
  const openEdit = (a) => { setForm({ ...a }); setEditTarget(a); setModalOpen(true); };

  const filtered = announcements.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.body || "").toLowerCase().includes(search.toLowerCase());
    const matchPrio = filterPriority === "all" || a.priority === filterPriority;
    return matchSearch && matchPrio;
  });

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) { showToast("Please fill in title and message.", "warning"); return; }

    const isEdit = !!editTarget;
    try {
      const payload = {
        title: form.title,
        body: form.body,
        priority: form.priority,
        audience: form.audience,
        specificClientId: form.audience === "specific_client" ? form.specificClientId : null,
        specificEmployeeId: form.audience === "specific_employee" ? form.specificEmployeeId : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      if (isEdit) {
        await updateAnnouncement(editTarget.id, payload);
      } else {
        await createAnnouncement(payload);
      }

      await refreshAnnouncements();
      showToast(isEdit ? "Announcement updated." : "Announcement created and sent.", "success");
      setModalOpen(false);
    } catch (err) {
      showToast(err.message || "Failed to save announcement.", "danger");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAnnouncement(id);
      await refreshAnnouncements();
      showToast("Announcement deleted.", "success");
    } catch (err) {
      showToast(err.message || "Failed to delete announcement.", "danger");
    }
  };

  const priorityMeta = {
    high: { cls: "badge-danger", label: "High" },
    medium: { cls: "badge-warning", label: "Medium" },
    low: { cls: "badge-muted", label: "Low" },
  };

  const audienceLabel = (aud, clientId, empId) => {
    const o = AUDIENCE_OPTIONS.find(x => x.value === aud);
    if (aud === "specific_client") { const c = clients.find(x => x.id === clientId); return c ? `Client: ${c.name}` : "Specific Client"; }
    if (aud === "specific_employee") { const e = employees.find(x => x.id === empId); return e ? `Employee: ${e.name}` : "Specific Employee"; }
    return o?.label || aud;
  };

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">{announcements.length} total announcements</p>
        </div>
        {canCreate && (
          <Btn icon={<SvgIcon name="megaphone" size={14} color="#fff" />} onClick={openCreate}>New Announcement</Btn>
        )}
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[
          { label: "Total", v: announcements.length, c: "var(--dark)" },
          { label: "High Priority", v: announcements.filter(a => a.priority === "high").length, c: "var(--danger)" },
          { label: "Active", v: announcements.filter(a => !a.expiresAt || new Date(a.expiresAt) > new Date()).length, c: "var(--success)" },
          { label: "Expired", v: announcements.filter(a => a.expiresAt && new Date(a.expiresAt) <= new Date()).length, c: "var(--muted)" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search announcements..." style={{ flex: "1 1 200px", minWidth: 180 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {[["all", "All"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([v, l]) => (
            <button key={v} className={`filter-chip ${filterPriority === v ? "active" : ""}`} onClick={() => setFilterPriority(v)} style={{ fontSize: 12 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<SvgIcon name="megaphone" size={28} color="var(--muted)" />} title="No announcements" desc={canCreate ? "Create your first announcement using the button above." : "No announcements yet."} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(a => {
            const pm = priorityMeta[a.priority] || priorityMeta.low;
            const isExpired = a.expiresAt && new Date(a.expiresAt) <= new Date();
            const creator = [...(LSUtils.getData(LS_KEYS.USERS) || MOCK.users), ...employees].find(u => u.id === a.createdBy);
            return (
              <div key={a.id} className="card" style={{ padding: "18px 22px", opacity: isExpired ? 0.65 : 1, borderLeft: `4px solid ${a.priority === "high" ? "var(--danger)" : a.priority === "medium" ? "var(--warning)" : "var(--border)"}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--light-orange)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SvgIcon name="megaphone" size={19} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: "var(--dark)" }}>{a.title}</h3>
                      <span className={`badge ${pm.cls}`} style={{ fontSize: 10.5 }}>{pm.label}</span>
                      {isExpired && <span className="badge badge-muted" style={{ fontSize: 10.5 }}>Expired</span>}
                      <span style={{ fontSize: 11, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>
                        {audienceLabel(a.audience, a.specificClientId, a.specificEmployeeId)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, color: "var(--dark)", lineHeight: 1.65, marginBottom: 10 }}>{a.body}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {creator && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar name={creator.name} size={20} />
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>by {creator.name}</span>
                        </div>
                      )}
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {a.expiresAt && !isExpired && (
                        <span style={{ fontSize: 12, color: "var(--warning)", fontWeight: 600 }}>
                          Expires {new Date(a.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (visible to creators only) */}
                  {canCreate && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(a)} style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                        <SvgIcon name="pen" size={12} color="var(--muted)" /> Edit
                      </button>
                      <button onClick={() => handleDelete(a.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Announcement" : "New Announcement"}
        size="md"
        footer={
          <><Btn variant="outline" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn icon={<SvgIcon name="send" size={14} color="#fff" />} onClick={handleSave}>
              {editTarget ? "Save Changes" : "Send Announcement"}
            </Btn></>
        }
      >
        <FormInput label="Title *" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Announcement title..." />
        <FormInput label="Message Body *" type="textarea" value={form.body} onChange={e => set("body", e.target.value)} placeholder="Write your announcement..." />
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-input" value={form.priority} onChange={e => set("priority", e.target.value)}>
              {[["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Audience</label>
            <select className="form-input" value={form.audience} onChange={e => set("audience", e.target.value)}>
              {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {form.audience === "specific_client" && (
          <div className="form-group">
            <label className="form-label">Select Client</label>
            <select className="form-input" value={form.specificClientId} onChange={e => set("specificClientId", e.target.value)}>
              <option value="">Choose client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {form.audience === "specific_employee" && (
          <div className="form-group">
            <label className="form-label">Select Employee</label>
            <select className="form-input" value={form.specificEmployeeId} onChange={e => set("specificEmployeeId", e.target.value)}>
              <option value="">Choose employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.designation}</option>)}
            </select>
          </div>
        )}
        <FormInput label="Expiry Date (optional)" type="date" value={form.expiresAt?.split("T")[0] || ""} onChange={e => set("expiresAt", e.target.value ? e.target.value + "T23:59:59Z" : "")} hint="Leave blank to keep announcement active indefinitely" />

        {!editTarget && (
          <div style={{ background: "var(--light-orange)", border: "1px solid rgba(255,106,0,0.2)", borderRadius: 9, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
            <div style={{ marginTop: 1, flexShrink: 0 }}><SvgIcon name="alert" size={15} color="var(--primary)" /></div>
            <p style={{ fontSize: 12.5, color: "var(--deep)", lineHeight: 1.5 }}>
              This will send a notification to: <strong>{AUDIENCE_OPTIONS.find(o => o.value === form.audience)?.label || form.audience}</strong>.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* =============================================================
   SHARED REPORT HELPERS
============================================================= */

export default AnnouncementsPage;
