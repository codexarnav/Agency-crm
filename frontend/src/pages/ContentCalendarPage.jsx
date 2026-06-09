// Content Calendar Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, StatusBadge, EmptyState, Avatar, FilterBar,
  Modal
} from "../shared/components";
import {
  TaskDetailDrawer,
  ProdMBadge, PrioMBadge,
  PLATFORMS_LIST, ApprovMBadge, TaskCreateModal,
} from "../shared/taskConstants";
import { getPublishingCalendar, reschedulePost, cancelPost } from "../services/api";
import { useCallback } from "react";

function ContentCalendarPage() {
  const { clients, employees, showToast, tasks, session, refreshTasks } = useApp();
  const holidays = LSUtils.getData(LS_KEYS.HOLIDAYS) || MOCK.holidays;
  const today = new Date();


  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [view, setView] = useState("month");
  const [filterClient, setFilterClient] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  // Publishing calendar states
  const [publishingJobs, setPublishingJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const platformColor = (platform) => {
    const plat = platform?.toUpperCase() || "";
    if (plat.includes("INSTAGRAM")) return { bg: "#FFF5F0", fg: "#FF6A00", border: "#FFC2A0" };
    if (plat.includes("FACEBOOK")) return { bg: "#EEF4FC", fg: "#1877F2", border: "#ADCFF9" };
    if (plat.includes("YOUTUBE")) return { bg: "#FFF0F0", fg: "#FF0000", border: "#FFA3A3" };
    if (plat.includes("LINKEDIN")) return { bg: "#EBF3FA", fg: "#0A66C2", border: "#9CC4EB" };
    if (plat.includes("TWITTER") || plat.includes("X")) return { bg: "#EAEAEA", fg: "#14171A", border: "#A0A0A0" };
    if (plat.includes("PINTEREST")) return { bg: "#FDF0F2", fg: "#E60023", border: "#F6A3B0" };
    return { bg: "#EBFBFA", fg: "#008080", border: "#9CEBEB" };
  };

  const fetchPublishingJobs = useCallback(async () => {
    const role = session?.role || "employee";
    if (role !== "superadmin" && role !== "manager") return;

    try {
      const start = new Date(curYear, curMonth - 1, 1);
      const end = new Date(curYear, curMonth + 2, 0);
      const res = await getPublishingCalendar(start.toISOString(), end.toISOString());
      setPublishingJobs(res.data || []);
    } catch (err) {
      console.error("Failed to load publishing calendar jobs:", err);
    }
  }, [curYear, curMonth, session?.role]);

  useEffect(() => {
    fetchPublishingJobs();
  }, [fetchPublishingJobs]);

  const handleDragStart = (e, job) => {
    e.dataTransfer.setData("text/plain", job.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/plain");
    const job = publishingJobs.find(j => j.id === jobId);
    if (!job) return;

    const origTime = new Date(job.scheduledAt);
    const newScheduledAt = new Date(targetDate);
    newScheduledAt.setHours(origTime.getHours());
    newScheduledAt.setMinutes(origTime.getMinutes());
    newScheduledAt.setSeconds(0);
    newScheduledAt.setMilliseconds(0);

    try {
      await reschedulePost(jobId, newScheduledAt.toISOString());
      showToast(`Rescheduled post to ${newScheduledAt.toLocaleString()}`, "success");
      fetchPublishingJobs();
      if (typeof refreshTasks === "function") refreshTasks();
    } catch (err) {
      showToast(err.message || "Failed to reschedule post", "danger");
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob || !rescheduleDate || !rescheduleTime) return;

    try {
      const newDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      await reschedulePost(selectedJob.id, newDate.toISOString());
      showToast("Post rescheduled successfully", "success");
      setRescheduleOpen(false);
      setJobDetailsOpen(false);
      setSelectedJob(null);
      fetchPublishingJobs();
      if (typeof refreshTasks === "function") refreshTasks();
    } catch (err) {
      showToast(err.message || "Failed to reschedule post", "danger");
    }
  };

  const handleCancelClick = async () => {
    if (!selectedJob) return;
    if (!window.confirm("Are you sure you want to cancel this scheduled post?")) return;
    try {
      await cancelPost(selectedJob.id);
      showToast("Scheduled post cancelled successfully", "success");
      setJobDetailsOpen(false);
      setSelectedJob(null);
      fetchPublishingJobs();
      if (typeof refreshTasks === "function") refreshTasks();
    } catch (err) {
      showToast(err.message || "Failed to cancel post schedule", "danger");
    }
  };

  const filtered = tasks.filter(t => {
    if (filterClient !== "all" && t.clientId !== filterClient) return false;
    if (filterPlatform !== "all" && t.platform !== filterPlatform) return false;
    if (filterEmployee !== "all" && t.assignedEmployeeId !== filterEmployee) return false;
    return true;
  });

  const filteredJobs = publishingJobs.filter(job => {
    if (filterClient !== "all" && job.clientId !== filterClient) return false;
    if (filterPlatform !== "all") {
      const p = filterPlatform.toUpperCase().replace("/X", "").replace(" ", "_");
      if (job.platform !== p) return false;
    }
    return true;
  });

  const byDate = filtered.reduce((acc, t) => { if (t.postingDate) { (acc[t.postingDate] = acc[t.postingDate] || []).push(t); } return acc; }, {});
  const deadlines = filtered.reduce((acc, t) => { if (t.internalDeadline && t.internalDeadline !== t.postingDate) { (acc[t.internalDeadline] = acc[t.internalDeadline] || []).push({ ...t, _dl: true }); } return acc; }, {});
  const holidayMap = (holidays || []).reduce((a, h) => { a[h.date] = h; return a; }, {});

  const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const jobsByDate = filteredJobs.reduce((acc, job) => {
    const key = fmtKey(new Date(job.scheduledAt));
    if (!acc[key]) acc[key] = [];
    acc[key].push(job);
    return acc;
  }, {});

  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = fmt(today);

  const grid = () => {
    const first = new Date(curYear, curMonth, 1);
    const last = new Date(curYear, curMonth + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.unshift({ date: new Date(curYear, curMonth, -i), other: true });
    for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(curYear, curMonth, d), other: false });
    const rem = 7 - (cells.length % 7);
    if (rem < 7) for (let d = 1; d <= rem; d++) cells.push({ date: new Date(curYear, curMonth + 1, d), other: true });
    return cells;
  };

  const evColor = t => {
    if (t._dl) return ["#FEF3C7", "#92400E", "#F59E0B"];
    const m = { completed: ["#D1FAE5", "#065F46", "#16A34A"], blocked: ["#FEE2E2", "#991B1B", "#DC2626"], ready_for_review: ["#EDE9FE", "#4C1D95", "#7C3AED"], in_progress: ["#DBEAFE", "#1E40AF", "#1D4ED8"] };
    return m[t.productionStatus] || ["#FFF3E8", "#E95A00", "#FF6A00"];
  };

  const stats = { total: filtered.length, inProd: filtered.filter(t => t.productionStatus === "in_progress").length, review: filtered.filter(t => t.productionStatus === "ready_for_review").length, approved: filtered.filter(t => ["client_approved", "final_approved"].includes(t.approvalStatus)).length, posted: filtered.filter(t => t.publishingStatus === "posted").length };

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">{monthNames[curMonth]} {curYear} . {filtered.length} items</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["month", "week", "day"].map(v => <button key={v} className={`filter-chip ${view === v ? "active" : ""}`} onClick={() => setView(v)} style={{ fontSize: 12 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>)}
          <Btn size="sm" icon={<SvgIcon name="arrowRight" size={13} color="#fff" />} onClick={() => setNewTaskOpen(true)}>New Task</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 10, marginBottom: 16 }}>
        {[["Planned", stats.total, "#FF6A00"], ["In Prod", stats.inProd, "#1D4ED8"], ["In Review", stats.review, "#7C3AED"], ["Approved", stats.approved, "#16A34A"], ["Posted", stats.posted, "#059669"]].map(([l, v, c]) => (
          <div key={l} className="stat-card" style={{ padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filters + nav */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 150, fontSize: 13 }}>
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 130, fontSize: 13 }}>
          <option value="all">All Platforms</option>
          {PLATFORMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 150, fontSize: 13 }}>
          <option value="all">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button className="filter-chip" onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); }}>Today</button>
          <button className="filter-chip" onClick={() => { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); } else setCurMonth(m => m - 1); }}>Prev</button>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 130, textAlign: "center" }}>{monthNames[curMonth]} {curYear}</span>
          <button className="filter-chip" onClick={() => { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); } else setCurMonth(m => m + 1); }}>Next</button>
        </div>
      </div>

      {view === "month" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ padding: "9px 6px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {grid().map((cell, i) => {
              const ds = fmt(cell.date);
              const dayTasks = byDate[ds] || [];
              const dayDl = deadlines[ds] || [];
              const dayJobs = jobsByDate[ds] || [];
              const hol = holidayMap[ds];
              const isToday = ds === todayStr;
              return (
                <div 
                  key={i} 
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, cell.date)}
                  style={{ border: "1px solid var(--border)", padding: "5px", minHeight: 90, verticalAlign: "top", cursor: "pointer", background: isToday ? "var(--light-orange)" : cell.other ? "#F9FAFB" : "#fff", opacity: cell.other ? 0.55 : 1, transition: "background 0.12s" }} 
                  onMouseEnter={e => { if (!isToday && !cell.other) e.currentTarget.style.background = "#FFF8F3"; }} 
                  onMouseLeave={e => { if (!isToday && !cell.other) e.currentTarget.style.background = "#fff"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12.5, fontWeight: isToday ? 800 : 500, width: 22, height: 22, borderRadius: "50%", background: isToday ? "#FF6A00" : "transparent", color: isToday ? "#fff" : "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>{cell.date.getDate()}</span>
                    {hol && <span style={{ fontSize: 9, background: "#DCFCE7", color: "#166534", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>H</span>}
                  </div>
                  {dayDl.slice(0, 1).map(t => <div key={t.id + "dl"} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, marginBottom: 2, cursor: "pointer", background: "#FEF3C7", color: "#92400E", borderLeft: "3px solid #F59E0B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}> {t.clientName}</div>)}
                  {dayTasks.slice(0, 2).map(t => {
                    const [bg, fg] = evColor(t);
                    return <div key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, marginBottom: 2, cursor: "pointer", background: bg, color: fg, borderLeft: `3px solid ${fg}`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "transform 0.1s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>{t.clientName?.split(" ")[0]} . {t.contentType}</div>;
                  })}
                  {dayJobs.map(job => {
                    const colors = platformColor(job.platform);
                    const jobTitle = job.task ? job.task.title : (job.shoot ? job.shoot.title : "Queued Post");
                    return (
                      <div 
                        key={job.id} 
                        draggable={job.status === "SCHEDULED" || job.status === "RESCHEDULED"}
                        onDragStart={(e) => handleDragStart(e, job)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setJobDetailsOpen(true);
                        }}
                        style={{
                          background: colors.bg,
                          color: colors.fg,
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 4,
                          padding: "2px 4px",
                          fontSize: 9.5,
                          fontWeight: 700,
                          marginBottom: 2,
                          cursor: "grab",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}
                        title={`${job.platform}: ${jobTitle}`}
                      >
                        📢 {job.platform.slice(0, 2)}: {job.client?.brandName || "Post"}
                      </div>
                    );
                  })}
                  {(dayTasks.length + dayJobs.length) > 2 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 3 }}>+{(dayTasks.length + dayJobs.length) - 2} more</div>}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ padding: "9px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[["#FFF3E8", "#E95A00", "Planned"], ["#DBEAFE", "#1E40AF", "In Progress"], ["#EDE9FE", "#4C1D95", "In Review"], ["#D1FAE5", "#065F46", "Completed"], ["#FEF3C7", "#92400E", "Deadline"], ["#DCFCE7", "#166534", "Holiday"]].map(([bg, fg, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)" }}>
                <div style={{ width: 12, height: 8, borderRadius: 2, background: bg, border: `1.5px solid ${fg}` }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="card" style={{ overflow: "auto" }}>
          {/* Simple 7-day week view */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", minWidth: 700 }}>
            {Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - today.getDay() + i); return d; }).map((d, i) => {
              const ds = fmt(d);
              const dt = filtered.filter(t => t.postingDate === ds);
              const dayJobs = jobsByDate[ds] || [];
              const isToday = ds === todayStr;
              return (
                <div key={i} style={{ borderRight: i < 6 ? "1px solid var(--border)" : "" }}>
                  <div style={{ padding: "9px 8px", textAlign: "center", borderBottom: "1px solid var(--border)", background: isToday ? "var(--light-orange)" : "#F9FAFB" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{"Sun Mon Tue Wed Thu Fri Sat".split(" ")[i]}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? "var(--primary)" : "var(--dark)" }}>{d.getDate()}</div>
                  </div>
                  <div style={{ padding: "8px", minHeight: 120 }}>
                    {dt.map(t => <div key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ background: "var(--light-orange)", border: "1.5px solid rgba(255,106,0,0.3)", borderRadius: 7, padding: "5px 8px", marginBottom: 5, cursor: "pointer", fontSize: 11.5 }}><div style={{ fontWeight: 700, color: "var(--deep)" }}>{t.clientName}</div><div style={{ color: "var(--muted)" }}>{t.contentType}</div></div>)}
                    
                    {dayJobs.map(job => {
                      const colors = platformColor(job.platform);
                      return (
                        <div 
                          key={job.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                            setJobDetailsOpen(true);
                          }}
                          style={{ 
                            background: colors.bg, 
                            border: `1.5px solid ${colors.border}`, 
                            color: colors.fg,
                            borderRadius: 7, 
                            padding: "5px 8px", 
                            marginBottom: 5, 
                            cursor: "pointer", 
                            fontSize: 11.5 
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>📢 {job.platform}</div>
                          <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{job.client?.companyName?.split(" ")[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
            Today  -  {today.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })} . {(filtered.filter(t => t.postingDate === todayStr).length + (jobsByDate[todayStr] || []).length)} items
          </p>
          
          {filtered.filter(t => t.postingDate === todayStr).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" }}>Planned Tasks</h4>
              {filtered.filter(t => t.postingDate === todayStr).map(t => (
                <div key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ border: "1.5px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 10, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#FF6A00"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{t.clientName}</span><PrioMBadge s={t.priority} /></div>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>{t.contentDescription}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ProdMBadge s={t.productionStatus} /><ApprovMBadge s={t.approvalStatus} /></div>
                </div>
              ))}
            </div>
          )}

          {(jobsByDate[todayStr] || []).length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" }}>Queued for Publishing</h4>
              {(jobsByDate[todayStr] || []).map(job => {
                const colors = platformColor(job.platform);
                const title = job.task ? job.task.title : (job.shoot ? job.shoot.title : "Direct Schedule");
                return (
                  <div 
                    key={job.id} 
                    onClick={() => { setSelectedJob(job); setJobDetailsOpen(true); }} 
                    style={{ border: `1.5px solid ${colors.border}`, background: colors.bg, color: colors.fg, borderRadius: 10, padding: "12px 16px", marginBottom: 10, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{job.client?.companyName}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div style={{ fontSize: 13, color: "var(--dark)", marginBottom: 8 }}>
                      <strong>{job.platform}</strong> at {new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {title}
                    </div>
                    {job.caption && <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>"{job.caption}"</p>}
                  </div>
                );
              })}
            </div>
          )}

          {filtered.filter(t => t.postingDate === todayStr).length === 0 && (jobsByDate[todayStr] || []).length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", padding: "30px 0" }}>No content scheduled for today.</p>
          )}
        </div>
      )}

      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedTask(null); }} employees={employees} onStatusUpdate={updated => { setSelectedTask(updated); }} />
      <TaskCreateModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />

      {/* Scheduled Job Details Modal */}
      <Modal
        open={jobDetailsOpen}
        onClose={() => {
          setJobDetailsOpen(false);
          setSelectedJob(null);
        }}
        title="Scheduled Post Details"
        size="md"
      >
        {selectedJob && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Platform</span>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{selectedJob.platform}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Status</span>
                <div style={{ marginTop: 2 }}><StatusBadge status={selectedJob.status} /></div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Scheduled For</span>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{new Date(selectedJob.scheduledAt).toLocaleString()}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Client</span>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{selectedJob.client?.companyName}</div>
              </div>
            </div>

            <div className="divider" style={{ margin: "4px 0" }} />

            <div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Caption / Post Copy</span>
              <div style={{ fontSize: 13.5, background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid var(--border)", marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {selectedJob.caption || "No caption written"}
              </div>
            </div>

            {selectedJob.mediaUrls && (
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Media Assets Link</span>
                <div style={{ marginTop: 4 }}>
                  <a
                    href={selectedJob.mediaUrls}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13.5, color: "var(--primary)", fontWeight: 600, wordBreak: "break-all" }}
                  >
                    {selectedJob.mediaUrls}
                  </a>
                </div>
              </div>
            )}

            <div className="divider" style={{ margin: "4px 0" }} />

            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              <div>Scheduled by: <strong>{selectedJob.manager?.username}</strong></div>
              {selectedJob.task && <div style={{ marginTop: 4 }}>Linked Task: <strong>{selectedJob.task.title}</strong></div>}
              {selectedJob.shoot && <div style={{ marginTop: 4 }}>Linked Shoot: <strong>{selectedJob.shoot.title}</strong></div>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              {(selectedJob.status === "SCHEDULED" || selectedJob.status === "RESCHEDULED") && (
                <>
                  <Btn variant="danger" onClick={handleCancelClick}>
                    Cancel Schedule
                  </Btn>
                  <Btn variant="primary" onClick={() => {
                    const dt = new Date(selectedJob.scheduledAt);
                    setRescheduleDate(dt.toISOString().split("T")[0]);
                    setRescheduleTime(dt.toTimeString().split(" ")[0].slice(0, 5));
                    setRescheduleOpen(true);
                  }}>
                    Reschedule
                  </Btn>
                </>
              )}
              <Btn variant="outline" onClick={() => {
                setJobDetailsOpen(false);
                setSelectedJob(null);
              }}>
                Close
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule Publication"
        size="sm"
      >
        <form onSubmit={handleRescheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="form-input"
              style={{ width: "100%" }}
              required
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Time</label>
            <input
              type="time"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="form-input"
              style={{ width: "100%" }}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Btn variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Btn>
            <Btn type="submit">
              Confirm Date
            </Btn>
          </div>
        </form>
      </Modal>
    </div>

  );
}

/* -- Agency Task Overview Page -- */

export default ContentCalendarPage;
