// Employee Kanban Board Page
import { useState } from "react";
import { useApp } from "../shared/AppContext";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState,
} from "../shared/components";
import {
  TaskDetailDrawer,
  ProdMBadge, PrioMBadge,
  PROD_STATUSES_LIST, PROD_LABELS_MAP, PROD_COLORS,
} from "../shared/taskConstants";
import { updateTaskStatus } from "../services/api";

function EmployeeKanbanPage() {
  const { session, employees, showToast, tasks, refreshTasks } = useApp();
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tempProgress, setTempProgress] = useState({});

  // Filter tasks assigned to this employee
  const myTasks = tasks.filter(t => t.assignedEmployeeId === session?.id || t.employeeId === session?.id || t.assignedTo?.toLowerCase().includes((session?.name?.split(" ")[0] || "x_no_match").toLowerCase()));

  const kanbanCols = [
    { id: "todo", label: "To-Do", color: "#6B7280", bg: "#F3F4F6" },
    { id: "in_progress", label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE" },
    { id: "ready_for_review", label: "Ready for Review", color: "#7C3AED", bg: "#EDE9FE" },
    { id: "changes_required", label: "Changes Required", color: "#F59E0B", bg: "#FEF9C3" },
    { id: "blocked", label: "Blocked", color: "#DC2626", bg: "#FEE2E2" },
    { id: "completed", label: "Completed", color: "#16A34A", bg: "#DCFCE7" },
  ];

  const nextStatus = { todo: "in_progress", in_progress: "ready_for_review", ready_for_review: "completed", changes_required: "in_progress", blocked: "in_progress" };

  const updateTask = async (id, changes) => {
    try {
      await updateTaskStatus(id, changes);
      await refreshTasks();
      if (selectedTask?.id === id) setSelectedTask(p => ({ ...p, ...changes }));
      showToast("Task updated.", "success");
    } catch (err) {
      showToast(err.message || "Failed to update task.", "danger");
    }
  };

  const getProgressColor = (val) => {
    if (val < 35) return "#EF4444"; // Red
    if (val < 75) return "#F59E0B"; // Orange/Yellow
    return "#10B981"; // Green
  };

  const stats = {
    active: myTasks.filter(t => t.productionStatus !== "completed").length,
    inProg: myTasks.filter(t => t.productionStatus === "in_progress").length,
    review: myTasks.filter(t => t.productionStatus === "ready_for_review").length,
    changes: myTasks.filter(t => t.productionStatus === "changes_required").length,
    overdue: myTasks.filter(t => t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed").length,
    done: myTasks.filter(t => t.productionStatus === "completed").length
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">My Kanban Board</h1>
        <p className="page-subtitle">{myTasks.length} assigned tasks  -  update status and adjust progress sliders.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[["Active", stats.active, "var(--primary)"], ["In Progress", stats.inProg, "#1D4ED8"], ["In Review", stats.review, "#7C3AED"], ["Changes", stats.changes, "var(--warning)"], ["Overdue", stats.overdue, "var(--danger)"], ["Completed", stats.done, "var(--success)"]].map(([l, v, c]) => (
          <div key={l} className="stat-card" style={{ padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
        {kanbanCols.map(col => {
          const colTasks = myTasks.filter(t => t.productionStatus === col.id);
          return (
            <div key={col.id} style={{ background: "#F9FAFB", borderRadius: 10, padding: 12, minWidth: 230, maxWidth: 270, width: 250, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: col.color }}>{col.label}</span>
                <span style={{ fontSize: 11.5, background: col.bg, color: col.color, padding: "1px 8px", borderRadius: 99, fontWeight: 700 }}>{colTasks.length}</span>
              </div>
              {colTasks.length === 0 && <div style={{ padding: "18px 10px", textAlign: "center", color: "#9CA3AF", fontSize: 12, borderRadius: 8, border: "1.5px dashed var(--border)" }}>Empty</div>}
              {colTasks.map(t => {
                const isOverdue = t.internalDeadline && new Date(t.internalDeadline) < new Date() && t.productionStatus !== "completed";
                const currentProgress = tempProgress[t.id] !== undefined ? tempProgress[t.id] : (t.progress || 0);
                
                return (
                  <div key={t.id} onClick={() => { setSelectedTask(t); setDrawerOpen(true); }} style={{ background: "var(--card)", border: `1.5px solid var(--border)`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, background: "#F3F4F6", color: "#374151", padding: "1px 6px", borderRadius: 5, fontWeight: 600 }}>{t.contentType}</span>
                      <PrioMBadge s={t.priority} />
                    </div>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark)", marginBottom: 4, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{t.contentDescription}</p>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>{t.clientName} . {t.platform}</div>
                    {t.internalDeadline && <div style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? "var(--danger)" : "var(--muted)", marginBottom: 8 }}>{isOverdue ? "! Overdue:" : "Due:"} {t.internalDeadline}</div>}
                    
                    {/* Premium interactive progress slider */}
                    <div style={{ margin: "10px 0 12px 0" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Progress: {currentProgress}%</span>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: getProgressColor(currentProgress) }} />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentProgress}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setTempProgress(prev => ({ ...prev, [t.id]: val }));
                        }}
                        onMouseUp={() => {
                          updateTask(t.id, { progress: currentProgress });
                        }}
                        onTouchEnd={() => {
                          updateTask(t.id, { progress: currentProgress });
                        }}
                        style={{
                          width: "100%",
                          height: 5,
                          borderRadius: 3,
                          outline: "none",
                          cursor: "pointer",
                          background: `linear-gradient(to right, ${getProgressColor(currentProgress)} ${currentProgress}%, #E5E7EB ${currentProgress}%)`,
                          appearance: "none",
                          WebkitAppearance: "none"
                        }}
                      />
                    </div>

                    {t.clientFeedback && t.approvalStatus === "client_rejected" && <div style={{ background: "#FEF3C7", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#854D0E", marginBottom: 8 }}>Feedback: {t.clientFeedback.slice(0, 60)}{t.clientFeedback.length > 60 ? "..." : ""}</div>}
                    {t.contentLink && <a href={t.contentLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, display: "block", marginBottom: 6 }}>View Content</a>}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
                      {nextStatus[col.id] && (
                        <button onClick={() => { updateTask(t.id, { productionStatus: nextStatus[col.id], progress: nextStatus[col.id] === "completed" ? 100 : currentProgress }); showToast(`Moved to ${PROD_LABELS_MAP[nextStatus[col.id]]}`, "success"); }} style={{ flex: 1, padding: "4px 8px", borderRadius: 7, border: "1.5px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#374151" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--light-orange)"; e.currentTarget.style.borderColor = "var(--primary)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                          {col.id === "todo" ? "Start Task" : "-> " + PROD_LABELS_MAP[nextStatus[col.id]].split(" ")[0]}
                        </button>
                      )}
                      {col.id !== "blocked" && col.id !== "completed" && <button onClick={() => { updateTask(t.id, { productionStatus: "blocked" }); showToast("Task marked blocked.", "warning"); }} style={{ padding: "4px 8px", borderRadius: 7, border: "1.5px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--danger)" }}>Block</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedTask(null); }} employees={employees} onStatusUpdate={updated => { updateTask(updated.id, updated); }} />
    </div>
  );
}

export default EmployeeKanbanPage;
