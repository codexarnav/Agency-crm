import { useState, useEffect, useCallback } from "react";
import { useApp } from "../shared/AppContext";
import {
    getPublishingCalendar,
    reschedulePost,
    cancelPost,
} from "../services/api";
import {
    SvgIcon,
    Btn,
    StatusBadge,
    Modal,
} from "../shared/components";
import CreatePostModal from "../components/CreatePostModal";

export default function PublishingCalendar() {
    const { clients, showToast } = useApp();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [createPostOpen, setCreatePostOpen] = useState(false);

    const [view, setView] = useState("month"); // 'month' or 'week'
    const [pivotDate, setPivotDate] = useState(new Date());

    // Filters
    const [filterPlatform, setFilterPlatform] = useState("all");
    const [filterClient, setFilterClient] = useState("all");

    // Details/Reschedule Modal
    const [selectedJob, setSelectedJob] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const statusColor = (status) => {
        const stat = status?.toUpperCase() || "";
        if (stat === "SCHEDULED" || stat === "RESCHEDULED") {
            return { bg: "#EEF4FC", fg: "#1877F2", border: "#ADCFF9" }; // Blue
        }
        if (stat === "PUBLISHING") {
            return { bg: "#FFF5F0", fg: "#FF6A00", border: "#FFC2A0" }; // Orange
        }
        if (stat === "PUBLISHED" || stat === "POSTED") {
            return { bg: "#ECFDF5", fg: "#059669", border: "#A7F3D0" }; // Green
        }
        if (stat === "FAILED" || stat === "FAILED_TO_POST") {
            return { bg: "#FEF2F2", fg: "#DC2626", border: "#FCA5A5" }; // Red
        }
        return { bg: "#F3F4F6", fg: "#4B5563", border: "#D1D5DB" }; // Cancelled/Draft (Gray)
    };

    // Calculate dates range
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const start = new Date(pivotDate.getFullYear(), pivotDate.getMonth() - 1, 1);
            const end = new Date(pivotDate.getFullYear(), pivotDate.getMonth() + 2, 0);

            const res = await getPublishingCalendar(start.toISOString(), end.toISOString());
            setJobs(res.data || []);
        } catch (err) {
            showToast(err.message || "Failed to load calendar events", "danger");
        } finally {
            setLoading(false);
        }
    }, [pivotDate, showToast]);

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(() => {
            const start = new Date(pivotDate.getFullYear(), pivotDate.getMonth() - 1, 1);
            const end = new Date(pivotDate.getFullYear(), pivotDate.getMonth() + 2, 0);
            getPublishingCalendar(start.toISOString(), end.toISOString())
                .then((res) => {
                    setJobs(res.data || []);
                })
                .catch((err) => console.error("Silent calendar auto-refresh failed:", err));
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchJobs, pivotDate]);

    // Local filters
    const filteredJobs = jobs.filter(job => {
        if (filterClient !== "all" && job.clientId !== filterClient) return false;
        if (filterPlatform !== "all") {
            const p = filterPlatform.toUpperCase().replace("/X", "").replace(" ", "_");
            if (job.platform !== p) return false;
        }
        return true;
    });

    // Grouping jobs by date (YYYY-MM-DD)
    const fmtKey = (d) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const jobsByDate = filteredJobs.reduce((acc, job) => {
        const key = fmtKey(new Date(job.scheduledAt));
        if (!acc[key]) acc[key] = [];
        acc[key].push(job);
        return acc;
    }, {});

    // Month Grid Calculation
    const getMonthCells = () => {
        const year = pivotDate.getFullYear();
        const month = pivotDate.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        
        const cells = [];
        // Pad previous month days
        const startDay = first.getDay();
        for (let i = startDay - 1; i >= 0; i--) {
            cells.push({ date: new Date(year, month, -i), otherMonth: true });
        }
        // Current month days
        for (let d = 1; d <= last.getDate(); d++) {
            cells.push({ date: new Date(year, month, d), otherMonth: false });
        }
        // Pad next month days
        const totalCells = cells.length;
        const pad = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let d = 1; d <= pad; d++) {
            cells.push({ date: new Date(year, month + 1, d), otherMonth: true });
        }
        return cells;
    };

    // Week Grid Calculation
    const getWeekCells = () => {
        const cells = [];
        const startOfWeek = new Date(pivotDate);
        // Find Sunday of the current week
        startOfWeek.setDate(pivotDate.getDate() - pivotDate.getDay());
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            cells.push({ date: day, otherMonth: day.getMonth() !== pivotDate.getMonth() });
        }
        return cells;
    };

    // Navigation
    const handlePrev = () => {
        const next = new Date(pivotDate);
        if (view === "month") {
            next.setMonth(next.getMonth() - 1);
        } else {
            next.setDate(next.getDate() - 7);
        }
        setPivotDate(next);
    };

    const handleNext = () => {
        const next = new Date(pivotDate);
        if (view === "month") {
            next.setMonth(next.getMonth() + 1);
        } else {
            next.setDate(next.getDate() + 7);
        }
        setPivotDate(next);
    };

    const handleToday = () => {
        setPivotDate(new Date());
    };

    // HTML5 Drag and Drop events
    const handleDragStart = (e, job) => {
        e.dataTransfer.setData("text/plain", job.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = async (e, targetDate) => {
        e.preventDefault();
        const jobId = e.dataTransfer.getData("text/plain");
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        // Merge original time with new date
        const origTime = new Date(job.scheduledAt);
        const newScheduledAt = new Date(targetDate);
        newScheduledAt.setHours(origTime.getHours());
        newScheduledAt.setMinutes(origTime.getMinutes());
        newScheduledAt.setSeconds(0);
        newScheduledAt.setMilliseconds(0);

        try {
            await reschedulePost(jobId, newScheduledAt.toISOString());
            showToast(`Rescheduled post to ${newScheduledAt.toLocaleString()}`, "success");
            fetchJobs();
        } catch (err) {
            showToast(err.message || "Failed to reschedule post", "danger");
        }
    };

    // Reschedule form submit
    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedJob || !rescheduleDate || !rescheduleTime) return;

        try {
            const newDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
            await reschedulePost(selectedJob.id, newDate.toISOString());
            showToast("Post rescheduled successfully", "success");
            setRescheduleOpen(false);
            setDetailsOpen(false);
            setSelectedJob(null);
            fetchJobs();
        } catch (err) {
            showToast(err.message || "Failed to reschedule post", "danger");
        }
    };

    // Cancel job
    const handleCancelSubmit = async () => {
        if (!selectedJob) return;
        try {
            await cancelPost(selectedJob.id);
            showToast("Job cancelled successfully", "success");
            setDetailsOpen(false);
            setSelectedJob(null);
            fetchJobs();
        } catch (err) {
            showToast(err.message || "Failed to cancel post schedule", "danger");
        }
    };

    const todayStr = fmtKey(new Date());

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">Publishing Calendar</h1>
                    <p className="page-subtitle">
                        {view === "month" 
                            ? `${monthNames[pivotDate.getMonth()]} ${pivotDate.getFullYear()}` 
                            : `Week of ${pivotDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className={`filter-chip ${view === "month" ? "active" : ""}`} onClick={() => setView("month")}>Month</button>
                    <button className={`filter-chip ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Week</button>
                    <Btn icon={<SvgIcon name="video" size={14} color="#fff" />} onClick={() => setCreatePostOpen(true)}>
                        + Create Post
                    </Btn>
                </div>
            </div>

            {/* Navigation & Filters */}
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    {/* Filters */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <select
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className="form-input"
                            style={{ width: "auto", minWidth: 140 }}
                        >
                            <option value="all">All Platforms</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                            <option value="YouTube">YouTube</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Twitter/X">Twitter/X</option>
                            <option value="Pinterest">Pinterest</option>
                        </select>

                        <select
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            className="form-input"
                            style={{ width: "auto", minWidth: 160 }}
                        >
                            <option value="all">All Clients</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.companyName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Navigation */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button className="filter-chip" onClick={handleToday}>Today</button>
                        <button className="filter-chip" onClick={handlePrev}>Prev</button>
                        <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 120, textAlign: "center" }}>
                            {view === "month" 
                                ? `${monthNames[pivotDate.getMonth()]} ${pivotDate.getFullYear()}` 
                                : `Week of ${pivotDate.getDate()} ${monthNames[pivotDate.getMonth()].slice(0, 3)}`}
                        </span>
                        <button className="filter-chip" onClick={handleNext}>Next</button>
                    </div>
                </div>
            </div>

            {/* Grid Loader */}
            {loading ? (
                <div className="card" style={{ padding: 60, textAlign: "center" }}>
                    <span className="spin" style={{ display: "inline-block", width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
                    <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 13.5 }}>Loading calendar grid...</p>
                </div>
            ) : (
                <div className="card" style={{ overflow: "hidden", padding: 0 }}>
                    {/* Days of Week Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)", background: "#F9FAFB" }}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} style={{ padding: "10px 6px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Cells Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                        {(view === "month" ? getMonthCells() : getWeekCells()).map((cell, idx) => {
                            const dateKey = fmtKey(cell.date);
                            const dayJobs = jobsByDate[dateKey] || [];
                            const isToday = dateKey === todayStr;

                            return (
                                <div
                                    key={idx}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, cell.date)}
                                    style={{
                                        borderRight: idx % 7 === 6 ? "none" : "1px solid var(--border)",
                                        borderBottom: "1px solid var(--border)",
                                        padding: 6,
                                        minHeight: 120,
                                        background: isToday ? "var(--light-orange)" : cell.otherMonth ? "#FAFBFB" : "#fff",
                                        opacity: cell.otherMonth ? 0.6 : 1,
                                        transition: "background 0.12s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isToday && !cell.otherMonth) e.currentTarget.style.background = "#FFF9F5";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isToday && !cell.otherMonth) e.currentTarget.style.background = "#fff";
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                        <span style={{
                                            fontSize: 11.5,
                                            fontWeight: isToday ? 800 : 600,
                                            width: 22,
                                            height: 22,
                                            borderRadius: "50%",
                                            background: isToday ? "var(--primary)" : "transparent",
                                            color: isToday ? "#fff" : "var(--dark)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}>
                                            {cell.date.getDate()}
                                        </span>
                                    </div>

                                    {/* Jobs render */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {dayJobs.map(job => {
                                            const colors = statusColor(job.status);
                                            const title = job.task ? job.task.title : (job.shoot ? job.shoot.title : "Direct Schedule");
                                            return (
                                                <div
                                                    key={job.id}
                                                    draggable={job.status === "SCHEDULED" || job.status === "RESCHEDULED"}
                                                    onDragStart={(e) => handleDragStart(e, job)}
                                                    onClick={() => {
                                                        setSelectedJob(job);
                                                        setDetailsOpen(true);
                                                    }}
                                                    style={{
                                                        background: colors.bg,
                                                        color: colors.fg,
                                                        border: `1.5px solid ${colors.border}`,
                                                        borderRadius: 6,
                                                        padding: "4px 6px",
                                                        fontSize: 10.5,
                                                        fontWeight: 700,
                                                        cursor: "grab",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                                        transition: "transform 0.1s",
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = ""}
                                                    title={`${job.platform}: ${title} (${new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                                >
                                                    {new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} {job.client?.brandName || "Post"}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 14, flexWrap: "wrap", background: "#FAFBFB" }}>
                        {[
                            ["Scheduled", "#EEF4FC", "#1877F2", "#ADCFF9"],
                            ["Publishing", "#FFF5F0", "#FF6A00", "#FFC2A0"],
                            ["Published", "#ECFDF5", "#059669", "#A7F3D0"],
                            ["Failed", "#FEF2F2", "#DC2626", "#FCA5A5"],
                            ["Cancelled", "#F3F4F6", "#4B5563", "#D1D5DB"],
                        ].map(([statusLabel, bg, fg, border]) => (
                            <div key={statusLabel} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)" }}>
                                <div style={{ width: 12, height: 10, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }} />
                                {statusLabel}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Details Modal */}
            <Modal
                open={detailsOpen}
                onClose={() => {
                    setDetailsOpen(false);
                    setSelectedJob(null);
                }}
                title="Scheduled Job Details"
                size="md"
            >
                {selectedJob && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <span style={{ fontSize: 12, color: "var(--muted)" }}>Social Media Platform</span>
                                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{selectedJob.platform}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: "var(--muted)" }}>Status</span>
                                <div style={{ marginTop: 2 }}><StatusBadge status={selectedJob.status} /></div>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: "var(--muted)" }}>Scheduled At</span>
                                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{new Date(selectedJob.scheduledAt).toLocaleString()}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: 12, color: "var(--muted)" }}>Brand Client</span>
                                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{selectedJob.client?.companyName}</div>
                            </div>
                        </div>

                        <div className="divider" style={{ margin: "4px 0" }} />

                        <div>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>Post Text Copy / Caption</span>
                            <div style={{ fontSize: 13.5, background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid var(--border)", marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                                {selectedJob.caption || "No caption written"}
                            </div>
                        </div>

                        {selectedJob.mediaUrls && (
                            <div>
                                <span style={{ fontSize: 12, color: "var(--muted)" }}>Content Asset URL</span>
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
                            {selectedJob.task && <div style={{ marginTop: 4 }}>Linked Task Brief: <strong>{selectedJob.task.title}</strong></div>}
                            {selectedJob.shoot && <div style={{ marginTop: 4 }}>Linked Production Shoot: <strong>{selectedJob.shoot.title}</strong></div>}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                            {(selectedJob.status === "SCHEDULED" || selectedJob.status === "RESCHEDULED") && (
                                <>
                                    <Btn variant="danger" onClick={handleCancelSubmit}>
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
                                setDetailsOpen(false);
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
                            Confirm New Date
                        </Btn>
                    </div>
                </form>
            </Modal>

            {/* Create Post Modal */}
            <CreatePostModal
                open={createPostOpen}
                onClose={() => setCreatePostOpen(false)}
                onSuccess={fetchJobs}
            />
        </div>
    );
}
