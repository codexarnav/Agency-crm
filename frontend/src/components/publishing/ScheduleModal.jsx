import { useState, useEffect } from "react";
import { useApp } from "../../shared/AppContext";
import { Btn } from "../../shared/components";
import { schedulePost, getClientSocialConnection } from "../../services/api";

export default function ScheduleModal({ open, onClose, task, shoot, onSuccess }) {
    const { showToast } = useApp();
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [checkingConnection, setCheckingConnection] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [caption, setCaption] = useState("");
    const [mediaUrls, setMediaUrls] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    useEffect(() => {
        if (task) {
            setCaption(task.captionCopy || "");
            setMediaUrls(task.contentLink || "");
        } else if (shoot) {
            setCaption(shoot.title || "");
            setMediaUrls(shoot.shootDraftUrl || "");
        }
        
        // Default to current date + 1 day
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split("T")[0]);
        setTime("12:00");

        // Fetch connection status of the client
        const clientId = task?.clientId || shoot?.clientId;
        if (clientId && open) {
            setCheckingConnection(true);
            getClientSocialConnection(clientId)
                .then((res) => {
                    if (res.success && res.data) {
                        setConnectionStatus(res.data);
                        // Auto-select connected platforms
                        const initial = [];
                        if (res.data.instagramConnected) initial.push("INSTAGRAM");
                        if (res.data.facebookConnected) initial.push("FACEBOOK");
                        setSelectedPlatforms(initial);
                    }
                })
                .catch((err) => {
                    console.error("Failed to load client connection status:", err);
                    showToast("Failed to verify social accounts connection", "error");
                })
                .finally(() => {
                    setCheckingConnection(false);
                });
        }
    }, [task, shoot, open]);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedPlatforms.length === 0) {
            showToast("Please select at least one platform to publish", "error");
            return;
        }
        if (!date || !time) {
            showToast("Please select both date and time", "error");
            return;
        }

        setLoading(true);
        try {
            const scheduledAt = new Date(`${date}T${time}:00`);
            const payload = {
                platforms: selectedPlatforms,
                caption,
                mediaUrls,
                scheduledAt: scheduledAt.toISOString(),
            };

            if (task) {
                payload.taskId = task.id;
            } else if (shoot) {
                payload.shootId = shoot.id;
            }

            await schedulePost(payload);
            showToast("Content scheduled successfully!", "success");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            showToast(err.message || "Failed to schedule content", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }} onClick={e => e.stopPropagation()}>
            <div style={{ background: "var(--card)", padding: 24, borderRadius: 12, width: "100%", maxWidth: 460, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Schedule for Publishing</h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Social Media Platform(s)</label>
                        {checkingConnection ? (
                            <div style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>Checking client connections...</div>
                        ) : connectionStatus ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: connectionStatus.instagramConnected ? "pointer" : "not-allowed", opacity: connectionStatus.instagramConnected ? 1 : 0.6 }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPlatforms.includes("INSTAGRAM")}
                                        disabled={!connectionStatus.instagramConnected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPlatforms([...selectedPlatforms, "INSTAGRAM"]);
                                            } else {
                                                setSelectedPlatforms(selectedPlatforms.filter(p => p !== "INSTAGRAM"));
                                            }
                                        }}
                                    />
                                    <span>Instagram {connectionStatus.instagramConnected ? `(${connectionStatus.instagramUsername || "Connected"})` : "(Not Connected)"}</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: connectionStatus.facebookConnected ? "pointer" : "not-allowed", opacity: connectionStatus.facebookConnected ? 1 : 0.6 }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPlatforms.includes("FACEBOOK")}
                                        disabled={!connectionStatus.facebookConnected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPlatforms([...selectedPlatforms, "FACEBOOK"]);
                                            } else {
                                                setSelectedPlatforms(selectedPlatforms.filter(p => p !== "FACEBOOK"));
                                            }
                                        }}
                                    />
                                    <span>Facebook {connectionStatus.facebookConnected ? `(${connectionStatus.facebookPageName || "Connected"})` : "(Not Connected)"}</span>
                                </label>
                                {!connectionStatus.instagramConnected && !connectionStatus.facebookConnected && (
                                    <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
                                        ⚠️ Client has no connected social accounts. Please link them under Client Settings.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: "var(--danger)" }}>Could not verify client connections</div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Caption / Post Copy</label>
                        <textarea 
                            value={caption} 
                            onChange={(e) => setCaption(e.target.value)} 
                            className="form-input" 
                            style={{ width: "100%", minHeight: 90 }}
                            placeholder="Write caption here..."
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Media URL (Asset Link)</label>
                        <input 
                            type="text" 
                            value={mediaUrls} 
                            onChange={(e) => setMediaUrls(e.target.value)} 
                            className="form-input" 
                            style={{ width: "100%" }}
                            placeholder="Google Drive, Dropbox, or Cloudinary URL"
                        />
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Date</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="form-input" 
                                style={{ width: "100%" }}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Time</label>
                            <input 
                                type="time" 
                                value={time} 
                                onChange={(e) => setTime(e.target.value)} 
                                className="form-input" 
                                style={{ width: "100%" }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                        <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
                        <Btn type="submit" disabled={loading}>
                            {loading ? "Scheduling..." : "Schedule Post"}
                        </Btn>
                    </div>
                </form>
            </div>
        </div>
    );
}
