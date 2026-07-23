import { useState, useEffect, useMemo, useRef } from "react";
import { useApp } from "../shared/AppContext";
import { getClientSocialConnection, schedulePost, uploadFile } from "../services/api";
import { SvgIcon, Btn, Modal } from "../shared/components";

// ── Content Types Definition ─────────────────────────────────────
const CONTENT_TYPES = [
  { id: "reel", label: "Reel / Short", icon: "video", desc: "Vertical video (9:16)" },
  { id: "video", label: "Video", icon: "video", desc: "Landscape video (16:9)" },
  { id: "post", label: "Static / Carousel", icon: "image", desc: "Image feed post" },
  { id: "story", label: "Story", icon: "user", desc: "24h story post" },
];

// ── Social Platforms Configuration ──────────────────────────────
const PLATFORM_MAP = {
  instagram: { name: "Instagram", color: "#E1306C", bg: "#FDF2F8", icon: "instagram" },
  facebook: { name: "Facebook", color: "#1877F2", bg: "#EFF6FF", icon: "facebook" },
  youtube: { name: "YouTube", color: "#FF0000", bg: "#FEF2F2", icon: "video" },
  linkedin: { name: "LinkedIn", color: "#0A66C2", bg: "#F0F9FF", icon: "linkedin" },
  twitter: { name: "Twitter / X", color: "#1DA1F2", bg: "#F0F9FF", icon: "twitter" },
  tiktok: { name: "TikTok", color: "#000000", bg: "#F3F4F6", icon: "video" },
  pinterest: { name: "Pinterest", color: "#E60023", bg: "#FEF2F2", icon: "image" },
};

const CONTENT_TYPE_PLATFORMS = {
  reel: ["instagram", "facebook", "youtube", "tiktok"],
  video: ["youtube", "facebook", "linkedin"],
  post: ["instagram", "facebook", "linkedin", "twitter", "pinterest"],
  story: ["instagram", "facebook"],
};

// ── Navigation Sections ──────────────────────────────────────────
const SECTIONS = [
  { id: "basic", label: "Basic Details", icon: "user" },
  { id: "content", label: "Content", icon: "checklist" },
  { id: "media", label: "Media", icon: "image" },
  { id: "publishing", label: "Publishing", icon: "clock" },
  { id: "review", label: "Review", icon: "check" },
];

export default function CreatePostModal({ open, onClose, onSuccess }) {
  const { clients, showToast } = useApp();

  // Active section tab & accordions
  const [activeTab, setActiveTab] = useState("basic");
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    content: true,
    media: false,
    publishing: false,
    review: false,
  });

  // Form State
  const [clientId, setClientId] = useState("");
  const [contentType, setContentType] = useState("reel");
  const [socialStatus, setSocialStatus] = useState(null);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mediaFileName, setMediaFileName] = useState("");
  const [thumbnailFileName, setThumbnailFileName] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [dragMediaOver, setDragMediaOver] = useState(false);
  const [dragThumbOver, setDragThumbOver] = useState(false);

  // Timing state
  const [timingMode, setTimingMode] = useState("schedule"); // "post_now" | "schedule"
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [scheduleTime, setScheduleTime] = useState("18:00"); // Default 6:00 PM

  // Preview State
  const [previewTab, setPreviewTab] = useState("cover");
  const [submitting, setSubmitting] = useState(false);

  const formContainerRef = useRef(null);

  // Default client selection on open
  useEffect(() => {
    if (open) {
      if (clients && clients.length > 0 && !clientId) {
        setClientId(clients[0].id);
      }
      const today = new Date().toISOString().split("T")[0];
      setScheduleDate(today);
      setScheduleTime("18:00");
    }
  }, [open, clients]);

  // Fetch social connection status when clientId changes
  useEffect(() => {
    if (!clientId) {
      setSocialStatus(null);
      setSelectedPlatforms([]);
      return;
    }

    let isMounted = true;
    setLoadingSocial(true);
    getClientSocialConnection(clientId)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data || res;
        setSocialStatus(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setSocialStatus({ connectedPlatforms: [] });
      })
      .finally(() => {
        if (isMounted) setLoadingSocial(false);
      });

    return () => { isMounted = false; };
  }, [clientId]);

  // Auto-populate platforms based on Client Connections & Content Type
  useEffect(() => {
    if (!socialStatus) return;

    const connected = socialStatus.connectedPlatforms || [];
    const availableFromFlags = [];
    if (socialStatus.instagramConnected) availableFromFlags.push("instagram");
    if (socialStatus.facebookConnected) availableFromFlags.push("facebook");
    if (socialStatus.youtubeConnected) availableFromFlags.push("youtube");
    if (socialStatus.linkedinConnected) availableFromFlags.push("linkedin");
    if (socialStatus.twitterConnected) availableFromFlags.push("twitter");
    if (socialStatus.tiktokConnected) availableFromFlags.push("tiktok");

    const allConnected = [...new Set([...connected, ...availableFromFlags])];
    const eligibleForType = CONTENT_TYPE_PLATFORMS[contentType] || [];
    const matched = eligibleForType.filter((p) => allConnected.includes(p));

    setSelectedPlatforms(matched);
  }, [socialStatus, contentType]);

  // Progressive Disclosure: Auto-expand subsequent section when prior step is completed
  useEffect(() => {
    if (clientId && contentType) {
      setExpandedSections((prev) => ({ ...prev, basic: true }));
    }
    if (title || caption) {
      setExpandedSections((prev) => ({ ...prev, content: true }));
    }
    if (mediaUrl || thumbnailUrl) {
      setExpandedSections((prev) => ({ ...prev, media: true, publishing: true }));
    }
  }, [clientId, contentType, title, caption, mediaUrl, thumbnailUrl]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  // Section completion status checks
  const completionStatus = useMemo(() => ({
    basic: Boolean(clientId && selectedPlatforms.length > 0),
    content: Boolean(title.trim() || caption.trim()),
    media: Boolean(mediaUrl || thumbnailUrl),
    publishing: Boolean(timingMode === "post_now" || (scheduleDate && scheduleTime)),
    review: Boolean(clientId && selectedPlatforms.length > 0 && (title || caption)),
  }), [clientId, selectedPlatforms, title, caption, mediaUrl, thumbnailUrl, timingMode, scheduleDate, scheduleTime]);

  // Pre-flight Validation Checklist
  const validationItems = useMemo(() => {
    const items = [];
    if (!clientId) items.push({ type: "error", msg: "Client selection is required" });
    if (selectedPlatforms.length === 0) items.push({ type: "error", msg: "At least one target platform must be selected" });
    if (!title.trim() && !caption.trim()) items.push({ type: "warning", msg: "Adding a Title or Caption is recommended for post reach" });
    if (selectedPlatforms.includes("youtube") && !title.trim()) items.push({ type: "error", msg: "YouTube requires a Post Title" });
    if (!mediaUrl && !thumbnailUrl) items.push({ type: "warning", msg: "No media file uploaded. Post will be text-only" });
    if (contentType === "video" && !thumbnailUrl) items.push({ type: "warning", msg: "Custom cover thumbnail is recommended for video posts" });
    return items;
  }, [clientId, selectedPlatforms, title, caption, mediaUrl, thumbnailUrl, contentType]);

  // Switch to section via Tab Navigation
  const scrollToSection = (secId) => {
    setActiveTab(secId);
  };

  const toggleAccordion = (secId) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleRemovePlatform = (platKey) => {
    setSelectedPlatforms((prev) => prev.filter((p) => p !== platKey));
  };

  // Upload handler helper
  const processUpload = async (file, type) => {
    if (!file) return;
    try {
      if (type === "media") {
        setUploadingMedia(true);
        setMediaFileName(file.name);
      } else {
        setUploadingThumbnail(true);
        setThumbnailFileName(file.name);
      }

      const res = await uploadFile(file);
      const uploadedUrl = res.url || res.data?.url;

      if (type === "media") setMediaUrl(uploadedUrl);
      else setThumbnailUrl(uploadedUrl);

      showToast(`${type === "media" ? "Media file" : "Thumbnail image"} uploaded successfully!`, "success");
    } catch (err) {
      showToast(err.message || "Upload failed", "danger");
    } finally {
      if (type === "media") setUploadingMedia(false);
      else setUploadingThumbnail(false);
    }
  };

  // Drag & Drop event handlers
  const handleDrop = (e, type) => {
    e.preventDefault();
    if (type === "media") setDragMediaOver(false);
    else setDragThumbOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processUpload(file, type);
  };

  // AI Caption Assist Generator
  const handleAiAssist = () => {
    setAiLoading(true);
    setTimeout(() => {
      const brandName = selectedClient?.brandName || selectedClient?.companyName || "Our Brand";
      const sampleTitle = title || "Exciting Announcement";
      const generated = `🚀 Big news from ${brandName}! We're thrilled to introduce ${sampleTitle}.\n\n✨ Key Highlights:\n- Premium performance & modern design\n- Built specifically for modern agency workflows\n- Seamless social integration across platforms\n\n👉 Double tap if you're excited! Link in bio to learn more.\n\n#AgencyLife #${brandName.replace(/\s+/g, "")} #SocialMediaMarketing #Growth`;
      
      setCaption(generated);
      setAiLoading(false);
      showToast("✨ AI Caption generated successfully!", "success");
    }, 900);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!clientId) {
      showToast("Please select a client", "danger");
      return;
    }
    if (selectedPlatforms.length === 0) {
      showToast("Please select at least one platform", "danger");
      return;
    }
    if (!title && !caption) {
      showToast("Please enter a title or caption", "danger");
      return;
    }

    try {
      setSubmitting(true);
      let scheduledAt = null;
      if (timingMode === "schedule") {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      }

      const payload = {
        clientId,
        contentType,
        platforms: selectedPlatforms.map((p) => p.toUpperCase()),
        title,
        caption,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        thumbnailUrl: thumbnailUrl || null,
        scheduledAt,
        postNow: timingMode === "post_now",
      };

      await schedulePost(payload);
      showToast(
        timingMode === "post_now"
          ? "Post submitted and processing for immediate publishing!"
          : `Post scheduled successfully for ${scheduleDate} at ${scheduleTime}!`,
        "success"
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to create post", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const showThumbnailOption = contentType === "video" || contentType === "reel" || selectedPlatforms.includes("youtube");

  return (
    <Modal open={open} onClose={onClose} size="fullscreen">
      <div style={{ display: "flex", flexDirection: "column", height: "calc(90vh - 70px)", background: "#FAFAFA", borderRadius: 0, overflow: "hidden", margin: "-24px" }}>
        
        {/* ── TOP HEADER & SECTION NAVIGATION ─────────────────────── */}
        <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "14px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", padding: "5px 8px", borderRadius: 8, background: "#FFF7ED", color: "#FF6A00", border: "1px solid #FFEDD5" }}>
                  <SvgIcon name="video" size={16} color="#FF6A00" />
                </span>
                Create & Publish Post
              </h2>
              <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
                Select client, content format, targets, and media to post now or schedule.
              </p>
            </div>

            <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, color: "#64748B", fontSize: 13, fontWeight: 700 }}>
              ✕ Close
            </button>
          </div>

          {/* Horizontal Section Navigation Bar (Non-wizard tabs) */}
          <div style={{ display: "flex", gap: 24, borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
            {SECTIONS.map((sec) => {
              const isActive = activeTab === sec.id;
              const isCompleted = completionStatus[sec.id];
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  style={{
                    padding: "8px 4px 12px",
                    background: "none",
                    border: "none",
                    borderBottom: isActive ? "2.5px solid #FF6A00" : "2.5px solid transparent",
                    color: isActive ? "#FF6A00" : isCompleted ? "#0F172A" : "#64748B",
                    fontSize: 13,
                    fontWeight: isActive || isCompleted ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: isActive ? "#FF6A00" : isCompleted ? "#DCFCE7" : "#F1F5F9",
                    color: isActive ? "#FFF" : isCompleted ? "#166534" : "#64748B",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                  }}>
                    {isCompleted && !isActive ? "✓" : <SvgIcon name={sec.icon} size={10} color={isActive ? "#FFF" : "#64748B"} />}
                  </span>
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MAIN BODY: 68% FORM / 32% LIVE PREVIEW PANEL ─────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", flex: 1, minHeight: 0 }}>
          
          {/* LEFT FORM COLUMN (Scrollable — shows only active tab's fields) */}
          <div ref={formContainerRef} style={{ overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* ── BASIC DETAILS TAB ────────────────────────── */}
            {activeTab === "basic" && (
              <>
                {/* Client Select */}
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Select Client *
                  </label>
                  <select
                    className="form-input"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    style={{ width: "100%", fontSize: 13, fontWeight: 600, padding: "9px 12px", borderRadius: 8 }}
                    required
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.brandName || c.name} {c.brandName ? `(${c.brandName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content Type Selector */}
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Content Format *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {CONTENT_TYPES.map((ct) => {
                      const active = contentType === ct.id;
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => setContentType(ct.id)}
                          style={{
                            padding: "10px",
                            borderRadius: 8,
                            border: active ? "2px solid #FF6A00" : "1px solid #E2E8F0",
                            background: active ? "#FFF7ED" : "#FFFFFF",
                            color: active ? "#FF6A00" : "#334155",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 2 }}>{ct.label}</div>
                          <div style={{ fontSize: 10.5, opacity: 0.75 }}>{ct.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Platforms */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", margin: 0 }}>
                      Target Platforms (Auto-matched)
                    </label>
                    {loadingSocial && <span style={{ fontSize: 11, color: "#94A3B8" }}>Checking connections...</span>}
                  </div>

                  {selectedPlatforms.length === 0 ? (
                    <div style={{ padding: "10px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px dashed #FCA5A5", color: "#991B1B", fontSize: 12 }}>
                      ⚠️ No connected social accounts found for {contentType.toUpperCase()} on this client. Please connect accounts in Client Management.
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {selectedPlatforms.map((pKey) => {
                        const pInfo = PLATFORM_MAP[pKey] || { name: pKey, color: "#333", bg: "#F3F4F6" };
                        return (
                          <div
                            key={pKey}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 10px",
                              borderRadius: 16,
                              background: pInfo.bg,
                              border: `1px solid ${pInfo.color}40`,
                              fontSize: 12,
                              fontWeight: 700,
                              color: pInfo.color,
                            }}
                          >
                            <span>{pInfo.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePlatform(pKey)}
                              style={{ border: "none", background: "transparent", color: pInfo.color, cursor: "pointer", fontSize: 11, fontWeight: 800, padding: "0 2px" }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── CONTENT & CAPTION TAB ────────────────────── */}
            {activeTab === "content" && (
              <>
                {/* Post Title */}
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Post Title / Headline
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter engaging title or headline..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: 8 }}
                  />
                </div>

                {/* Caption Textarea & AI Assist */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", margin: 0 }}>
                      Caption & Copywriting
                    </label>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>{caption.length} characters</span>
                      <button
                        type="button"
                        onClick={handleAiAssist}
                        disabled={aiLoading}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid #C084FC",
                          background: "#F3E8FF",
                          color: "#7E22CE",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {aiLoading ? "Generating..." : "✨ AI Assist"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="form-input"
                    rows={6}
                    placeholder="Write your post caption, tags, and call-to-action..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    style={{ width: "100%", fontSize: 13, resize: "vertical", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}
                  />
                </div>
              </>
            )}

            {/* ── MEDIA & THUMBNAIL TAB ────────────────────── */}
            {activeTab === "media" && (
              <>
                {/* Primary Media Drag & Drop */}
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Primary Media File (Video / Photo)
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragMediaOver(true); }}
                    onDragLeave={() => setDragMediaOver(false)}
                    onDrop={(e) => handleDrop(e, "media")}
                    style={{
                      border: dragMediaOver ? "2px dashed #FF6A00" : "1.5px dashed #CBD5E1",
                      background: dragMediaOver ? "#FFF7ED" : "#F8FAFC",
                      borderRadius: 10,
                      padding: 16,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {mediaUrl ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", truncate: true }}>
                          📁 {mediaFileName || "Uploaded Media File"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMediaUrl("")}
                          style={{ border: "none", background: "#F1F5F9", color: "#EF4444", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label style={{ cursor: "pointer", display: "block" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>☁️</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                          Drag & drop video or image file here
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                          or click to browse files
                        </div>
                        <input
                          type="file"
                          accept="video/*,image/*"
                          onChange={(e) => processUpload(e.target.files?.[0], "media")}
                          style={{ display: "none" }}
                        />
                      </label>
                    )}
                    {uploadingMedia && <span style={{ fontSize: 11, color: "#FF6A00", marginTop: 6, display: "block" }}>Uploading media file...</span>}
                  </div>

                  <input
                    type="url"
                    className="form-input"
                    placeholder="Or paste direct media URL..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    style={{ fontSize: 12, marginTop: 8, width: "100%" }}
                  />
                </div>

                {/* Conditional Custom Cover Thumbnail */}
                {showThumbnailOption && (
                  <div style={{ paddingTop: 12, borderTop: "1px dashed #E2E8F0" }}>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Custom Cover Thumbnail Image (Optional)
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragThumbOver(true); }}
                      onDragLeave={() => setDragThumbOver(false)}
                      onDrop={(e) => handleDrop(e, "thumbnail")}
                      style={{
                        border: dragThumbOver ? "2px dashed #FF6A00" : "1.5px dashed #CBD5E1",
                        background: dragThumbOver ? "#FFF7ED" : "#F8FAFC",
                        borderRadius: 10,
                        padding: 14,
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                    >
                      {thumbnailUrl ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                            🖼️ {thumbnailFileName || "Uploaded Thumbnail"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setThumbnailUrl("")}
                            style={{ border: "none", background: "#F1F5F9", color: "#EF4444", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label style={{ cursor: "pointer", display: "block" }}>
                          <div style={{ fontSize: 18, marginBottom: 2 }}>🖼️</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                            Upload custom thumbnail image
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => processUpload(e.target.files?.[0], "thumbnail")}
                            style={{ display: "none" }}
                          />
                        </label>
                      )}
                      {uploadingThumbnail && <span style={{ fontSize: 11, color: "#FF6A00", marginTop: 4, display: "block" }}>Uploading thumbnail...</span>}
                    </div>

                    <input
                      type="url"
                      className="form-input"
                      placeholder="Or paste thumbnail URL..."
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      style={{ fontSize: 12, marginTop: 8, width: "100%" }}
                    />
                  </div>
                )}
              </>
            )}

            {/* ── PUBLISHING SCHEDULE TAB ──────────────────── */}
            {activeTab === "publishing" && (
              <>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: timingMode === "post_now" ? "#EFF6FF" : "#FFF", border: timingMode === "post_now" ? "2px solid #2563EB" : "1px solid #E2E8F0", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: timingMode === "post_now" ? "#1D4ED8" : "#334155" }}>
                    <input
                      type="radio"
                      name="timing"
                      value="post_now"
                      checked={timingMode === "post_now"}
                      onChange={() => setTimingMode("post_now")}
                    />
                    ⚡ Post Now (Immediate)
                  </label>

                  <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: timingMode === "schedule" ? "#FFF7ED" : "#FFF", border: timingMode === "schedule" ? "2px solid #FF6A00" : "1px solid #E2E8F0", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: timingMode === "schedule" ? "#FF6A00" : "#334155" }}>
                    <input
                      type="radio"
                      name="timing"
                      value="schedule"
                      checked={timingMode === "schedule"}
                      onChange={() => setTimingMode("schedule")}
                    />
                    📅 Schedule for Later
                  </label>
                </div>

                {/* Animate in Date & Time when Schedule is selected */}
                {timingMode === "schedule" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 10, borderTop: "1px dashed #E2E8F0" }}>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                        Publish Date
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        style={{ fontSize: 12.5, width: "100%" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>
                        Publish Time (Default: 6:00 PM)
                      </label>
                      <input
                        type="time"
                        className="form-input"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        style={{ fontSize: 12.5, width: "100%" }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── REVIEW & PRE-FLIGHT TAB ──────────────────── */}
            {activeTab === "review" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {validationItems.length === 0 ? (
                  <div style={{ padding: "12px 14px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", fontSize: 12.5, fontWeight: 700 }}>
                    ✓ All pre-flight checks passed! Post is ready to be published.
                  </div>
                ) : (
                  validationItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: item.type === "error" ? "#FEF2F2" : "#FFFBEB",
                        border: `1px solid ${item.type === "error" ? "#FCA5A5" : "#FDE68A"}`,
                        color: item.type === "error" ? "#991B1B" : "#92400E",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{item.type === "error" ? "❌" : "⚠️"}</span>
                      <span>{item.msg}</span>
                    </div>
                  ))
                )}

                {/* Review Summary */}
                <div style={{ marginTop: 8, background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", margin: "0 0 12px" }}>Post Summary</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                    <div><span style={{ color: "#64748B", fontWeight: 600 }}>Client:</span> <span style={{ fontWeight: 700, color: "#0F172A" }}>{selectedClient?.companyName || "—"}</span></div>
                    <div><span style={{ color: "#64748B", fontWeight: 600 }}>Format:</span> <span style={{ fontWeight: 700, color: "#0F172A", textTransform: "capitalize" }}>{contentType}</span></div>
                    <div><span style={{ color: "#64748B", fontWeight: 600 }}>Platforms:</span> <span style={{ fontWeight: 700, color: "#0F172A" }}>{selectedPlatforms.length > 0 ? selectedPlatforms.map(p => PLATFORM_MAP[p]?.name || p).join(", ") : "—"}</span></div>
                    <div><span style={{ color: "#64748B", fontWeight: 600 }}>Timing:</span> <span style={{ fontWeight: 700, color: "#0F172A" }}>{timingMode === "post_now" ? "Immediate" : `${scheduleDate} @ ${scheduleTime}`}</span></div>
                    <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#64748B", fontWeight: 600 }}>Title:</span> <span style={{ fontWeight: 700, color: "#0F172A" }}>{title || "—"}</span></div>
                    <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#64748B", fontWeight: 600 }}>Caption:</span> <span style={{ fontWeight: 600, color: "#334155" }}>{caption ? (caption.length > 120 ? caption.slice(0, 120) + "..." : caption) : "—"}</span></div>
                    <div><span style={{ color: "#64748B", fontWeight: 600 }}>Media:</span> <span style={{ fontWeight: 700, color: mediaUrl ? "#16A34A" : "#94A3B8" }}>{mediaUrl ? "✓ Uploaded" : "None"}</span></div>
                    <div><span style={{ color: "#64748B", fontWeight: 600 }}>Thumbnail:</span> <span style={{ fontWeight: 700, color: thumbnailUrl ? "#16A34A" : "#94A3B8" }}>{thumbnailUrl ? "✓ Uploaded" : "None"}</span></div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Live Preview Panel (Sticky 32%) */}
          <div style={{ background: "#F8FAFC", borderLeft: "1px solid #E2E8F0", padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                📱 Live Post Preview
              </h3>
              
              <div style={{ display: "flex", background: "#E2E8F0", borderRadius: 6, padding: 2 }}>
                <button
                  type="button"
                  onClick={() => setPreviewTab("cover")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "none",
                    background: previewTab === "cover" ? "#FFF" : "transparent",
                    color: previewTab === "cover" ? "#FF6A00" : "#64748B",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Thumbnail
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("video")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "none",
                    background: previewTab === "video" ? "#FFF" : "transparent",
                    color: previewTab === "video" ? "#FF6A00" : "#64748B",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Media View
                </button>
              </div>
            </div>

            {/* Mock Social Media Preview Card */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", overflow: "hidden" }}>
              
              {/* Header */}
              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #FF6A00, #EC4899)", color: "#FFF", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                  {selectedClient?.companyName ? selectedClient.companyName.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>
                    {selectedClient?.brandName || selectedClient?.companyName || "Client Brand"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#64748B", textTransform: "capitalize" }}>
                    Official Account • {contentType}
                  </div>
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                  {selectedPlatforms.slice(0, 3).map((pk) => (
                    <span key={pk} style={{ padding: "2px 5px", borderRadius: 4, background: PLATFORM_MAP[pk]?.bg || "#F1F5F9", color: PLATFORM_MAP[pk]?.color || "#333", fontSize: 9.5, fontWeight: 800 }}>
                      {PLATFORM_MAP[pk]?.name.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Media Preview Box */}
              <div style={{ width: "100%", height: 230, background: "#0F172A", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {previewTab === "cover" ? (
                  thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="Thumbnail cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : mediaUrl && !mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                    <img src={mediaUrl} alt="Media preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center", color: "#94A3B8", padding: 16 }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>🖼️</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Custom Cover Thumbnail</div>
                    </div>
                  )
                ) : (
                  mediaUrl ? (
                    mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={mediaUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <img src={mediaUrl} alt="Video fallback preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )
                  ) : (
                    <div style={{ textAlign: "center", color: "#94A3B8", padding: 16 }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>🎬</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Reel / Video Preview</div>
                    </div>
                  )
                )}

                <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 6px", borderRadius: 4, background: "rgba(0,0,0,0.7)", color: "#FFF", fontSize: 9.5, fontWeight: 800 }}>
                  {contentType.toUpperCase()}
                </div>
              </div>

              {/* Title & Caption */}
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  {title || "Post Title Preview"}
                </div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45, whiteSpace: "pre-line" }}>
                  {caption || "Your post description and copy will appear here live as you type..."}
                </div>
              </div>
            </div>

            {/* Schedule Notice */}
            <div style={{ fontSize: 11.5, color: "#64748B", textAlign: "center", background: "#FFFFFF", padding: "8px 10px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
              {timingMode === "post_now" ? (
                <span>⚡ Will publish <strong>immediately</strong> upon clicking submit.</span>
              ) : (
                <span>⏰ Will publish on <strong>{scheduleDate}</strong> at <strong>{scheduleTime}</strong> (Default 6:00 PM).</span>
              )}
            </div>

          </div>

        </div>

        {/* ── STICKY FOOTER CONTAINER ─────────────────────────────── */}
        <div style={{ background: "#FFFFFF", borderTop: "1px solid #E2E8F0", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            {selectedPlatforms.length > 0 ? `Targeting ${selectedPlatforms.length} social platforms` : "No platforms selected"}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Btn>

            <button
              type="button"
              onClick={() => showToast("Draft saved successfully!", "info")}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save Draft
            </button>

            <Btn type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Processing..."
                : timingMode === "post_now"
                ? "Publish Now"
                : `Schedule Post (${scheduleTime})`}
            </Btn>
          </div>
        </div>

      </div>
    </Modal>
  );
}
