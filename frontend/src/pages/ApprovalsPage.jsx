// Approvals Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, FilterBar,
  SearchBar, DataTable, Modal,
} from "../shared/components";
import {
  approvalStep, persistTaskUpdate, addRevision,
  ApprovalModal, ApprovalTimeline, RevisionHistory,
  ProdMBadge, ApprovMBadge, PubMBadge, PrioMBadge, AIBadgeSmall,
  MAX_REVISIONS,
  PROD_LABELS_MAP, APPROV_LABELS_MAP,
} from "../shared/taskConstants";
import { managerApproveTask, sendTaskToClient, updateTask } from "../services/api";

function ApprovalsPage() {
  const { session, employees, clients, showToast, tasks, refreshTasks } = useApp();
  const [selected, setSelected] = useState(null);
  const [filterStep, setFilterStep] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const role = session?.role || "manager";

  // Tasks visible in the approval queue
  const approvalQueue = tasks.filter(t => {
    const validStatuses = ["ready_for_review", "review", "manager_approved", "sent_to_client", "client_approved", "client_rejected", "final_approved"];
    const prodMatch = validStatuses.includes(t.productionStatus) || validStatuses.includes(t.approvalStatus);
    const clientMatch = filterClient === "all" || t.clientId === filterClient;
    const stepFilter = (() => {
      if (filterStep === "all") return true;
      if (filterStep === "needs_manager") return t.productionStatus === "ready_for_review" || t.productionStatus === "review";
      if (filterStep === "sent_to_client") return t.approvalStatus === "sent_to_client";
      if (filterStep === "client_feedback") return t.approvalStatus === "client_approved" || t.approvalStatus === "client_rejected";
      if (filterStep === "final") return t.approvalStatus === "final_approved";
      return true;
    })();
    return (t.approvalStatus !== "pending" || t.productionStatus === "ready_for_review" || t.productionStatus === "review") && clientMatch && stepFilter;
  });

  const counts = {
    needs_manager: tasks.filter(t => t.productionStatus === "ready_for_review" || t.productionStatus === "review").length,
    sent_to_client: tasks.filter(t => t.approvalStatus === "sent_to_client").length,
    client_feedback: tasks.filter(t => t.approvalStatus === "client_approved" || t.approvalStatus === "client_rejected").length,
    final: tasks.filter(t => t.approvalStatus === "final_approved").length,
  };

  const handleAction = async (type, extraChanges, notifyTargets, notifTitle, notifMsg) => {
    if (!selected) return;
    const taskId = selected.id;
    const changes = { ...extraChanges };

    if (type === "manager_request_changes") {
      addRevision(taskId, { feedbackBy: session?.name || "Manager", feedbackComment: extraChanges.managerNotes || "Changes requested", updatedContentLink: "" });
      const newCount = (selected.revisionCount || 0) + 1;
      changes.revisionCount = newCount;
    }
    if (type === "send_to_client" || type === "manager_approve") {
      if (changes.managerNotes === undefined && extraChanges.managerNotes) changes.managerNotes = extraChanges.managerNotes;
    }

    try {
      let updated;
      if (type === "manager_approve") {
        const res = await managerApproveTask(taskId);
        updated = res.task;
      } else if (type === "send_to_client") {
        const res = await sendTaskToClient(taskId);
        updated = res.task;
      } else {
        const res = await updateTask(taskId, changes);
        updated = res.data;
      }

      showToast(
        type === "manager_approve" ? "Content approved internally." :
          type === "send_to_client" ? "Content sent to client for approval." :
            type === "manager_request_changes" ? "Changes requested from employee." :
              type === "final_approve" ? "Task marked as Final Approved!" :
                "Action completed.", type === "final_approve" ? "success" : "info"
      );
      
      refreshTasks();
      setSelected(null);
    } catch (err) {
      showToast(err.message || "Failed to complete approval action", "danger");
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Approvals</h1>
        <p className="page-subtitle">Review, approve, and manage the full content approval workflow.</p>
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[
          ["Needs Manager Review", counts.needs_manager, "var(--warning)"],
          ["Sent to Client", counts.sent_to_client, "#7C3AED"],
          ["Client Responded", counts.client_feedback, "#0EA5E9"],
          ["Final Approved", counts.final, "var(--success)"],
        ].map(([l, v, c]) => (
          <div key={l} className="stat-card" style={{ padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            ["all", "All"],
            ["needs_manager", `Needs Review (${counts.needs_manager})`],
            ["sent_to_client", `With Client (${counts.sent_to_client})`],
            ["client_feedback", `Client Responded (${counts.client_feedback})`],
            ["final", `Final Approved (${counts.final})`],
          ].map(([v, l]) => (
            <button key={v} className={`filter-chip ${filterStep === v ? "active" : ""}`} onClick={() => setFilterStep(v)} style={{ fontSize: 12 }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <select className="form-input" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ width: "auto", minWidth: 150, fontSize: 13 }}>
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Queue */}
      {approvalQueue.length === 0 ? (
        <div className="card">
          <EmptyState icon={<SvgIcon name="check" size={28} color="var(--success)" />} title="All caught up!" desc="No tasks pending approval in this queue." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {approvalQueue.map(t => {
            const emp = employees.find(e => e.id === t.assignedEmployeeId);
            const step = approvalStep(t);
            const isOverdue = t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.approvalStatus !== "final_approved";
            const revCount = t.revisionCount || 0;
            const atLimit = revCount >= MAX_REVISIONS;

            return (
              <div key={t.id} className={`approval-card ${t.approvalStatus === "client_rejected" ? "urgent-border" : t.approvalStatus === "final_approved" ? "approved-border" : ""}`} style={{ padding: "16px 20px", cursor: "pointer" }} onClick={() => setSelected(t)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--dark)" }}>{t.contentDescription}</span>
                      {t.assignmentType === "ai_assigned" && <AIBadgeSmall />}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>{t.clientName}</span>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>{t.platform}</span>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>{t.contentType}</span>
                      <ProdMBadge s={t.productionStatus} />
                      <ApprovMBadge s={t.approvalStatus} />
                    </div>
                    {t.clientFeedback && t.approvalStatus === "client_rejected" && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#991B1B", marginBottom: 6 }}>
                        Client: "{t.clientFeedback.slice(0, 100)}{t.clientFeedback.length > 100 ? "..." : ""}"
                      </div>
                    )}
                    {t.clientFeedback && t.approvalStatus === "client_approved" && (
                      <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#166534", marginBottom: 6 }}>
                        Client: "{t.clientFeedback.slice(0, 100)}{t.clientFeedback.length > 100 ? "..." : ""}"
                      </div>
                    )}
                  </div>

                  {/* Right: meta */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    <PrioMBadge s={t.priority} />
                    {emp && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar name={emp.name || emp.username} size={22} />
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{(emp.name || emp.username || "").split(" ")[0]}</span>
                      </div>
                    )}
                    {isOverdue && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)" }}>! Overdue</span>}
                    {atLimit && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", background: "#FEE2E2", padding: "1px 7px", borderRadius: 99 }}>Rev limit</span>}
                    {t.internalDeadline && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Due {t.internalDeadline}</span>}
                  </div>
                </div>

                {/* Step indicator bar */}
                <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                  {["Employee", "Manager", "Client", "Approved", "Final"].map((s, i) => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: step > i ? (i < 2 ? "#1D4ED8" : i < 3 ? "#7C3AED" : "#16A34A") : step === i ? "#FF6A00" : "#E5E7EB", transition: "background 0.3s" }} title={s} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval modal */}
      <ApprovalModal
        open={!!selected}
        onClose={() => setSelected(null)}
        task={selected}
        onAction={handleAction}
        role={role}
      />
    </div>
  );
}


export default ApprovalsPage;
