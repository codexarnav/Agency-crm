import { useState, useEffect } from "react";
import { useApp } from "../../shared/AppContext";
import { Btn } from "../../shared/components";
import { schedulePost, getClientSocialConnection, uploadFile } from "../../services/api";

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
    
    // Upload & preview states
    const [mediaSource, setMediaSource] = useState("upload"); // "upload" | "link"
    const [isUploading, setIsUploading] = useState(false);
    const [previewPlatform, setPreviewPlatform] = useState("instagram");

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
        // Set default scheduling time to 6:00 PM (18:00)
        setTime("18:00");

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
                        if (res.data.twitterConnected) initial.push("TWITTER");
                        if (res.data.linkedinConnected) initial.push("LINKEDIN");
                        if (res.data.youtubeConnected) initial.push("YOUTUBE");
                        if (res.data.tiktokConnected) initial.push("TIKTOK");
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

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await uploadFile(file);
            if (res.success && res.url) {
                setMediaUrls(res.url);
                showToast("Media file uploaded successfully!", "success");
            }
        } catch (err) {
            console.error("File upload error:", err);
            showToast(err.message || "Failed to upload file", "danger");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e, isPostNow = false) => {
        if (e) e.preventDefault();
        if (selectedPlatforms.length === 0) {
            showToast("Please select at least one platform to publish", "error");
            return;
        }

        let scheduledAt;
        if (isPostNow) {
            // Post Now sets scheduled time to current timestamp
            scheduledAt = new Date();
        } else {
            if (!date || !time) {
                showToast("Please select both date and time", "error");
                return;
            }
            scheduledAt = new Date(`${date}T${time}:00`);
        }

        setLoading(true);
        try {
            const payload = {
                platforms: selectedPlatforms,
                title: task?.title || shoot?.title || "",
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
            showToast(isPostNow ? "Content published successfully!" : "Content scheduled successfully!", "success");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            showToast(err.message || "Failed to process request", "error");
        } finally {
            setLoading(false);
        }
    };

    const getPreviewMediaElement = () => {
        if (!mediaUrls) {
            return (
                <div style={{ height: 200, background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", gap: 8 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>Media Preview Placeholder</span>
                </div>
            );
        }

        // Detect if media is a video
        const isVideo = mediaUrls.includes(".mp4") || mediaUrls.includes(".mov") || mediaUrls.includes(".webm");
        if (isVideo) {
            return (
                <video src={mediaUrls} controls style={{ width: "100%", maxHeight: 220, objectFit: "contain", background: "#000" }} />
            );
        }

        return (
            <img src={mediaUrls} alt="Post Preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover" }} />
        );
    };

    const clientName = connectionStatus?.clientName || task?.clientName || shoot?.clientName || "Brand Client";
    const clientInitial = clientName.charAt(0).toUpperCase();

    return (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }} onClick={e => e.stopPropagation()}>
            <div style={{ 
                background: "var(--card)", 
                padding: 28, 
                borderRadius: 16, 
                width: "95%", 
                maxWidth: 920, 
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                maxHeight: "92vh",
                overflowY: "auto"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Publish & Schedule Hub</h3>
                        <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>Review post content and confirm layout across platforms before publishing.</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 24, padding: 4 }}>&times;</button>
                </div>

                <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                    
                    {/* Left: Input Form */}
                    <div style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 16 }}>
                        
                        <div>
                            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>Social Media Channel(s)</label>
                            {checkingConnection ? (
                                <div style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span className="spin" style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #E5E7EB", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
                                    Checking client credentials...
                                </div>
                            ) : connectionStatus ? (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#F9FAFB", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                                    {[
                                        { key: "INSTAGRAM", name: "Instagram", statusKey: "instagramConnected", usernameKey: "instagramUsername", color: "#E1306C" },
                                        { key: "FACEBOOK", name: "Facebook", statusKey: "facebookConnected", usernameKey: "facebookPageName", color: "#1877F2" },
                                        { key: "LINKEDIN", name: "LinkedIn", statusKey: "linkedinConnected", usernameKey: "linkedinUsername", color: "#0A66C2" },
                                        { key: "YOUTUBE", name: "YouTube", statusKey: "youtubeConnected", usernameKey: "youtubeUsername", color: "#FF0000" },
                                        { key: "TWITTER", name: "X (Twitter)", statusKey: "twitterConnected", usernameKey: "twitterUsername", color: "#1DA1F2" },
                                        { key: "TIKTOK", name: "TikTok", statusKey: "tiktokConnected", usernameKey: "tiktokUsername", color: "#010101" }
                                    ].map((p) => {
                                        const isConnected = connectionStatus[p.statusKey];
                                        const username = connectionStatus[p.usernameKey];
                                        return (
                                            <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: isConnected ? "pointer" : "not-allowed", opacity: isConnected ? 1 : 0.5 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPlatforms.includes(p.key)}
                                                    disabled={!isConnected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPlatforms([...selectedPlatforms, p.key]);
                                                        } else {
                                                            setSelectedPlatforms(selectedPlatforms.filter(item => item !== p.key));
                                                        }
                                                    }}
                                                    style={{ accentColor: "var(--primary)" }}
                                                />
                                                <span style={{ fontWeight: 600, color: isConnected ? p.color : "var(--muted)" }}>
                                                    {p.name} {isConnected ? `(@${username || "Connected"})` : ""}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ fontSize: 12, color: "var(--danger)" }}>Could not verify client connections. Connect them in Client Settings.</div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>Post Caption Copy</label>
                            <textarea 
                                value={caption} 
                                onChange={(e) => setCaption(e.target.value)} 
                                className="form-input" 
                                style={{ width: "100%", minHeight: 90, borderRadius: 8, fontSize: 13 }}
                                placeholder="What would you like to say in this post?..."
                            />
                        </div>

                        {/* Media Source & File Upload */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)" }}>Post Media Asset</label>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button type="button" onClick={() => setMediaSource("upload")} style={{ fontSize: 11, fontWeight: 700, border: "none", background: mediaSource === "upload" ? "var(--light-orange)" : "transparent", color: mediaSource === "upload" ? "var(--primary)" : "var(--muted)", padding: "3px 8px", borderRadius: 4, cursor: "pointer" }}>Upload File</button>
                                    <button type="button" onClick={() => setMediaSource("link")} style={{ fontSize: 11, fontWeight: 700, border: "none", background: mediaSource === "link" ? "var(--light-orange)" : "transparent", color: mediaSource === "link" ? "var(--primary)" : "var(--muted)", padding: "3px 8px", borderRadius: 4, cursor: "pointer" }}>Paste Link</button>
                                </div>
                            </div>

                            {mediaSource === "upload" ? (
                                <div style={{ 
                                    border: "2px dashed var(--border)", 
                                    borderRadius: 10, 
                                    padding: "16px 12px", 
                                    background: "#F9FAFB", 
                                    textAlign: "center",
                                    position: "relative",
                                    cursor: "pointer"
                                }}>
                                    <input 
                                        type="file" 
                                        accept="image/*,video/*"
                                        onChange={handleFileUpload} 
                                        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
                                        disabled={isUploading}
                                    />
                                    {isUploading ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--primary)" }}>
                                            <span className="spin" style={{ display: "inline-block", width: 20, height: 20, border: "2.5px solid #E5E7EB", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>Uploading assets to Cloudinary...</span>
                                        </div>
                                    ) : mediaUrls ? (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#16A34A" }}>File Uploaded Successfully!</span>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setMediaUrls(""); }} style={{ border: "none", background: "none", color: "var(--danger)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "2px 6px" }}>Remove</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)" }}>Drag or Click to Upload Media</span>
                                            <span style={{ fontSize: 11 }}>Supports image files and short videos (mp4, mov)</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <input 
                                    type="text" 
                                    value={mediaUrls} 
                                    onChange={(e) => setMediaUrls(e.target.value)} 
                                    className="form-input" 
                                    style={{ width: "100%", fontSize: 13 }}
                                    placeholder="Enter image/video URL link (Google Drive, Cloudinary)"
                                />
                            )}
                        </div>

                        {/* Date & Time Picker */}
                        <div style={{ display: "flex", gap: 12, background: "#FFFBEB", border: "1px solid #FEF08A", padding: 12, borderRadius: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#854D0E", marginBottom: 5 }}>Publishing Date</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)} 
                                    className="form-input" 
                                    style={{ width: "100%", fontSize: 12.5, background: "#fff" }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#854D0E", marginBottom: 5 }}>Publishing Time</label>
                                <input 
                                    type="time" 
                                    value={time} 
                                    onChange={(e) => setTime(e.target.value)} 
                                    className="form-input" 
                                    style={{ width: "100%", fontSize: 12.5, background: "#fff" }}
                                />
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
                            <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
                            <button 
                                type="button" 
                                onClick={(e) => handleSubmit(e, true)}
                                disabled={loading || isUploading}
                                className="btn"
                                style={{ background: "var(--light-orange)", border: "1.5px solid rgba(255,106,0,0.2)", color: "var(--primary)", fontWeight: 700, borderRadius: 8, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                Post Now
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => handleSubmit(e, false)}
                                disabled={loading || isUploading}
                                className="btn"
                                style={{ background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
                            >
                                Schedule Post
                            </button>
                        </div>
                    </div>

                    {/* Right: Live Post Mockup Preview Panel */}
                    <div style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "#F9FAFB", minWidth: 320 }}>
                        <h4 style={{ fontSize: 13.5, fontWeight: 800, margin: "0 0 12px", color: "var(--dark)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Live Post Preview</h4>
                        
                        {/* Selector tabs */}
                        <div style={{ display: "flex", gap: 4, background: "#E5E7EB", padding: 3, borderRadius: 8, marginBottom: 16 }}>
                            {[
                                { id: "instagram", label: "Instagram" },
                                { id: "facebook", label: "Facebook" },
                                { id: "linkedin", label: "LinkedIn" },
                                { id: "twitter", label: "X" }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPreviewPlatform(p.id)}
                                    style={{
                                        flex: 1,
                                        padding: "6px 4px",
                                        border: "none",
                                        background: previewPlatform === p.id ? "#fff" : "transparent",
                                        color: previewPlatform === p.id ? "var(--primary)" : "var(--muted)",
                                        fontSize: 11.5,
                                        fontWeight: 800,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        boxShadow: previewPlatform === p.id ? "0 1.5px 3px rgba(0,0,0,0.1)" : "none",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Social Mockup Display */}
                        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                            
                            {/* Platform Headers */}
                            {previewPlatform === "instagram" && (
                                <div style={{ display: "flex", alignItems: "center", justifyItems: "center", padding: "10px 12px", borderBottom: "1px solid #efefef", gap: 10 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>{clientInitial}</div>
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#262626" }}>{clientName.toLowerCase().replace(/\s+/g, "")}</span>
                                        <span style={{ fontSize: 10, color: "#8e8e8e" }}>Sponsored</span>
                                    </div>
                                    <span style={{ fontSize: 16, fontWeight: 800, color: "#262626", cursor: "pointer" }}>&bull;&bull;&bull;</span>
                                </div>
                            )}

                            {previewPlatform === "facebook" && (
                                <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #efefef", gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800 }}>{clientInitial}</div>
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#050505" }}>{clientName}</span>
                                        <span style={{ fontSize: 10.5, color: "#65676B", display: "flex", alignItems: "center", gap: 4 }}>
                                            Just now &bull; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {previewPlatform === "linkedin" && (
                                <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #efefef", gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>{clientInitial}</div>
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#000000" }}>{clientName}</span>
                                        <span style={{ fontSize: 10.5, color: "var(--muted)" }}>Marketing Lead &bull; 1st</span>
                                        <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>Just now &bull; public</span>
                                    </div>
                                </div>
                            )}

                            {previewPlatform === "twitter" && (
                                <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 14px", gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800 }}>{clientInitial}</div>
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f1419" }}>{clientName}</span>
                                            <span style={{ fontSize: 11.5, color: "#536471" }}>@{clientName.toLowerCase().replace(/\s+/g, "")} &bull; 0s</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Caption Copy Rendering */}
                            {previewPlatform !== "instagram" && previewPlatform !== "twitter" && (
                                <div style={{ padding: "8px 12px 12px", fontSize: 13, color: "#050505", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                    {caption || "This is a placeholder for your post description. Type in the input copy field to modify."}
                                </div>
                            )}

                            {/* Post media preview */}
                            <div style={{ width: "100%", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", background: "#efefef" }}>
                                {getPreviewMediaElement()}
                            </div>

                            {/* Caption below photo (Instagram / Twitter specific) */}
                            {previewPlatform === "instagram" && (
                                <div style={{ padding: 12, borderTop: "1px solid #f3f4f6" }}>
                                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                                        <span style={{ fontSize: 16, cursor: "pointer" }}>❤️</span>
                                        <span style={{ fontSize: 16, cursor: "pointer" }}>💬</span>
                                        <span style={{ fontSize: 16, cursor: "pointer" }}>✈️</span>
                                    </div>
                                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#262626" }}>
                                        <span style={{ fontWeight: 700, marginRight: 6 }}>{clientName.toLowerCase().replace(/\s+/g, "")}</span>
                                        <span style={{ whiteSpace: "pre-wrap" }}>{caption || "Post caption goes here. Update it in the input area on the left."}</span>
                                    </div>
                                </div>
                            )}

                            {previewPlatform === "twitter" && (
                                <div style={{ padding: "8px 14px 12px", borderTop: "1px solid #f3f4f6" }}>
                                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "#0f1419", whiteSpace: "pre-wrap", marginBottom: 10 }}>
                                        {caption || "Post caption goes here. Update it in the input area on the left."}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 300, color: "#536471", fontSize: 12 }}>
                                        <span>💬 0</span>
                                        <span>🔁 0</span>
                                        <span>❤️ 0</span>
                                        <span>📤</span>
                                    </div>
                                </div>
                            )}

                            {/* Facebook / LinkedIn Footers */}
                            {previewPlatform === "facebook" && (
                                <div style={{ borderTop: "1px solid #E5E7EB", display: "flex", padding: "4px 0" }}>
                                    {["Like", "Comment", "Share"].map(act => (
                                        <div key={act} style={{ flex: 1, textAlign: "center", padding: "6px 0", fontSize: 12.5, color: "#65676B", fontWeight: 600, cursor: "pointer" }}>
                                            {act === "Like" ? "👍 " : act === "Comment" ? "💬 " : "🔄 "}{act}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {previewPlatform === "linkedin" && (
                                <div style={{ borderTop: "1px solid #E5E7EB", display: "flex", padding: "4px 0" }}>
                                    {["Like", "Comment", "Repost", "Send"].map(act => (
                                        <div key={act} style={{ flex: 1, textAlign: "center", padding: "6px 0", fontSize: 12, color: "#5E5E5E", fontWeight: 600, cursor: "pointer" }}>
                                            {act === "Like" ? "👍 " : act === "Comment" ? "💬 " : act === "Repost" ? "🔄 " : "✉️ "}{act}
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
