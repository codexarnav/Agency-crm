// Task-related constants, badge components, and helper functions
import { SvgIcon, Modal, Btn, FormInput, InfoRow } from "./components";
import { LSUtils } from "./utils";
import { LS_KEYS } from "./constants";
import { useApp } from "./AppContext";
import { useState, useEffect } from "react";
import { updateTask, createTask, getRevisions, createRevision } from "../services/api";
import ScheduleModal from "../components/publishing/ScheduleModal";


export const MAX_REVISIONS = 2;

/* -- Shared status constants used by all module pages -- */
const CONTENT_TYPES_LIST = ["Reel", "Short", "Static Post", "Carousel", "Story", "YouTube Video", "Thumbnail", "Caption", "Content Idea", "Script", "Ad Creative", "Blog Post"];
const PLATFORMS_LIST = ["Instagram", "Facebook", "YouTube", "LinkedIn", "Twitter/X", "Pinterest", "Google Ads", "Snapchat", "WhatsApp Business"];
const PRIORITIES_LIST = ["low", "medium", "high", "urgent"];
const PROD_STATUSES_LIST = ["todo", "in_progress", "ready_for_review", "changes_required", "blocked", "completed"];
const APPROV_STATUSES_LIST = ["pending", "manager_approved", "sent_to_client", "client_approved", "client_rejected", "final_approved"];
const PUB_STATUSES_LIST = ["not_scheduled", "scheduled", "posted", "failed", "rescheduled"];

const PROD_LABELS_MAP = { todo: "To-Do", in_progress: "In Progress", ready_for_review: "Ready for Review", changes_required: "Changes Required", blocked: "Blocked", completed: "Completed" };
const APPROV_LABELS_MAP = { pending: "Pending", manager_approved: "Manager Approved", sent_to_client: "Sent to Client", client_approved: "Client Approved", client_rejected: "Changes Requested", final_approved: "Final Approved" };
const PUB_LABELS_MAP = { not_scheduled: "Not Scheduled", scheduled: "Scheduled", posted: "Posted", failed: "Failed to Post", rescheduled: "Rescheduled" };
const PRIO_LABELS_MAP = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

const PROD_COLORS = { todo: ["#F3F4F6", "#374151"], in_progress: ["#DBEAFE", "#1D4ED8"], ready_for_review: ["#EDE9FE", "#5B21B6"], changes_required: ["#FEF9C3", "#854D0E"], blocked: ["#FEE2E2", "#B91C1C"], completed: ["#DCFCE7", "#166534"] };
const APPROV_COLORS = { pending: ["#FEF9C3", "#854D0E"], manager_approved: ["#DBEAFE", "#1D4ED8"], sent_to_client: ["#E0E7FF", "#3730A3"], client_approved: ["#DCFCE7", "#166534"], client_rejected: ["#FEE2E2", "#B91C1C"], final_approved: ["#DCFCE7", "#166534"] };
const PUB_COLORS = { not_scheduled: ["#F3F4F6", "#374151"], scheduled: ["#DBEAFE", "#1D4ED8"], posted: ["#DCFCE7", "#166534"], failed: ["#FEE2E2", "#B91C1C"], rescheduled: ["#FEF9C3", "#854D0E"] };
const PRIO_COLORS = { low: ["#F3F4F6", "#374151"], medium: ["#FEF9C3", "#854D0E"], high: ["#FED7AA", "#C2410C"], urgent: ["#FEE2E2", "#B91C1C"] };


// MicroBadge components
function MicroBadge({ label, colors }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: colors[0], color: colors[1], whiteSpace: "nowrap" }}>{label}</span>;
}
function ProdMBadge({ s }) { return <MicroBadge label={PROD_LABELS_MAP[s] || s} colors={PROD_COLORS[s] || ["#F3F4F6", "#374151"]} />; }
function ApprovMBadge({ s }) { return <MicroBadge label={APPROV_LABELS_MAP[s] || s} colors={APPROV_COLORS[s] || ["#F3F4F6", "#374151"]} />; }
function PubMBadge({ s }) { return <MicroBadge label={PUB_LABELS_MAP[s] || s} colors={PUB_COLORS[s] || ["#F3F4F6", "#374151"]} />; }
function PrioMBadge({ s }) { return <MicroBadge label={PRIO_LABELS_MAP[s] || s} colors={PRIO_COLORS[s] || ["#F3F4F6", "#374151"]} />; }
function AIBadgeSmall() { return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#EDE9FE", color: "#5B21B6" }}><SvgIcon name="target" size={11} color="#5B21B6" /> AI</span>; }

// AI assignment helpers
const AI_SKILL_RULES = {
  "Reel": ["Reel Editor", "Video Editor", "Motion Designer"], "Short": ["Reel Editor", "Video Editor", "Motion Designer"],
  "YouTube Video": ["Video Editor", "Motion Designer"], "Static Post": ["Graphic Designer", "Thumbnail Designer"],
  "Carousel": ["Graphic Designer"], "Story": ["Graphic Designer", "Social Media Manager"],
  "Thumbnail": ["Thumbnail Designer", "Graphic Designer"], "Ad Creative": ["Graphic Designer"],
  "Caption": ["Copywriter", "Content Writer"], "Script": ["Copywriter", "Content Writer"],
  "Content Idea": ["Strategist", "Content Writer"], "Blog Post": ["Content Writer", "Copywriter"],
};

function doAIAssign(contentType, employees) {
  const roles = AI_SKILL_RULES[contentType] || ["Graphic Designer"];
  const eligible = employees.filter(e => {
    const a = e.availability || "available";
    if (["on_leave", "overloaded", "not_available"].includes(a)) return false;
    return roles.some(r => e.designation === r || (e.skills || []).some(s => s.toLowerCase().includes(r.toLowerCase())));
  });
  if (!eligible.length) return null;
  return eligible.sort((a, b) => (a.currentLoad || 0) - (b.currentLoad || 0))[0];
}

function calcInternalDeadline(postDate, contentType, priority) {
  if (!postDate) return "";
  const d = new Date(postDate);
  const isUrgent = priority === "urgent";
  const daysMap = { "Reel": 2, "Short": 2, "YouTube Video": 4, "Carousel": 2, "Static Post": 1, "Story": 1, "Thumbnail": 2, "Caption": 2, "Script": 2, "Content Idea": 1, "Ad Creative": 2, "Blog Post": 3 };
  d.setDate(d.getDate() - (isUrgent ? 1 : (daysMap[contentType] || 2)));
  return d.toISOString().split("T")[0];
}

function calcDayName(ds) {
  if (!ds) return "";
  return new Date(ds).toLocaleDateString("en-US", { weekday: "long" });
}

// Approval helpers
function approvalStep(task) {
  const prod = task.productionStatus;
  const approv = task.approvalStatus;
  if (approv === "final_approved") return 4;
  if (approv === "client_approved") return 3;
  if (approv === "sent_to_client") return 2;
  if (approv === "manager_approved") return 2;
  if (prod === "ready_for_review" || prod === "review") return 1;
  return 0;
}

// Update task + write to localStorage + log + notify
function persistTaskUpdate(taskId, changes, sessionId, notifyTargets = [], notifTitle = "", notifMsg = "") {
  const all = LSUtils.getData(LS_KEYS.TASKS) || [];
  const updated = all.map(t => t.id === taskId ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t);
  LSUtils.setData(LS_KEYS.TASKS, updated);
  LSUtils.createActivityLog("approval_action", "task", taskId, sessionId, changes);
  notifyTargets.forEach(uid => {
    if (uid) LSUtils.createNotification(uid, "approval", notifTitle, notifMsg);
  });
  return updated.find(t => t.id === taskId);
}

// Add revision record to LS and DB
function addRevision(taskId, rev) {
  const all = LSUtils.getData(LS_KEYS.REVISIONS) || [];
  const entry = { id: `rev_${Date.now()}`, taskId, ...rev, createdAt: new Date().toISOString() };
  LSUtils.setData(LS_KEYS.REVISIONS, [...all, entry]);

  // Persist to DB in background
  createRevision(taskId, rev).catch(err => {
    console.error("Failed to persist revision to database:", err);
  });

  return entry;
}

// ApprovalTimeline
function ApprovalTimeline({ task }) {
  const step = approvalStep(task);
  const steps = [
    { label: "In Production", sub: "Employee working on content" },
    { label: "Ready for Manager Review", sub: "Submitted by employee, awaiting manager" },
    { label: "Sent to Client", sub: "Manager approved  -  awaiting client review" },
    { label: "Client Approved", sub: "Client has reviewed and approved" },
    { label: "Final Approved", sub: "Fully approved  -  ready for publishing" },
  ];
  return (
    <div className="approval-timeline">
      {steps.map((s, i) => {
        const isDone = step > i;
        const isActive = step === i;
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="timeline-step">
            <div className="timeline-dot-col">
              <div className={`timeline-dot ${isDone ? "done" : isActive ? "active" : "waiting"}`}>
                {isDone ? <SvgIcon name="check" size={13} color="#fff" /> : <span style={{ fontSize: 11, fontWeight: 800 }}>{i + 1}</span>}
              </div>
              {!isLast && <div className={`timeline-line ${isDone ? "done" : ""}`} />}
            </div>
            <div className="timeline-content">
              <div className="timeline-title" style={{ color: isDone ? "var(--success)" : isActive ? "var(--primary)" : "var(--muted)" }}>{s.label}</div>
              <div className="timeline-sub">{s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// RevisionHistory
function RevisionHistory({ task }) {
  const [revs, setRevs] = useState([]);
  const [loading, setLoading] = useState(true);
  const count = task.revisionCount || 0;
  const atLimit = count >= MAX_REVISIONS;

  useEffect(() => {
    let active = true;
    if (!task?.id) return;
    setLoading(true);
    getRevisions(task.id)
      .then(res => {
        if (active) setRevs(res.data || []);
      })
      .catch(err => {
        console.error("Failed to load revisions:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [task?.id]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)" }}>Revision History</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[...Array(MAX_REVISIONS)].map((_, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: i < count ? (atLimit && i === MAX_REVISIONS - 1 ? "var(--danger)" : "var(--warning)") : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: i < count ? "#fff" : "var(--muted)" }}>R{i + 1}</span>
            </div>
          ))}
          <span style={{ fontSize: 11.5, color: atLimit ? "var(--danger)" : "var(--muted)", fontWeight: 600 }}>{count}/{MAX_REVISIONS}</span>
        </div>
      </div>

      {atLimit && (
        <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "9px 12px", marginBottom: 10, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
          Maximum revision limit reached. Next version must be final.
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Loading revisions...</p>
      ) : revs.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>No revisions yet.</p>
      ) : revs.map((r, i) => (
        <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "11px 14px", marginBottom: 8, background: "#FAFAFA" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 800, background: "#FEF9C3", color: "#854D0E", padding: "2px 8px", borderRadius: 99 }}>
              {i === 0 ? "Version 1" : `Revision ${i}`}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--dark)", lineHeight: 1.55, marginBottom: r.updatedContentLink ? 6 : 0 }}><span style={{ fontWeight: 600, color: "var(--muted)" }}>{r.feedbackBy}:</span> {r.feedbackComment}</p>
          {r.updatedContentLink && (
            <a href={r.updatedContentLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>View updated content</a>
          )}
        </div>
      ))}
    </div>
  );
}

function getCleanLinkLabel(url, taskType = "") {
  if (!url) return "";
  if (typeof url !== "string") return String(url);
  if (url.includes("res.cloudinary.com")) {
    if (taskType === "Script" || taskType === "SCRIPT" || taskType?.toLowerCase() === "script") {
      return "Script Brief Document";
    }
    return "View Attached Content";
  }
  return url;
}

// ApprovalModal
function ApprovalModal({ open, onClose, task, onAction, role }) {
  const { employees, session, showToast } = useApp();
  const [activeTab, setActiveTab] = useState("preview");
  const [managerNote, setManagerNote] = useState(task?.managerNotes || "");
  const [feedbackText, setFeedbackText] = useState("");
  const [contentLink, setContentLink] = useState(task?.contentLink || "");
  const [pubStatus, setPubStatus] = useState(task?.publishingStatus || "not_scheduled");

  useEffect(() => {
    if (task) { setManagerNote(task.managerNotes || ""); setContentLink(task.contentLink || ""); setFeedbackText(""); setPubStatus(task.publishingStatus || "not_scheduled"); }
  }, [task?.id, open]);

  if (!open || !task) return null;

  const emp = employees.find(e => e.id === task.assignedEmployeeId);
  const step = approvalStep(task);
  const revCount = task.revisionCount || 0;
  const atLimit = revCount >= MAX_REVISIONS;

  const action = (type, extraChanges = {}, notifyTargets = [], title = "", msg = "") => {
    onAction(type, extraChanges, notifyTargets, title, msg);
    onClose();
  };

  const tabs = [
    { id: "preview", label: "Preview" },
    { id: "timeline", label: "Timeline" },
    { id: "revisions", label: "Revisions" },
  ];

  const PubBadge = ({ s }) => {
    const m = { not_scheduled: ["#F3F4F6", "#374151"], scheduled: ["#DBEAFE", "#1D4ED8"], posted: ["#DCFCE7", "#166534"], failed: ["#FEE2E2", "#B91C1C"], rescheduled: ["#FEF9C3", "#854D0E"] };
    const [bg, fg] = m[s] || m.not_scheduled;
    const labels = { not_scheduled: "Not Scheduled", scheduled: "Scheduled", posted: "Posted", failed: "Failed", rescheduled: "Rescheduled" };
    return <span style={{ background: bg, color: fg, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{labels[s] || s}</span>;
  };

  return (
    <Modal open={open} onClose={onClose} title="Approval Review" size="lg"
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={onClose}>Close</Btn>

          {/* Manager actions */}
          {(role === "superadmin" || role === "manager" || role === "accountmanager") && (
            <>
              {step === 1 && (
                <>
                  <Btn variant="outline" onClick={() => action("manager_request_changes", { productionStatus: "changes_required", approvalStatus: "pending" }, [task.assignedEmployeeId], "Changes Requested", `Manager requested changes on ${task.contentDescription}`)}>
                    Request Changes
                  </Btn>
                  <Btn variant="success" onClick={() => {
                    const saved = managerNote !== task.managerNotes ? { managerNotes: managerNote } : {};
                    action("manager_approve", { approvalStatus: "manager_approved", ...saved }, [], "", "");
                  }}>
                    Approve Internally
                  </Btn>
                  <Btn style={{ background: "#7C3AED", borderColor: "#7C3AED", color: "#fff" }} onClick={() => {
                    const saved = managerNote !== task.managerNotes ? { managerNotes: managerNote } : {};
                    action("send_to_client", { approvalStatus: "sent_to_client", ...saved }, [task.clientId], "Content Awaiting Your Approval", `${task.contentType} for your review: ${task.contentDescription}`);
                  }}>
                    Send to Client
                  </Btn>
                </>
              )}
              {step >= 2 && task.approvalStatus === "manager_approved" && (
                <Btn style={{ background: "#7C3AED", borderColor: "#7C3AED", color: "#fff" }} onClick={() => action("send_to_client", { approvalStatus: "sent_to_client" }, [task.clientId], "Content Ready for Your Approval", `${task.contentDescription} is ready for your review.`)}>
                  Send to Client
                </Btn>
              )}
              {step === 3 && task.approvalStatus === "client_approved" && (
                <Btn variant="success" onClick={() => {
                  action("final_approve", { approvalStatus: "final_approved", productionStatus: "completed", publishingStatus: pubStatus !== "not_scheduled" ? pubStatus : "scheduled" }, [task.assignedEmployeeId], "Task Final Approved", `${task.contentDescription} has been final approved!`);
                }}>
                  Mark Final Approved
                </Btn>
              )}
              {task.approvalStatus === "client_rejected" && (
                <Btn variant="outline" onClick={() => action("acknowledge_rejection", { productionStatus: "changes_required" }, [task.assignedEmployeeId], "Changes Required", `${task.contentDescription} needs revision  -  client feedback received.`)}>
                  Notify Employee
                </Btn>
              )}
            </>
          )}
        </div>
      }
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "7px 14px", borderRadius: "8px 8px 0 0", border: "none", background: activeTab === t.id ? "var(--light-orange)" : "transparent", color: activeTab === t.id ? "var(--primary)" : "var(--muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "preview" && (
        <div>
          {/* Task header */}
          <div style={{ background: "var(--light-orange)", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{task.contentDescription}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span className="badge badge-orange">{task.platform}</span>
              <span className="badge badge-muted">{task.contentType}</span>
              <ProdMBadge s={task.productionStatus} />
              <ApprovMBadge s={task.approvalStatus} />
              {task.assignmentType === "ai_assigned" && <AIBadgeSmall />}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <InfoRow label="Client" value={task.clientName} />
            <InfoRow label="Assigned To" value={emp?.name || task.assignedTo || " - "} />
            <InfoRow label="Posting Date" value={task.postingDate} />
            <InfoRow label="Internal Deadline" value={task.internalDeadline} />
            <InfoRow label="Priority" value={<PrioMBadge s={task.priority} />} />
            <InfoRow label="Revision Count" value={<div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontWeight: 700, color: atLimit ? "var(--danger)" : "var(--dark)" }}>{revCount}/{MAX_REVISIONS}</span>{atLimit && <span style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600 }}>Limit reached</span>}</div>} />
          </div>

          {/* Content link */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" }}>Content Link</label>
            {task.contentLink ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <a href={task.contentLink} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "9px 12px", background: "#F9FAFB", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getCleanLinkLabel(task.contentLink, task.contentType)}</a>
                <Btn variant="outline" size="sm" onClick={() => window.open(task.contentLink, "_blank")}>Open</Btn>
              </div>
            ) : (
              <div style={{ padding: "10px 12px", background: "#F9FAFB", border: "1.5px dashed var(--border)", borderRadius: 8, fontSize: 13, color: "var(--muted)" }}>No content link submitted yet</div>
            )}
          </div>

          {/* Script Details */}
          {task.shootScript && (
            <div style={{ marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "#FDFDFD" }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--primary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Script Details
              </div>
              
              {task.shootScript.hook && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Hook</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.hook}
                  </div>
                </div>
              )}

              {task.shootScript.script && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Script Content</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.script}
                  </div>
                </div>
              )}

              {task.shootScript.voiceover && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Voiceover / Copy</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.voiceover}
                  </div>
                </div>
              )}

              {task.shootScript.cta && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Call to Action (CTA)</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.cta}
                  </div>
                </div>
              )}

              {task.shootScript.references && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>References / Links</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.references}
                  </div>
                </div>
              )}

              {task.shootScript.scriptFileUrl && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Uploaded Script File</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <a href={task.shootScript.scriptFileUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "7px 10px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, fontSize: 12, color: "var(--primary)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Script Brief Document
                    </a>
                    <Btn variant="outline" size="sm" onClick={() => window.open(task.shootScript.scriptFileUrl, "_blank")}>Open</Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Caption copy */}
          {task.captionCopy && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" }}>Caption Copy</label>
              <p style={{ fontSize: 13, lineHeight: 1.65, background: "#F9FAFB", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", color: "var(--dark)" }}>{task.captionCopy}</p>
            </div>
          )}

          {/* Manager notes */}
          {(role === "superadmin" || role === "manager" || role === "accountmanager") && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" }}>Manager Notes</label>
              <textarea value={managerNote} onChange={e => setManagerNote(e.target.value)} className="form-input" rows={2} placeholder="Add notes for the team or client..." />
            </div>
          )}
          {role !== "superadmin" && role !== "manager" && role !== "accountmanager" && task.managerNotes && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" }}>Manager Notes</label>
              <p style={{ fontSize: 13, lineHeight: 1.65, background: "#FFFBEB", padding: "10px 12px", borderRadius: 8, border: "1px solid #FEF08A", color: "#713F12" }}>{task.managerNotes}</p>
            </div>
          )}

          {/* Client feedback */}
          {task.clientFeedback && (
            <div style={{ background: task.approvalStatus === "client_rejected" ? "#FEF2F2" : "#ECFDF5", border: `1px solid ${task.approvalStatus === "client_rejected" ? "#FECACA" : "#A7F3D0"}`, borderRadius: 9, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: task.approvalStatus === "client_rejected" ? "var(--danger)" : "var(--success)", marginBottom: 4 }}>Client Feedback</p>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{task.clientFeedback}</p>
            </div>
          )}

          {/* Publishing status (for final approve) */}
          {(role === "superadmin" || role === "manager") && step === 3 && task.approvalStatus === "client_approved" && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" }}>Publishing Status</label>
              <select className="form-input" value={pubStatus} onChange={e => setPubStatus(e.target.value)}>
                {[["not_scheduled", "Not Scheduled"], ["scheduled", "Scheduled"], ["posted", "Posted"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div>
          <ApprovalTimeline task={task} />
          {task.approvalStatus === "final_approved" && (
            <div style={{ marginTop: 16, background: "#ECFDF5", borderRadius: 9, padding: "12px 14px", border: "1px solid #A7F3D0", display: "flex", gap: 10, alignItems: "center" }}>
              <SvgIcon name="check" size={18} color="var(--success)" />
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--success)" }}>This content is Final Approved and ready for publishing.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "revisions" && <RevisionHistory task={task} />}
    </Modal>
  );
}

// ClientApprovalModal
function ClientApprovalModal({ open, onClose, task, onAction }) {
  const [feedbackText, setFeedbackText] = useState("");
  const [tab, setTab] = useState("preview");

  useEffect(() => { if (open) { setFeedbackText(""); setTab("preview"); } }, [open, task?.id]);

  if (!open || !task) return null;
  const revCount = task.revisionCount || 0;
  const atLimit = revCount >= MAX_REVISIONS;

  return (
    <Modal open={open} onClose={onClose} title="Review Content" size="lg"
      footer={
        <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={onClose}>Close</Btn>
          {!atLimit && (
            <Btn variant="danger" onClick={() => {
              if (!feedbackText.trim()) { alert("Please add feedback before requesting changes."); return; }
              onAction("client_reject", feedbackText);
              onClose();
            }}>
              Request Changes
            </Btn>
          )}
          <Btn variant="success" onClick={() => { onAction("client_approve", feedbackText); onClose(); }}>
            Approve
          </Btn>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
        {["preview", "revisions"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 14px", borderRadius: "8px 8px 0 0", border: "none", background: tab === t ? "var(--light-orange)" : "transparent", color: tab === t ? "var(--primary)" : "var(--muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "preview" && (
        <div>
          <div style={{ background: "var(--light-orange)", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{task.contentDescription}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span className="badge badge-orange">{task.platform}</span>
              <span className="badge badge-muted">{task.contentType}</span>
              <span className="badge badge-muted">{task.postingDate}</span>
            </div>
          </div>

          {task.captionCopy && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Caption Copy</p>
              <p style={{ fontSize: 13, lineHeight: 1.65, background: "#F9FAFB", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>{task.captionCopy}</p>
            </div>
          )}

          {task.contentLink ? (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Content Preview</p>
              <a href={task.contentLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--light-orange)", border: "1.5px solid rgba(255,106,0,0.3)", borderRadius: 8, color: "var(--primary)", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>
                <SvgIcon name="arrowRight" size={16} color="var(--primary)" />
                View Content File -{">"}
              </a>
            </div>
          ) : (
            <div style={{ marginBottom: 14, padding: "10px 12px", background: "#F9FAFB", border: "1.5px dashed var(--border)", borderRadius: 8, fontSize: 13, color: "var(--muted)" }}>
              Content file not yet uploaded.
            </div>
          )}

          {/* Script Details */}
          {task.shootScript && (
            <div style={{ marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "#FDFDFD" }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--primary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Script Details
              </div>
              
              {task.shootScript.hook && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Hook</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.hook}
                  </div>
                </div>
              )}

              {task.shootScript.script && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Script Content</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.script}
                  </div>
                </div>
              )}

              {task.shootScript.voiceover && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Voiceover / Copy</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.voiceover}
                  </div>
                </div>
              )}

              {task.shootScript.cta && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Call to Action (CTA)</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.cta}
                  </div>
                </div>
              )}

              {task.shootScript.references && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>References / Links</label>
                  <div style={{ fontSize: 12.5, background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {task.shootScript.references}
                  </div>
                </div>
              )}

              {task.shootScript.scriptFileUrl && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Uploaded Script File</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <a href={task.shootScript.scriptFileUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "7px 10px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, fontSize: 12, color: "var(--primary)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Script Brief Document
                    </a>
                    <Btn variant="outline" size="sm" onClick={() => window.open(task.shootScript.scriptFileUrl, "_blank")}>Open</Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {task.managerNotes && (
            <div style={{ marginBottom: 14, background: "#FFFBEB", border: "1px solid #FEF08A", borderRadius: 9, padding: "10px 14px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#854D0E", marginBottom: 3 }}>Notes from Agency</p>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>{task.managerNotes}</p>
            </div>
          )}

          {atLimit && (
            <div style={{ marginBottom: 14, background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 9, padding: "10px 14px", fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
              Maximum revision limit reached. This must be the final approval.
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" }}>Your Feedback {!atLimit && "(required for changes)"}</label>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} className="form-input" rows={3} placeholder="Write your feedback here. If approving, this is optional." />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!atLimit && (
              <button className="client-action-btn" style={{ borderColor: "var(--danger)", background: "#FEF2F2", color: "var(--danger)" }} onClick={() => { if (!feedbackText.trim()) { alert("Please add feedback before requesting changes."); return; } onAction("client_reject", feedbackText); onClose(); }}>
                <SvgIcon name="repeat" size={15} color="var(--danger)" /> Request Changes
              </button>
            )}
            <button className="client-action-btn" style={{ borderColor: "var(--success)", background: "#ECFDF5", color: "var(--success)" }} onClick={() => { onAction("client_approve", feedbackText); onClose(); }}>
              <SvgIcon name="check" size={15} color="var(--success)" /> Approve Content
            </button>
          </div>
        </div>
      )}

      {tab === "revisions" && <RevisionHistory task={task} />}
    </Modal>
  );
}

// TaskDetailDrawer
function TaskDetailDrawer({ task, open, onClose, employees, onStatusUpdate }) {
  if (!open || !task) return null;
  const emp = employees.find(e => e.id === task.assignedEmployeeId);
  const { session, showToast, refreshTasks } = useApp();
  const [contentLink, setContentLink] = useState(task.contentLink || "");
  const [note, setNote] = useState("");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const update = async (changes) => {
    try {
      const res = await updateTask(task.id, changes);
      await refreshTasks();
      if (onStatusUpdate) onStatusUpdate(res.data || { ...task, ...changes });
      showToast("Task updated.", "success");
    } catch (err) {
      showToast(err.message || "Failed to update task.", "error");
    }
  };


  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150 }} onClick={onClose}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "min(480px,100vw)", background: "var(--card)", boxShadow: "-4px 0 28px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15 }}>Task Detail</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 20 }}>x</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Header info */}
          <div style={{ background: "var(--light-orange)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{task.contentDescription}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="badge badge-orange">{task.platform}</span>
              <span className="badge badge-muted">{task.contentType}</span>
              <PrioMBadge s={task.priority} />
              {task.assignmentType === "ai_assigned" && <AIBadgeSmall />}
            </div>
          </div>
          {/* Fields */}
          {[["Client", task.clientName], ["Posting Date", task.postingDate], ["Deadline", task.internalDeadline], ["Assigned To", emp?.name || task.assignedTo || " - "]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, minWidth: 110 }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{v || " - "}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
            <ProdMBadge s={task.productionStatus} />
            <ApprovMBadge s={task.approvalStatus} />
            <PubMBadge s={task.publishingStatus} />
          </div>
          {task.managerNotes && <div style={{ marginBottom: 10 }}><p style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>Manager Notes</p><p style={{ fontSize: 13, lineHeight: 1.6 }}>{task.managerNotes}</p></div>}
          {task.clientFeedback && <div style={{ background: "#ECFDF5", padding: "10px 12px", borderRadius: 8, border: "1px solid #A7F3D0", marginBottom: 10 }}><p style={{ fontSize: 11.5, color: "#065F46", fontWeight: 700, marginBottom: 2 }}>Client Feedback</p><p style={{ fontSize: 13 }}>{task.clientFeedback}</p></div>}
          {task.captionCopy && <div style={{ marginBottom: 10 }}><p style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>Caption Copy</p><p style={{ fontSize: 13, lineHeight: 1.6, background: "#F9FAFB", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)" }}>{task.captionCopy}</p></div>}

          <div className="divider" />
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--dark)", marginBottom: 10 }}>Quick Actions</p>
          {/* Status update */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Update Status</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PROD_STATUSES_LIST.map(s => (
                <button key={s} onClick={() => update({ productionStatus: s })} style={{ padding: "3px 9px", borderRadius: 99, border: "1.5px solid", borderColor: task.productionStatus === s ? "#FF6A00" : "var(--border)", background: task.productionStatus === s ? "var(--light-orange)" : "#fff", color: task.productionStatus === s ? "var(--primary)" : "var(--muted)", cursor: "pointer", fontSize: 11.5, fontWeight: 600, transition: "all 0.12s" }}>
                  {PROD_LABELS_MAP[s]}
                </button>
              ))}
            </div>
          </div>
          {/* Content link */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Content Link</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={contentLink} onChange={e => setContentLink(e.target.value)} placeholder="Drive / Dropbox URL" className="form-input" style={{ flex: 1 }} />
              <Btn size="sm" onClick={() => { update({ contentLink, productionStatus: "ready_for_review" }); showToast("Link submitted, status set to Ready for Review.", "success"); }}>Submit</Btn>
            </div>
          </div>
          {/* Note */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Add Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="form-input" rows={2} placeholder="Add an internal note..." />
            <Btn variant="outline" size="sm" style={{ marginTop: 6 }} onClick={() => {
              if (!note.trim()) return;
              const existing = task.managerNotes || "";
              const newNote = `[${new Date().toLocaleDateString()}] ${session?.name}: ${note}`;
              update({ managerNotes: existing ? existing + "\n" + newNote : newNote });
              setNote("");
            }}>Add Note</Btn>
          </div>

          {/* Schedule for Publishing */}
          {(task.approvalStatus === "final_approved" || task.approvalStatus === "client_approved") && 
           (session?.role === "manager" || session?.role === "superadmin") && (
            <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <Btn 
                onClick={() => setScheduleModalOpen(true)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Schedule for Publishing
              </Btn>
            </div>
          )}
        </div>
      </div>

      <ScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        task={task}
        onSuccess={() => {
          update({ publishingStatus: "scheduled" });
        }}
      />
    </div>
  );
}

// TaskCreateModal
function TaskCreateModal({ open, onClose, defaultClientId = "" }) {
  const { clients, employees, session, showToast, refreshTasks } = useApp();
  const blank = { clientId: defaultClientId, clientName: "", brandName: "", platform: "Instagram", postingDate: "", day: "", contentType: "Reel", contentDescription: "", captionCopy: "", priority: "medium", assignedEmployeeId: "", assignedTo: "", assignmentType: "manual", internalDeadline: "", productionStatus: "todo", approvalStatus: "pending", publishingStatus: "not_scheduled", contentLink: "", managerNotes: "", clientFeedback: "", revisionCount: 0, maxRevisions: 2 };
  const [form, setForm] = useState(blank);
  const [aiLoading, setAiLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const clickHandler = () => setDropdownOpen(false);
    window.addEventListener("click", clickHandler);
    return () => window.removeEventListener("click", clickHandler);
  }, []);


  useEffect(() => { if (open) setForm({ ...blank, clientId: defaultClientId }); }, [open]);

  useEffect(() => {
    if (form.clientId) {
      const c = clients.find(cl => cl.id === form.clientId);
      if (c) { set("clientName", c.name); set("brandName", c.brandName || c.name); }
    }
  }, [form.clientId]);

  useEffect(() => {
    if (form.postingDate) set("day", calcDayName(form.postingDate));
    if (form.postingDate && form.contentType) set("internalDeadline", calcInternalDeadline(form.postingDate, form.contentType, form.priority));
  }, [form.postingDate, form.contentType, form.priority]);

  const handleAI = () => {
    setAiLoading(true);
    setTimeout(() => {
      const emp = doAIAssign(form.contentType, employees);
      if (emp) { set("assignedEmployeeId", emp.id); set("assignedTo", emp.name); set("assignmentType", "ai_assigned"); showToast(`AI assigned to ${emp.name}`, "success"); }
      else showToast("No available employee found for this content type.", "warning");
      setAiLoading(false);
    }, 600);
  };

  const handleSave = async () => {
    if (!form.clientId) { showToast("Select a client.", "warning"); return; }
    if (!form.contentDescription.trim()) { showToast("Add a content description.", "warning"); return; }
    try {
      const payload = { ...form };
      delete payload.id;
      if (payload.assignedEmployeeId && !payload.assignedTo) {
        const emp = employees.find(e => e.id === payload.assignedEmployeeId);
        if (emp) payload.assignedTo = emp.name;
      }
      await createTask(payload);
      await refreshTasks();
      showToast(`Task created for ${form.clientName || 'client'}.`, "success");
      onClose();
    } catch (err) {
      showToast(err.message || "Failed to create task.", "error");
    }
  };


  return (
    <Modal open={open} onClose={onClose} title="Create New Task" size="lg"
      footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave}>Create Task</Btn></>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <div>
          <div className="form-group" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <label className="form-label">Client *</label>
            <div 
              className="form-input" 
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#fff", minHeight: 38 }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span style={{ color: form.clientId ? "var(--dark)" : "var(--muted)", fontSize: 13.5 }}>
                {form.clientName || "Select client..."}
              </span>
              <span style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center" }}>▼</span>
            </div>

            {dropdownOpen && (
              <div 
                style={{ 
                  position: "absolute", 
                  top: "100%", 
                  left: 0, 
                  right: 0, 
                  zIndex: 200, 
                  background: "#fff", 
                  border: "1.5px solid var(--border)", 
                  borderRadius: 8, 
                  marginTop: 4, 
                  boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
                  maxHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}
              >
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ border: "none", borderBottom: "1.5px solid var(--border)", borderRadius: 0, padding: "8px 12px", outline: "none", fontSize: 13 }}
                  placeholder="Type to search client..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
                <div style={{ overflowY: "auto", flex: 1, maxHeight: 170 }}>
                  {clients
                    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.brandName || "").toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(c => (
                      <div 
                        key={c.id} 
                        style={{ 
                          padding: "9px 12px", 
                          fontSize: 13, 
                          cursor: "pointer", 
                          background: form.clientId === c.id ? "var(--light-orange)" : "transparent",
                          color: form.clientId === c.id ? "var(--primary)" : "var(--dark)",
                          fontWeight: form.clientId === c.id ? 700 : 500
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--light-orange)"}
                        onMouseLeave={e => e.currentTarget.style.background = form.clientId === c.id ? "var(--light-orange)" : "transparent"}
                        onClick={() => {
                          set("clientId", c.id);
                          set("clientName", c.name);
                          set("brandName", c.brandName || c.name);
                          setDropdownOpen(false);
                          setSearchTerm("");
                        }}
                      >
                        {c.name}
                      </div>
                    ))}
                  {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div style={{ padding: "12px", fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
                      No clients match search
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Platform</label>
            <select className="form-input" value={form.platform} onChange={e => set("platform", e.target.value)}>
              {PLATFORMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Content Type</label>
            <select className="form-input" value={form.contentType} onChange={e => set("contentType", e.target.value)}>
              {CONTENT_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Posting Date</label>
              <input type="date" className="form-input" value={form.postingDate} onChange={e => set("postingDate", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Day</label>
              <input className="form-input" value={form.day} readOnly style={{ background: "#F9FAFB", color: "var(--muted)" }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Internal Deadline (auto)</label>
            <input type="date" className="form-input" value={form.internalDeadline} onChange={e => set("internalDeadline", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-input" value={form.priority} onChange={e => set("priority", e.target.value)}>
              {PRIORITIES_LIST.map(p => <option key={p} value={p}>{PRIO_LABELS_MAP[p]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="form-group">
            <label className="form-label">Assign To</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select className="form-input" value={form.assignedEmployeeId} onChange={e => { const emp = employees.find(x => x.id === e.target.value); set("assignedEmployeeId", e.target.value); set("assignedTo", emp?.name || ""); set("assignmentType", "manual"); }} style={{ flex: 1 }}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} - {e.designation}</option>)}
              </select>
              <button onClick={handleAI} disabled={aiLoading} className="btn btn-sm" style={{ background: "#7C3AED", color: "#fff", border: "1.5px solid #7C3AED", borderRadius: 8, cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                {aiLoading ? <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> : <SvgIcon name="target" size={13} color="#fff" />}
                AI
              </button>
            </div>
            {form.assignmentType === "ai_assigned" && form.assignedTo && (
              <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
                <AIBadgeSmall /> <span style={{ fontSize: 12, color: "#5B21B6" }}>{form.assignedTo}</span>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Production Status</label>
            <select className="form-input" value={form.productionStatus} onChange={e => set("productionStatus", e.target.value)}>
              {PROD_STATUSES_LIST.map(s => <option key={s} value={s}>{PROD_LABELS_MAP[s]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Approval Status</label>
            <select className="form-input" value={form.approvalStatus} onChange={e => set("approvalStatus", e.target.value)}>
              {APPROV_STATUSES_LIST.map(s => <option key={s} value={s}>{APPROV_LABELS_MAP[s]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Publishing Status</label>
            <select className="form-input" value={form.publishingStatus} onChange={e => set("publishingStatus", e.target.value)}>
              {PUB_STATUSES_LIST.map(s => <option key={s} value={s}>{PUB_LABELS_MAP[s]}</option>)}
            </select>
          </div>
          <FormInput label="Content Link" value={form.contentLink} onChange={e => set("contentLink", e.target.value)} placeholder="Drive / Dropbox URL" />
          <FormInput label="Manager Notes" type="textarea" value={form.managerNotes} onChange={e => set("managerNotes", e.target.value)} placeholder="Notes for the team..." />
        </div>
      </div>
      <FormInput label="Content Description / Brief *" type="textarea" value={form.contentDescription} onChange={e => set("contentDescription", e.target.value)} placeholder="Describe the content idea in detail..." />
      <FormInput label="Caption Copy" type="textarea" value={form.captionCopy} onChange={e => set("captionCopy", e.target.value)} placeholder="Write the caption here..." />
    </Modal>
  );
}

export {
  MicroBadge, ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  CONTENT_TYPES_LIST, PLATFORMS_LIST, PRIORITIES_LIST,
  PROD_STATUSES_LIST, APPROV_STATUSES_LIST, PUB_STATUSES_LIST,
  PROD_LABELS_MAP, APPROV_LABELS_MAP, PUB_LABELS_MAP, PRIO_LABELS_MAP,
  PROD_COLORS, APPROV_COLORS, PUB_COLORS, PRIO_COLORS,
  AI_SKILL_RULES, doAIAssign, calcInternalDeadline, calcDayName,
  approvalStep, persistTaskUpdate, addRevision,
  ApprovalTimeline, RevisionHistory, ApprovalModal, ClientApprovalModal,
  TaskDetailDrawer, TaskCreateModal,
};
