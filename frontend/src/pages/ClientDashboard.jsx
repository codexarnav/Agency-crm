// Client Dashboard
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, SvgIcon,
  StatusBadge, Avatar, Btn, EmptyState, FilterBar, SearchBar,
  InfoRow,
} from "../shared/components";
import {
  ClientApprovalModal, approvalStep, persistTaskUpdate, addRevision,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge,
  MAX_REVISIONS,
} from "../shared/taskConstants";
import { getBrandAssetByClient, clientApproveTask, clientRejectTask } from "../services/api";

function ClientDashboard({ setPage }) {
  const { session, employees, showToast, tasks, refreshTasks, announcements, clients } = useApp();
  const allClients = clients && clients.length > 0 ? clients : MOCK.clients;

  // Determine which client this user is
  const clientRecord = allClients.find(c =>
    c.id === session?.id ||
    c.email === session?.email ||
    c.name === session?.name ||
    c.id === "client_1" // fallback for demo
  );
  const clientId = clientRecord?.id || "client_1";

  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedTask, setSelectedTask] = useState(null);
  const [approvalModal, setApprovalModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [assetRecord, setAssetRecord] = useState(null);

  useEffect(() => {
    const loadAsset = async () => {
      if (session?.id) {
        try {
          const res = await getBrandAssetByClient(session.id);
          setAssetRecord(res.asset || null);
        } catch (err) {
          console.error("Failed to load asset:", err);
        }
      }
    };
    loadAsset();
  }, [session?.id]);

  const allTasks = tasks;
  const sentToClient = allTasks.filter(t => ["sent_to_client", "client_approved", "client_rejected", "final_approved"].includes(t.approvalStatus));

  const stats = {
    total: allTasks.length,
    pending: sentToClient.filter(t => t.approvalStatus === "sent_to_client").length,
    approved: allTasks.filter(t => ["client_approved", "final_approved"].includes(t.approvalStatus)).length,
    changes: allTasks.filter(t => t.approvalStatus === "client_rejected").length,
    upcoming: allTasks.filter(t => { const d = new Date(t.postingDate); return d > new Date() && d <= new Date(Date.now() + 7 * 86400000); }).length,
    posted: allTasks.filter(t => t.publishingStatus === "posted").length,
  };

  const filtered = sentToClient.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.contentDescription.toLowerCase().includes(q) || t.platform.toLowerCase().includes(q) || t.contentType.toLowerCase().includes(q);
    const matchF = filterStatus === "all" || t.approvalStatus === filterStatus;
    return matchQ && matchF;
  });

  const handleClientAction = async (type, feedbackText) => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;
    const revCount = selectedTask.revisionCount || 0;

    try {
      if (type === "client_approve") {
        await clientApproveTask(taskId);
        showToast("Content approved! The team has been notified.", "success");
      } else if (type === "client_reject") {
        if (revCount >= MAX_REVISIONS) {
          showToast("Maximum revisions reached. You must approve this version.", "warning");
          return;
        }
        await clientRejectTask(taskId, feedbackText || "Changes requested.");
        showToast("Changes requested. The team will update and resubmit.", "info");
      }
      await refreshTasks();
    } catch (err) {
      showToast(err.message || "Failed to update content status.", "danger");
    }
  };

  // Calendar data
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const buildCalGrid = () => {
    const first = new Date(calYear, calMonth, 1);
    const last = new Date(calYear, calMonth + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.unshift({ date: new Date(calYear, calMonth, -i), other: true });
    for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(calYear, calMonth, d), other: false });
    const rem = 7 - (cells.length % 7);
    if (rem < 7) for (let d = 1; d <= rem; d++) cells.push({ date: new Date(calYear, calMonth + 1, d), other: true });
    return cells;
  };

  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const tasksByDate = allTasks.reduce((a, t) => { if (t.postingDate) { (a[t.postingDate] = a[t.postingDate] || []).push(t); } return a; }, {});
  const todayStr = fmt(today);

  const tabs = [
    { id: "pipeline", label: "Content Overview" },
    { id: "calendar", label: "Content Calendar" },
    { id: "history", label: "Approval History" },
    { id: "assets", label: "Brand Assets" },
    { id: "announcements", label: "Announcements" },
  ];

  // Platform-wise progress (only selected platforms)
  const selectedPlatforms = clientRecord?.platforms || [];

  const platformProgress = selectedPlatforms.map(platform => {
    const pTasks = allTasks.filter(t => t.platform === platform);
    const planned = pTasks.length;
    const completed = pTasks.filter(t => t.productionStatus === "completed").length;
    const approved = pTasks.filter(t => ["client_approved", "final_approved"].includes(t.approvalStatus)).length;
    const posted = pTasks.filter(t => t.publishingStatus === "posted").length;
    const pending = pTasks.filter(t => t.approvalStatus === "sent_to_client").length;
    const pct = planned ? Math.round((completed / planned) * 100) : 0;
    return { platform, planned, completed, approved, posted, pending, pct };
  });

  return (
    <div className="fade-in">
      <RoleBanner session={session} />
      <AnnouncementBanner announcements={announcements} />

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <AnimStatCard label="Total Content" value={stats.total} sub="This month" iconName="checklist" iconBg="#F5F3FF" iconColor="#7C3AED" delay={0} />
        <AnimStatCard label="Pending Approval" value={stats.pending} sub="Awaiting your review" trend="down" iconName="clock" iconBg="#FFFBEB" iconColor="#F59E0B" delay={80} />
        <AnimStatCard label="Approved" value={stats.approved} sub="Good to go" iconName="check" iconBg="#ECFDF5" iconColor="#059669" delay={160} />
        <AnimStatCard label="Changes Requested" value={stats.changes} sub="Revisions in progress" iconName="repeat" iconBg="#FEE2E2" iconColor="#B91C1C" delay={240} />
        <AnimStatCard label="Upcoming (7 days)" value={stats.upcoming} sub="Scheduled posts" iconName="calendar" iconBg="#EFF6FF" iconColor="#1D4ED8" delay={320} />
        <AnimStatCard label="Posted" value={stats.posted} sub="Live content" iconName="send" iconBg="#F0FDF4" iconColor="#16A34A" delay={400} />
      </div>

      {/* Platform-wise progress */}
      {platformProgress.length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 20 }}>
          <div className="section-header" style={{ marginBottom: 14 }}>
            <span className="section-title">Platform-wise Progress</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Only your selected platforms</span>
          </div>
          {platformProgress.map(p => (
            <div key={p.platform} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--dark)" }}>{p.platform}</span>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted)" }}>
                  <span>{p.completed}/{p.planned} completed</span>
                  {p.posted > 0 && <span style={{ color: "#059669", fontWeight: 600 }}>{p.posted} posted</span>}
                  {p.pending > 0 && <span style={{ color: "#F59E0B", fontWeight: 600 }}>{p.pending} pending review</span>}
                  <span style={{ fontWeight: 800, color: "var(--primary)" }}>{p.pct}%</span>
                </div>
              </div>
              <div style={{ background: "#E5E7EB", borderRadius: 99, overflow: "hidden", height: 8 }}>
                <div style={{ width: `${p.pct}%`, height: 8, borderRadius: 99, background: p.pct >= 80 ? "#16A34A" : p.pct >= 50 ? "#FF6A00" : "#F59E0B", transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}
          {platformProgress.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No platforms selected for this client. Contact your account manager.</p>
          )}
        </div>
      )}


      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 16px", borderRadius: "8px 8px 0 0", border: "none", background: activeTab === t.id ? "var(--light-orange)" : "transparent", color: activeTab === t.id ? "var(--primary)" : "var(--muted)", fontWeight: activeTab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap", borderBottom: activeTab === t.id ? "2.5px solid var(--primary)" : "2.5px solid transparent", flexShrink: 0 }}>
            {t.label}
            {t.id === "pipeline" && stats.pending > 0 && <span style={{ marginLeft: 6, background: "var(--danger)", color: "#fff", fontSize: 10, padding: "1px 5px", borderRadius: 99, fontWeight: 800 }}>{stats.pending}</span>}
          </button>
        ))}
      </div>

      {/* PIPELINE TAB */}
      {activeTab === "pipeline" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search content..." style={{ flex: "1 1 200px", minWidth: 180 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {[["all", "All"], ["sent_to_client", "Pending"], ["client_approved", "Approved"], ["client_rejected", "Changes Req."], ["final_approved", "Final"]].map(([v, l]) => (
                <button key={v} className={`filter-chip ${filterStatus === v ? "active" : ""}`} onClick={() => setFilterStatus(v)} style={{ fontSize: 12 }}>{l}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<SvgIcon name="checklist" size={28} color="var(--primary)" />} title="No content to review" desc="Content will appear here once the team sends it for your approval." />
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["Date", "Day", "Platform", "Type", "Description", "Caption", "Preview", "Status", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "11px 12px", fontSize: 12.5 }}>{t.postingDate}</td>
                        <td style={{ padding: "11px 12px", fontSize: 12.5, color: "var(--muted)" }}>{t.day || ""}</td>
                        <td style={{ padding: "11px 12px", fontSize: 12.5 }}>{t.platform}</td>
                        <td style={{ padding: "11px 12px" }}><span className="badge badge-muted" style={{ fontSize: 11 }}>{t.contentType}</span></td>
                        <td style={{ padding: "11px 12px", maxWidth: 180 }}>
                          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{t.contentDescription}</div>
                          {t.clientFeedback && <div style={{ fontSize: 11, color: t.approvalStatus === "client_rejected" ? "var(--danger)" : "var(--success)", marginTop: 2 }}>Feedback given</div>}
                        </td>
                        <td style={{ padding: "11px 12px", maxWidth: 140 }}>
                          {t.captionCopy ? (
                            <span style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 130 }}>{t.captionCopy.slice(0, 40)}...</span>
                          ) : <span style={{ color: "#9CA3AF", fontSize: 12 }}> - </span>}
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          {t.contentLink ? (
                            <a href={t.contentLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--primary)", fontWeight: 700, padding: "3px 9px", background: "var(--light-orange)", borderRadius: 6 }}>
                              <SvgIcon name="arrowRight" size={12} color="var(--primary)" /> View
                            </a>
                          ) : <span style={{ color: "#9CA3AF", fontSize: 12 }}>Pending</span>}
                        </td>
                        <td style={{ padding: "11px 12px" }}><ApprovMBadge s={t.approvalStatus} /></td>
                        <td style={{ padding: "11px 12px" }}>
                          {t.approvalStatus === "sent_to_client" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => { setSelectedTask(t); setApprovalModal(true); }} style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid var(--success)", background: "#ECFDF5", color: "var(--success)", cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}>Review</button>
                            </div>
                          )}
                          {(t.approvalStatus === "client_approved" || t.approvalStatus === "final_approved") && (
                            <span style={{ fontSize: 11.5, color: "var(--success)", fontWeight: 700 }}>v Approved</span>
                          )}
                          {t.approvalStatus === "client_rejected" && (
                            <span style={{ fontSize: 11.5, color: "var(--warning)", fontWeight: 700 }}>In revision</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CALENDAR TAB */}
      {activeTab === "calendar" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15 }}>{monthNames[calMonth]} {calYear}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="filter-chip" onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }}>Today</button>
              <button className="filter-chip" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>Prev</button>
              <button className="filter-chip" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>Next</button>
            </div>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} style={{ padding: "9px 6px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {buildCalGrid().map((cell, i) => {
                const ds = fmt(cell.date);
                const dt = tasksByDate[ds] || [];
                const isToday = ds === todayStr;
                return (
                  <div key={i} style={{ border: "1px solid var(--border)", padding: "5px", minHeight: 80, background: isToday ? "var(--light-orange)" : cell.other ? "#F9FAFB" : "#fff", opacity: cell.other ? 0.5 : 1 }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "var(--primary)" : "transparent", color: isToday ? "#fff" : "#374151" }}>{cell.date.getDate()}</span>
                    {dt.slice(0, 2).map(t => {
                      const [bg, fg] = t.approvalStatus === "client_approved" || t.approvalStatus === "final_approved" ? ["#D1FAE5", "#065F46"] : t.approvalStatus === "sent_to_client" ? ["#FFF3E8", "#E95A00"] : ["#F3F4F6", "#374151"];
                      return (
                        <div key={t.id} onClick={() => { setSelectedTask(t); setApprovalModal(true); }} style={{ marginTop: 2, padding: "2px 5px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: bg, color: fg, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.contentType}
                        </div>
                      );
                    })}
                    {dt.length > 2 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 3 }}>+{dt.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL HISTORY TAB */}
      {activeTab === "history" && (
        <div>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14 }}>Approval History</div>
            {allTasks.filter(t => ["client_approved", "client_rejected", "final_approved"].includes(t.approvalStatus)).length === 0 ? (
              <EmptyState icon={<SvgIcon name="checklist" size={28} color="var(--muted)" />} title="No approval history yet" desc="Reviewed content will appear here." />
            ) : (
              <div>
                {allTasks.filter(t => ["client_approved", "client_rejected", "final_approved"].includes(t.approvalStatus)).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: t.approvalStatus === "client_rejected" ? "#FEE2E2" : "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <SvgIcon name={t.approvalStatus === "client_rejected" ? "repeat" : "check"} size={16} color={t.approvalStatus === "client_rejected" ? "var(--danger)" : "var(--success)"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }} className="truncate">{t.contentDescription}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{t.platform} . {t.contentType} . {t.postingDate}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <ApprovMBadge s={t.approvalStatus} />
                      {t.revisionCount > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Rev: {t.revisionCount}/{t.maxRevisions || MAX_REVISIONS}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK HISTORY TAB */}
      {activeTab === "feedback" && (
        <div>
          {(() => {
            const allRevisions = (LSUtils.getData(LS_KEYS.REVISIONS) || MOCK.revisions || []).filter(r => {
              const t = allTasks.find(x => x.id === r.taskId);
              return t && t.clientId === clientId;
            });
            return allRevisions.length === 0 ? (
              <EmptyState icon={<SvgIcon name="chat" size={28} color="var(--muted)" />} title="No feedback history yet" desc="Your submitted feedback will appear here." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allRevisions.map(r => {
                  const task = allTasks.find(t => t.id === r.taskId);
                  return (
                    <div key={r.id} className="card" style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{task?.contentDescription || "Task"}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{task?.platform} . {task?.contentType}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                      <div style={{ background: "#FFF3E8", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--dark)", lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>{r.feedbackBy}: </span>{r.feedbackComment}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* BRAND ASSETS TAB */}
      {activeTab === "assets" && (
        <div>
          {!assetRecord ? (
            <EmptyState icon={<SvgIcon name="image" size={28} color="var(--muted)" />} title="No brand assets compiled yet" desc="Your dedicated brand assets and guidelines will appear here once ready." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {/* Logo & Colors Card */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  {assetRecord.clientLogo ? (
                    <img src={assetRecord.clientLogo} alt="Logo" style={{ width: 50, height: 50, borderRadius: 8, objectFit: "contain", border: "1px solid var(--border)" }} />
                  ) : (
                    <div style={{ width: 50, height: 50, borderRadius: 8, background: "var(--light-orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <SvgIcon name="image" size={24} color="var(--primary)" />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Brand Style</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>Logo and primary colors</p>
                  </div>
                </div>
                {assetRecord.brandColor && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F9FAFB", borderRadius: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: assetRecord.brandColor }} />
                    <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{assetRecord.brandColor}</span>
                  </div>
                )}
              </div>

              {/* Guidelines & Tone */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Brand Guidelines</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <InfoRow label="Voice Tone" value={assetRecord.tone || "Not set"} />
                  <InfoRow label="Fonts" value={assetRecord.fonts || "Not set"} />
                  <InfoRow label="Hashtags" value={assetRecord.hashtags || "Not set"} />
                </div>
              </div>

              {/* Links & Assets */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Shared Workspace Links</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {assetRecord.driveLink && (
                    <a href={assetRecord.driveLink} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", fontSize: 12, padding: "8px 12px", textDecoration: "none", color: "var(--primary)", fontWeight: 600, border: "1.5px solid var(--border)", borderRadius: 8, background: "#fff" }}>
                      Google Drive Folder
                    </a>
                  )}
                  {assetRecord.canvaLink && (
                    <a href={assetRecord.canvaLink} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", fontSize: 12, padding: "8px 12px", textDecoration: "none", color: "var(--primary)", fontWeight: 600, border: "1.5px solid var(--border)", borderRadius: 8, background: "#fff" }}>
                      Canva Workspace
                    </a>
                  )}
                  {assetRecord.creativeLink && (
                    <a href={assetRecord.creativeLink} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", fontSize: 12, padding: "8px 12px", textDecoration: "none", color: "var(--primary)", fontWeight: 600, border: "1.5px solid var(--border)", borderRadius: 8, background: "#fff" }}>
                      Creatives Folder
                    </a>
                  )}
                  {!assetRecord.driveLink && !assetRecord.canvaLink && !assetRecord.creativeLink && (
                    <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>No links configured.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ANNOUNCEMENTS TAB */}
      {activeTab === "announcements" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(announcements || []).length === 0 ? (
            <EmptyState icon={<SvgIcon name="megaphone" size={28} color="var(--muted)" />} title="No announcements" desc="Agency announcements will appear here." />
          ) : announcements.map(a => (
            <div key={a.id} className="card" style={{ padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--light-orange)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SvgIcon name="megaphone" size={18} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <div style={{ marginLeft: "auto" }}><StatusBadge status={a.priority} /></div>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--dark)", lineHeight: 1.65 }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Client Approval Modal */}
      <ClientApprovalModal
        open={approvalModal}
        onClose={() => { setApprovalModal(false); setSelectedTask(null); }}
        task={selectedTask}
        onAction={handleClientAction}
      />
    </div>
  );
}

export default ClientDashboard;
