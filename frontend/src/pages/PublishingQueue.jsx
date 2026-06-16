import { useState, useEffect, useCallback } from "react";
import { useApp } from "../shared/AppContext";
import {
    getPublishingQueue,
    reschedulePost,
    cancelPost,
    retryPublishingJob,
    deletePublishingJob,
} from "../services/api";
import {
    SvgIcon,
    Btn,
    StatusBadge,
    EmptyState,
    Modal,
} from "../shared/components";

export default function PublishingQueue() {
    const { clients, showToast } = useApp();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [platform, setPlatform] = useState("all");
    const [status, setStatus] = useState("all");
    const [clientId, setClientId] = useState("all");

    // Modal states
    const [selectedJob, setSelectedJob] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    
    // Reschedule states
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");

    // Cancel states
    const [cancelOpen, setCancelOpen] = useState(false);

    // Delete states
    const [deleteOpen, setDeleteOpen] = useState(false);

    // Fetch queue
    const fetchQueue = useCallback(async () => {
        try {
            setLoading(true);
            const filters = {};
            if (search.trim()) filters.search = search;
            if (platform !== "all") filters.platform = platform.toUpperCase().replace("/X", "").replace(" ", "_");
            if (status !== "all") filters.status = status;
            if (clientId !== "all") filters.clientId = clientId;

            const res = await getPublishingQueue(filters);
            setQueue(res.data || []);
        } catch (err) {
            showToast(err.message || "Failed to load publishing queue", "danger");
        } finally {
            setLoading(false);
        }
    }, [search, platform, status, clientId, showToast]);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => {
            const filters = {};
            if (search.trim()) filters.search = search;
            if (platform !== "all") filters.platform = platform.toUpperCase().replace("/X", "").replace(" ", "_");
            if (status !== "all") filters.status = status;
            if (clientId !== "all") filters.clientId = clientId;

            getPublishingQueue(filters)
                .then((res) => {
                    setQueue(res.data || []);
                })
                .catch((err) => console.error("Silent auto-refresh failed:", err));
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchQueue, search, platform, status, clientId]);

    // Handle Reschedule submit
    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedJob || !rescheduleDate || !rescheduleTime) return;

        try {
            const newDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
            await reschedulePost(selectedJob.id, newDate.toISOString());
            showToast("Post rescheduled successfully", "success");
            setRescheduleOpen(false);
            setSelectedJob(null);
            fetchQueue();
        } catch (err) {
            showToast(err.message || "Failed to reschedule post", "danger");
        }
    };

    // Handle Cancel submit
    const handleCancelSubmit = async () => {
        if (!selectedJob) return;

        try {
            await cancelPost(selectedJob.id);
            showToast("Scheduled post cancelled successfully", "success");
            setCancelOpen(false);
            setSelectedJob(null);
            fetchQueue();
        } catch (err) {
            showToast(err.message || "Failed to cancel post schedule", "danger");
        }
    };

    // Handle Delete submit
    const handleDeleteSubmit = async () => {
        if (!selectedJob) return;

        try {
            await deletePublishingJob(selectedJob.id);
            showToast("Publishing job deleted successfully", "success");
            setDeleteOpen(false);
            setSelectedJob(null);
            fetchQueue();
        } catch (err) {
            showToast(err.message || "Failed to delete post", "danger");
        }
    };

    // Compute stats
    const stats = {
        total: queue.length,
        scheduled: queue.filter(q => q.status === "SCHEDULED" || q.status === "RESCHEDULED" || q.status === "PUBLISHING").length,
        posted: queue.filter(q => q.status === "POSTED" || q.status === "PUBLISHED").length,
        failed: queue.filter(q => q.status === "FAILED" || q.status === "FAILED_TO_POST").length,
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1 className="page-title">Publishing Queue</h1>
                <p className="page-subtitle">Track, reschedule, and manage scheduled posts across brand platforms.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid-stats" style={{ marginBottom: 20 }}>
                {[
                    ["Total Items", stats.total, "var(--primary)"],
                    ["Scheduled / Active", stats.scheduled, "#0EA5E9"],
                    ["Posted", stats.posted, "var(--success)"],
                    ["Failed", stats.failed, "var(--danger)"],
                ].map(([label, value, color]) => (
                    <div key={label} className="stat-card" style={{ padding: "14px 18px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Filters panel */}
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ width: "100%" }}
                            placeholder="Search caption, title, or client..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-input"
                        style={{ width: "auto", minWidth: 140 }}
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
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
                        className="form-input"
                        style={{ width: "auto", minWidth: 140 }}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="RESCHEDULED">Rescheduled</option>
                        <option value="PUBLISHING">Publishing</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="FAILED">Failed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    <select
                        className="form-input"
                        style={{ width: "auto", minWidth: 160 }}
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        <option value="all">All Clients</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.companyName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Queue Table */}
            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: "center" }}>
                    <span className="spin" style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
                    <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13.5 }}>Fetching scheduled jobs...</p>
                </div>
            ) : queue.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<SvgIcon name="calendar" size={32} color="var(--primary)" />}
                        title="Queue is empty"
                        desc="No scheduled posts match the selected criteria."
                    />
                </div>
            ) : (
                <div className="card" style={{ overflowX: "auto" }}>
                    <table className="table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", background: "#FAFAFA" }}>
                                <th style={{ padding: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Platform</th>
                                <th style={{ padding: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Client</th>
                                <th style={{ padding: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Content Brief</th>
                                <th style={{ padding: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Scheduled Time</th>
                                <th style={{ padding: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Status</th>
                                <th style={{ padding: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {queue.map((job) => {
                                const scheduledDate = new Date(job.scheduledAt);
                                const sourceTitle = job.task ? job.task.title : (job.shoot ? job.shoot.title : "Direct Schedule");
                                return (
                                    <tr key={job.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                        <td style={{ padding: 12 }}>
                                            <span className="badge badge-orange" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                                                <SvgIcon name="target" size={12} />
                                                {job.platform}
                                            </span>
                                        </td>
                                        <td style={{ padding: 12, fontWeight: 600, fontSize: 13 }}>
                                            {job.client?.companyName || "N/A"}
                                        </td>
                                        <td style={{ padding: 12, fontSize: 13, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {sourceTitle}
                                        </td>
                                        <td style={{ padding: 12, fontSize: 13, color: "var(--muted)" }}>
                                            {scheduledDate.toLocaleString()}
                                        </td>
                                        <td style={{ padding: 12 }}>
                                            <StatusBadge status={job.status} />
                                        </td>
                                        <td style={{ padding: 12, textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                                <Btn
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedJob(job);
                                                        setDetailsOpen(true);
                                                    }}
                                                >
                                                    View
                                                </Btn>
                                                {(job.status === "SCHEDULED" || job.status === "RESCHEDULED") && (
                                                    <>
                                                        <Btn
                                                            size="xs"
                                                            variant="primary"
                                                            onClick={() => {
                                                                setSelectedJob(job);
                                                                const dt = new Date(job.scheduledAt);
                                                                setRescheduleDate(dt.toISOString().split("T")[0]);
                                                                setRescheduleTime(dt.toTimeString().split(" ")[0].slice(0, 5));
                                                                setRescheduleOpen(true);
                                                            }}
                                                        >
                                                            Reschedule
                                                        </Btn>
                                                        <Btn
                                                            size="xs"
                                                            variant="danger"
                                                            onClick={() => {
                                                                setSelectedJob(job);
                                                                setCancelOpen(true);
                                                            }}
                                                        >
                                                            Cancel
                                                        </Btn>
                                                    </>
                                                )}
                                                {job.status === "FAILED" && (
                                                    <Btn
                                                        size="xs"
                                                        variant="primary"
                                                        onClick={async () => {
                                                            try {
                                                                await retryPublishingJob(job.id);
                                                                showToast("Post queued for retry!", "success");
                                                                fetchQueue();
                                                            } catch (err) {
                                                                showToast(err.message || "Failed to retry job", "danger");
                                                            }
                                                        }}
                                                    >
                                                        Retry
                                                    </Btn>
                                                )}
                                                <Btn
                                                    size="xs"
                                                    variant="danger"
                                                    onClick={() => {
                                                        setSelectedJob(job);
                                                        setDeleteOpen(true);
                                                    }}
                                                >
                                                    Delete
                                                </Btn>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View Details Modal */}
            <Modal
                open={detailsOpen}
                onClose={() => {
                    setDetailsOpen(false);
                    setSelectedJob(null);
                }}
                title="Job Details"
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
                                {selectedJob.caption || "No caption provided"}
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
                            {selectedJob.publishedAt && <div style={{ marginTop: 4, color: "var(--success)" }}>Published At: <strong>{new Date(selectedJob.publishedAt).toLocaleString()}</strong></div>}
                            {selectedJob.attempts > 0 && <div style={{ marginTop: 4 }}>Attempts: <strong>{selectedJob.attempts}</strong></div>}
                            {selectedJob.failureReason && <div style={{ marginTop: 4, color: "var(--danger)" }}>Failure Reason: <strong>{selectedJob.failureReason}</strong></div>}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                            <Btn onClick={() => {
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
                onClose={() => {
                    setRescheduleOpen(false);
                    setSelectedJob(null);
                }}
                title="Reschedule Post"
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
                        <Btn variant="outline" onClick={() => {
                            setRescheduleOpen(false);
                            setSelectedJob(null);
                        }}>
                            Cancel
                        </Btn>
                        <Btn type="submit">
                            Save Changes
                        </Btn>
                    </div>
                </form>
            </Modal>

            {/* Cancel Confirm Modal */}
            <Modal
                open={cancelOpen}
                onClose={() => {
                    setCancelOpen(false);
                    setSelectedJob(null);
                }}
                title="Cancel Publishing Job"
                size="sm"
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                        Are you sure you want to cancel the scheduled publication for this post? This will change the status to Cancelled and stop any automated queues.
                    </p>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                        <Btn variant="outline" onClick={() => {
                            setCancelOpen(false);
                            setSelectedJob(null);
                        }}>
                            Go Back
                        </Btn>
                        <Btn variant="danger" onClick={handleCancelSubmit}>
                            Yes, Cancel Post
                        </Btn>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm Modal */}
            <Modal
                open={deleteOpen}
                onClose={() => {
                    setDeleteOpen(false);
                    setSelectedJob(null);
                }}
                title="Delete Publishing Job"
                size="sm"
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                        Are you sure you want to delete this publishing job? 
                        {selectedJob?.status === "PUBLISHED" && selectedJob?.platform.toUpperCase() === "FACEBOOK" && (
                            <span> This will also attempt to delete the published post from Facebook.</span>
                        )}
                        This action cannot be undone.
                    </p>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                        <Btn variant="outline" onClick={() => {
                            setDeleteOpen(false);
                            setSelectedJob(null);
                        }}>
                            Cancel
                        </Btn>
                        <Btn variant="danger" onClick={handleDeleteSubmit}>
                            Yes, Delete Job
                        </Btn>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
