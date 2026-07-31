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

// ── Navigation Workspaces (Single Workspace workflow) ────────────
const WORKSPACES = [
  { id: "post_details", label: "Post Details" },
];

export default function CreatePostModal({ open, onClose, onSuccess }) {
  const { clients, showToast } = useApp();

  // Active workspace tab (Only Post Details)
  const activeTab = "post_details";

  // Form State
  const [clientId, setClientId] = useState("");
  const [contentType, setContentType] = useState("reel");
  const [socialStatus, setSocialStatus] = useState(null);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Media & Thumbnail State (Managed directly inside interactive preview)
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mediaFileName, setMediaFileName] = useState("");
  const [thumbnailFileName, setThumbnailFileName] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [dragMediaOver, setDragMediaOver] = useState(false);
  const [dragThumbOver, setDragThumbOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Timing state
  const [timingMode, setTimingMode] = useState("schedule"); // "post_now" | "schedule"
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [scheduleTime, setScheduleTime] = useState("18:00"); // Default 6:00 PM

  // Preview State (cover = Thumbnail, video = Media View)
  const [previewTab, setPreviewTab] = useState("video");
  const [submitting, setSubmitting] = useState(false);

  // UI Dropdown & Popover states
  const [publishDropdownOpen, setPublishDropdownOpen] = useState(false);
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);

  const mediaFileInputRef = useRef(null);
  const thumbnailFileInputRef = useRef(null);
  const publishContainerRef = useRef(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (publishContainerRef.current && !publishContainerRef.current.contains(e.target)) {
        setPublishDropdownOpen(false);
        setSchedulePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form to blank state
  const resetForm = () => {
    setTitle("");
    setCaption("");
    setMediaUrl("");
    setThumbnailUrl("");
    setMediaFileName("");
    setThumbnailFileName("");
    setContentType("reel");
    setSelectedPlatforms([]);
    const today = new Date().toISOString().split("T")[0];
    setScheduleDate(today);
    setScheduleTime("18:00");
    setTimingMode("schedule");
    setPreviewTab("video");
    setShowUrlInput(false);
    setPublishDropdownOpen(false);
    setSchedulePopoverOpen(false);
  };

  // Default client selection on open
  useEffect(() => {
    if (open) {
      resetForm();
      if (clients && clients.length > 0 && !clientId) {
        setClientId(clients[0].id);
      }
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
      .catch(() => {
        if (!isMounted) return;
        setSocialStatus({ connectedPlatforms: [] });
      })
      .finally(() => {
        if (isMounted) setLoadingSocial(false);
      });

    return () => { isMounted = false; };
  }, [clientId]);

  // Compute connected platforms from social status
  const connectedPlatformsList = useMemo(() => {
    if (!socialStatus) return [];
    const connected = socialStatus.connectedPlatforms || [];
    const availableFromFlags = [];
    if (socialStatus.instagramConnected) availableFromFlags.push("instagram");
    if (socialStatus.facebookConnected) availableFromFlags.push("facebook");
    if (socialStatus.youtubeConnected) availableFromFlags.push("youtube");
    if (socialStatus.linkedinConnected) availableFromFlags.push("linkedin");
    if (socialStatus.twitterConnected) availableFromFlags.push("twitter");
    if (socialStatus.tiktokConnected) availableFromFlags.push("tiktok");
    return [...new Set([...connected, ...availableFromFlags])];
  }, [socialStatus]);

  // Auto-populate platforms based on Client Connections & Content Type
  useEffect(() => {
    if (!socialStatus) return;

    const eligibleForType = CONTENT_TYPE_PLATFORMS[contentType] || [];
    const matched = eligibleForType.filter((p) => connectedPlatformsList.includes(p));

    setSelectedPlatforms(matched);
  }, [socialStatus, contentType, connectedPlatformsList]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  const handleRemovePlatform = (platKey) => {
    setSelectedPlatforms((prev) => prev.filter((p) => p !== platKey));
  };

  const handleTogglePlatform = (platKey) => {
    if (selectedPlatforms.includes(platKey)) {
      setSelectedPlatforms((prev) => prev.filter((p) => p !== platKey));
    } else {
      setSelectedPlatforms((prev) => [...prev, platKey]);
    }
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

  // Drag & Drop event handlers for Interactive Preview Surface
  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
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
  const handleSubmit = async (overrideMode = null) => {
    const activeMode = overrideMode || timingMode;
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
      if (activeMode === "schedule") {
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
        postNow: activeMode === "post_now",
      };

      await schedulePost(payload);
      showToast(
        activeMode === "post_now"
          ? "Post submitted and processing for immediate publishing!"
          : `Post scheduled successfully for ${scheduleDate} at ${scheduleTime}!`,
        "success"
      );

      resetForm();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to create post", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="fullscreen" hideHeader>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(90vh - 70px)", background: "#FAFAFA", borderRadius: 0, overflow: "hidden", margin: "-24px" }}>
        
        {/* Hidden File Inputs for Interactive Preview */}
        <input
          type="file"
          ref={mediaFileInputRef}
          accept="video/*,image/*"
          onChange={(e) => processUpload(e.target.files?.[0], "media")}
          style={{ display: "none" }}
        />
        <input
          type="file"
          ref={thumbnailFileInputRef}
          accept="image/*"
          onChange={(e) => processUpload(e.target.files?.[0], "thumbnail")}
          style={{ display: "none" }}
        />

        {/* ── TOP HEADER & WORKSPACE NAVIGATION ─────────────────── */}
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
                Select client, content format, metadata, and schedule settings for your post.
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "50%",
                color: "#64748B",
                fontSize: 16,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#0F172A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
            >
              ✕
            </button>
          </div>

          {/* Navigation Bar (Post Details ONLY) */}
          <div style={{ display: "flex", gap: 24, borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
            {WORKSPACES.map((ws) => {
              const isActive = activeTab === ws.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  style={{
                    padding: "8px 4px 12px",
                    background: "none",
                    border: "none",
                    borderBottom: isActive ? "2.5px solid #FF6A00" : "2.5px solid transparent",
                    color: isActive ? "#0F172A" : "#64748B",
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {ws.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MAIN BODY: LEFT FORM / RIGHT INTERACTIVE PREVIEW PANEL ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 410px", flex: 1, minHeight: 0 }}>
          
          {/* LEFT FORM COLUMN (Post Details Metadata & Copywriting Only) */}
          <div style={{ overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
            
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

            {/* Content Format Selector */}
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

            {/* Target Platforms & Connected Accounts */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", margin: 0 }}>
                  Target Platforms & Connected Accounts
                </label>
                {loadingSocial && <span style={{ fontSize: 11, color: "#94A3B8" }}>Checking connections...</span>}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(CONTENT_TYPE_PLATFORMS[contentType] || []).map((pKey) => {
                  const pInfo = PLATFORM_MAP[pKey] || { name: pKey, color: "#333", bg: "#F3F4F6" };
                  const isConnected = connectedPlatformsList.includes(pKey);
                  const isSelected = selectedPlatforms.includes(pKey);

                  if (isConnected && isSelected) {
                    // Connected & selected: colored pill with ✕
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
                          border: `1.5px solid ${pInfo.color}50`,
                          fontSize: 12,
                          fontWeight: 700,
                          color: pInfo.color,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{pInfo.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePlatform(pKey)}
                          style={{ border: "none", background: "transparent", color: pInfo.color, cursor: "pointer", fontSize: 11, fontWeight: 800, padding: "0 2px", lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  }

                  if (isConnected && !isSelected) {
                    // Connected but deselected: faded pill, clickable to re-add
                    return (
                      <div
                        key={pKey}
                        onClick={() => handleTogglePlatform(pKey)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 10px",
                          borderRadius: 16,
                          background: "#F8FAFC",
                          border: `1.5px dashed ${pInfo.color}40`,
                          fontSize: 12,
                          fontWeight: 600,
                          color: pInfo.color,
                          opacity: 0.6,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title={`Click to add ${pInfo.name}`}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.borderStyle = "solid"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.borderStyle = "dashed"; }}
                      >
                        <span style={{ fontSize: 11 }}>+</span>
                        <span>{pInfo.name}</span>
                      </div>
                    );
                  }

                  // Not connected: greyed out pill
                  return (
                    <div
                      key={pKey}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: 16,
                        background: "#F1F5F9",
                        border: "1.5px solid #E2E8F0",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#94A3B8",
                        cursor: "not-allowed",
                        opacity: 0.5,
                      }}
                      title={`${pInfo.name} is not connected for this client`}
                    >
                      <span style={{ fontSize: 10 }}>🔒</span>
                      <span>{pInfo.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

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

            {/* Caption Textarea & AI Assist (Heading changed to "Caption") */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", margin: 0 }}>
                  Caption
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
                rows={7}
                placeholder="Write your post caption, tags, and call-to-action..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{ width: "100%", fontSize: 13, resize: "vertical", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}
              />
            </div>

          </div>

          {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW & MEDIA UPLOAD SURFACE */}
          <div style={{ background: "#F8FAFC", borderLeft: "1px solid #E2E8F0", padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            
            {/* Header with Mode Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                📱 Live Post Preview
              </h3>
              
              <div style={{ display: "flex", background: "#E2E8F0", borderRadius: 6, padding: 2 }}>
                <button
                  type="button"
                  onClick={() => setPreviewTab("cover")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: "none",
                    background: previewTab === "cover" ? "#FFF" : "transparent",
                    color: previewTab === "cover" ? "#FF6A00" : "#64748B",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: previewTab === "cover" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  Thumbnail
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("video")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: "none",
                    background: previewTab === "video" ? "#FFF" : "transparent",
                    color: previewTab === "video" ? "#FF6A00" : "#64748B",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: previewTab === "video" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  Media View
                </button>
              </div>
            </div>

            {/* Interactive Mock Social Preview Card */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", overflow: "hidden" }}>
              
              {/* Account Header */}
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

              {/* ── INTERACTIVE MEDIA PREVIEW SURFACE (Figma / Notion style upload) ── */}
              <div style={{ width: "100%", position: "relative" }}>
                {previewTab === "cover" ? (
                  /* THUMBNAIL MODE */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragThumbOver(true); }}
                    onDragLeave={() => setDragThumbOver(false)}
                    onDrop={(e) => handleDrop(e, "thumbnail")}
                    style={{
                      width: "100%",
                      height: 240,
                      background: dragThumbOver ? "#FFF7ED" : "#0F172A",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: dragThumbOver ? "2px dashed #FF6A00" : "none",
                      transition: "all 0.15s ease",
                      overflow: "hidden",
                    }}
                  >
                    {thumbnailUrl ? (
                      /* Thumbnail Loaded state with overlay actions */
                      <div style={{ width: "100%", height: "100%", position: "relative" }} className="media-preview-hover-container">
                        <img src={thumbnailUrl} alt="Thumbnail preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        
                        {/* Overlay Controls */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(15, 23, 42, 0.55)",
                          backdropFilter: "blur(2px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                        >
                          <button
                            type="button"
                            onClick={() => thumbnailFileInputRef.current?.click()}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              background: "#FFFFFF",
                              color: "#0F172A",
                              fontSize: 11.5,
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                          >
                            📷 Replace Thumbnail
                          </button>
                          <button
                            type="button"
                            onClick={() => setThumbnailUrl("")}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "#FEF2F2",
                              color: "#EF4444",
                              fontSize: 11.5,
                              fontWeight: 700,
                              border: "1px solid #FCA5A5",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Thumbnail Upload Dropzone (Empty State) */
                      <div
                        onClick={() => thumbnailFileInputRef.current?.click()}
                        style={{
                          textAlign: "center",
                          color: dragThumbOver ? "#FF6A00" : "#94A3B8",
                          padding: 20,
                          cursor: "pointer",
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px dashed rgba(255,255,255,0.2)",
                          margin: 12,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 30, marginBottom: 6 }}>🖼️</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                          {dragThumbOver ? "Drop thumbnail here" : "Click to upload thumbnail"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                          Drag & drop image file directly onto preview
                        </div>
                      </div>
                    )}

                    {uploadingThumbnail && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6A00", fontWeight: 700, fontSize: 12 }}>
                        Uploading thumbnail...
                      </div>
                    )}

                    <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 6px", borderRadius: 4, background: "rgba(0,0,0,0.75)", color: "#FFF", fontSize: 9.5, fontWeight: 800 }}>
                      THUMBNAIL PREVIEW
                    </div>
                  </div>
                ) : (
                  /* MEDIA VIEW MODE */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragMediaOver(true); }}
                    onDragLeave={() => setDragMediaOver(false)}
                    onDrop={(e) => handleDrop(e, "media")}
                    style={{
                      width: "100%",
                      height: 240,
                      background: dragMediaOver ? "#FFF7ED" : "#0F172A",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: dragMediaOver ? "2px dashed #FF6A00" : "none",
                      transition: "all 0.15s ease",
                      overflow: "hidden",
                    }}
                  >
                    {mediaUrl ? (
                      /* Media Loaded state with hover overlay actions */
                      <div style={{ width: "100%", height: "100%", position: "relative" }}>
                        {mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                          <video src={mediaUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <img src={mediaUrl} alt="Media preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}

                        {/* Hover Overlay Controls */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(15, 23, 42, 0.55)",
                          backdropFilter: "blur(2px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                        >
                          <button
                            type="button"
                            onClick={() => mediaFileInputRef.current?.click()}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              background: "#FFFFFF",
                              color: "#0F172A",
                              fontSize: 11.5,
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                          >
                            📁 Replace Media
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaUrl("")}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "#FEF2F2",
                              color: "#EF4444",
                              fontSize: 11.5,
                              fontWeight: 700,
                              border: "1px solid #FCA5A5",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Media Upload Dropzone (Empty State) */
                      <div
                        onClick={() => mediaFileInputRef.current?.click()}
                        style={{
                          textAlign: "center",
                          color: dragMediaOver ? "#FF6A00" : "#94A3B8",
                          padding: 20,
                          cursor: "pointer",
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px dashed rgba(255,255,255,0.2)",
                          margin: 12,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 6 }}>☁️</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                          {dragMediaOver ? "Drop video or image here" : "Click to upload media"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                          Supports MP4, MOV, PNG, JPG files
                        </div>
                      </div>
                    )}

                    {uploadingMedia && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF6A00", fontWeight: 700, fontSize: 12 }}>
                        Uploading media file...
                      </div>
                    )}

                    <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 6px", borderRadius: 4, background: "rgba(0,0,0,0.75)", color: "#FFF", fontSize: 9.5, fontWeight: 800 }}>
                      {contentType.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Paste URL Toggle Link */}
              <div style={{ padding: "6px 12px", background: "#F8FAFC", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  style={{ border: "none", background: "none", color: "#2563EB", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  {showUrlInput ? "Hide URL input" : "🔗 Paste direct URL link instead"}
                </button>
              </div>

              {showUrlInput && (
                <div style={{ padding: "8px 12px", background: "#FFF", borderTop: "1px solid #F1F5F9" }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="Paste direct media or thumbnail URL..."
                    value={previewTab === "cover" ? thumbnailUrl : mediaUrl}
                    onChange={(e) => {
                      if (previewTab === "cover") setThumbnailUrl(e.target.value);
                      else setMediaUrl(e.target.value);
                    }}
                    style={{ fontSize: 12, width: "100%", padding: "5px 8px" }}
                  />
                </div>
              )}

              {/* Live Title & Caption Preview */}
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  {title || "Post Title Preview"}
                </div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45, whiteSpace: "pre-line" }}>
                  {caption || "Your post description and copy will appear here live as you type..."}
                </div>
              </div>
            </div>

            {/* Schedule Notice Banner */}
            <div style={{ fontSize: 11.5, color: "#475569", textAlign: "center", background: "#FFFFFF", padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              {timingMode === "post_now" ? (
                <span>⚡ Scheduled to publish <strong>immediately</strong> upon submission.</span>
              ) : (() => {
                const [yr, mo, dy] = scheduleDate.split("-");
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const formattedDate = `${parseInt(dy)} ${months[parseInt(mo)-1]} ${yr}`;
                const [hh, mm] = scheduleTime.split(":");
                const h = parseInt(hh);
                const ampm = h >= 12 ? "PM" : "AM";
                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                const formattedTime = `${h12}:${mm} ${ampm}`;
                return <span>⏰ Scheduled to publish on <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong> ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</span>;
              })()}
            </div>

          </div>

        </div>

        {/* ── STICKY FOOTER CONTAINER & SPLIT PUBLISH DROPDOWN ──────────── */}
        <div style={{ background: "#FFFFFF", borderTop: "1px solid #E2E8F0", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, position: "relative" }}>
          
          <div style={{ fontSize: 12, color: "#64748B" }}>
            {selectedPlatforms.length > 0 ? `Targeting ${selectedPlatforms.length} social platforms` : "No platforms selected"}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }} ref={publishContainerRef}>
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

            {/* ── SPLIT DROPDOWN BUTTON (GitHub / Vercel / Linear Style) ── */}
            <div style={{ display: "inline-flex", borderRadius: 8, overflow: "visible", boxShadow: "0 1.5px 4px rgba(255,106,0,0.25)" }}>
              
              {/* Primary Action Trigger */}
              <button
                type="button"
                onClick={() => handleSubmit(timingMode)}
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                  border: "none",
                  background: "#FF6A00",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRight: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                {submitting
                  ? "Processing..."
                  : timingMode === "post_now"
                  ? "⚡ Publish Now"
                  : (() => {
                      const [hh, mm] = scheduleTime.split(":");
                      const h = parseInt(hh);
                      const ampm = h >= 12 ? "PM" : "AM";
                      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                      return `📅 Schedule Post (${h12}:${mm} ${ampm})`;
                    })()}
              </button>

              {/* Dropdown Caret Trigger */}
              <button
                type="button"
                onClick={() => {
                  setPublishDropdownOpen(!publishDropdownOpen);
                  setSchedulePopoverOpen(false);
                }}
                disabled={submitting}
                style={{
                  padding: "8px 10px",
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                  border: "none",
                  background: "#FF6A00",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ▼
              </button>
            </div>

            {/* ── FLOATING PUBLISH DROPDOWN MENU ──────────────────── */}
            {publishDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  right: 0,
                  width: 210,
                  background: "#FFFFFF",
                  borderRadius: 10,
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
                  border: "1px solid #E2E8F0",
                  padding: "6px 0",
                  zIndex: 100,
                  animation: "fadeIn 0.15s ease-out",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTimingMode("post_now");
                    setPublishDropdownOpen(false);
                    handleSubmit("post_now");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: timingMode === "post_now" ? "#FFF7ED" : "transparent",
                    border: "none",
                    color: timingMode === "post_now" ? "#FF6A00" : "#0F172A",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  ⚡ Publish Now
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTimingMode("schedule");
                    setPublishDropdownOpen(false);
                    setSchedulePopoverOpen(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: timingMode === "schedule" ? "#FFF7ED" : "transparent",
                    border: "none",
                    color: timingMode === "schedule" ? "#FF6A00" : "#0F172A",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  📅 Schedule for Later
                </button>
              </div>
            )}

            {/* ── SCHEDULE POPOVER (Anchored to Publish Button) ──────── */}
            {schedulePopoverOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 10px)",
                  right: 0,
                  width: 290,
                  background: "#FFFFFF",
                  borderRadius: 12,
                  boxShadow: "0 20px 30px -10px rgba(0,0,0,0.18), 0 10px 15px -5px rgba(0,0,0,0.1)",
                  border: "1px solid #E2E8F0",
                  padding: 16,
                  zIndex: 101,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>
                    📅 Schedule Post
                  </div>
                  <button
                    type="button"
                    onClick={() => setSchedulePopoverOpen(false)}
                    style={{ border: "none", background: "none", color: "#94A3B8", cursor: "pointer", fontSize: 14 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Publish Date *
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      style={{ fontSize: 12.5, width: "100%", padding: "7px 10px", borderRadius: 6 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Publish Time *
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {/* Hour Select */}
                      <select
                        value={scheduleTime.split(":")[0]}
                        onChange={(e) => {
                          const mins = scheduleTime.split(":")[1] || "00";
                          setScheduleTime(`${e.target.value}:${mins}`);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1.5px solid #E2E8F0",
                          background: "#FFFFFF",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0F172A",
                          cursor: "pointer",
                          outline: "none",
                          appearance: "none",
                          textAlign: "center",
                        }}
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const val = String(i).padStart(2, "0");
                          const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
                          const ampm = i >= 12 ? "PM" : "AM";
                          return <option key={val} value={val}>{h12} {ampm}</option>;
                        })}
                      </select>

                      <span style={{ fontSize: 16, fontWeight: 800, color: "#334155" }}>:</span>

                      {/* Minute Select */}
                      <select
                        value={scheduleTime.split(":")[1] || "00"}
                        onChange={(e) => {
                          const hrs = scheduleTime.split(":")[0] || "18";
                          setScheduleTime(`${hrs}:${e.target.value}`);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1.5px solid #E2E8F0",
                          background: "#FFFFFF",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0F172A",
                          cursor: "pointer",
                          outline: "none",
                          appearance: "none",
                          textAlign: "center",
                        }}
                      >
                        {Array.from({ length: 60 }, (_, i) => {
                          const val = String(i).padStart(2, "0");
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "#64748B", background: "#F8FAFC", padding: "6px 8px", borderRadius: 6 }}>
                    Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTimingMode("schedule");
                      setSchedulePopoverOpen(false);
                      showToast(`Schedule confirmed for ${scheduleDate} at ${scheduleTime}`, "info");
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: 6,
                      background: "#FF6A00",
                      color: "#FFFFFF",
                      fontSize: 12.5,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      marginTop: 4,
                    }}
                  >
                    Done & Confirm
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </Modal>
  );
}
