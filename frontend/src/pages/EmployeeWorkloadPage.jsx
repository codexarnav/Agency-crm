// Employee Workload Kanban Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState, ProgressBar,
} from "../shared/components";
import { ProdMBadge } from "../shared/taskConstants";
import { updateTask } from "../services/api";

function EmployeeWorkloadKanbanPage() {
  const { employees, session, showToast, tasks, refreshTasks } = useApp();
  const [dragTask, setDragTask] = useState(null);
  const categories = [{ label: "Video Editors", roles: ["Video Editor", "Reel Editor", "Motion Designer"] }, { label: "Graphic Designers", roles: ["Graphic Designer", "Thumbnail Designer", "Photographer"] }, { label: "Content Writers", roles: ["Content Writer", "Copywriter", "Strategist"] }, { label: "Social Media Managers", roles: ["Social Media Manager"] }, { label: "Account Managers", roles: ["Account Manager"] }, { label: "Other", roles: [] }];
  const getCategory = (emp) => { const des = emp.designation || ""; const cat = categories.find(c => c.roles.some(r => des.toLowerCase().includes(r.toLowerCase()))); return cat?.label || "Other"; };
  const grouped = categories.map(cat => ({ ...cat, employees: employees.filter(e => getCategory(e) === cat.label) })).filter(cat => cat.employees.length > 0);
  const getEmpTasks = (empId) => tasks.filter(t => t.assignedEmployeeId === empId && t.productionStatus !== "completed");
  
  const handleDrop = async (targetEmpId) => {
    if (!dragTask || dragTask.assignedEmployeeId === targetEmpId) {
      setDragTask(null);
      return;
    }
    const te = employees.find(e => e.id === targetEmpId);
    try {
      await updateTask(dragTask.id, {
        assignedEmployeeId: targetEmpId,
        assignedTo: te?.name || ""
      });
      await refreshTasks();
      showToast(`Task moved to ${te?.name || "employee"}.`, "success");
    } catch (err) {
      showToast(err.message || "Failed to reassign task", "error");
    }
    setDragTask(null);
  };
  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}><h1 className="page-title">Employee Workload</h1><p className="page-subtitle">Category-wise Kanban. Drag task cards between employees to reassign.</p></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "var(--light-orange)", borderRadius: 9, border: "1px solid rgba(255,106,0,0.2)" }}>
        <SvgIcon name="alert" size={14} color="var(--primary)" />
        <span style={{ fontSize: 12.5, color: "var(--deep)" }}>Drag any task card and drop it onto a different employee to reassign. Changes save automatically.</span>
      </div>
      {grouped.map(cat => (
        <div key={cat.label} style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid var(--light-orange)" }}>{cat.label} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>({cat.employees.length})</span></h2>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
            {cat.employees.map(emp => {
              const empTasks = getEmpTasks(emp.id);
              const wlColor = empTasks.length <= 3 ? "#16A34A" : empTasks.length <= 7 ? "#0EA5E9" : empTasks.length <= 10 ? "#F59E0B" : "#DC2626";
              return (
                <div key={emp.id} style={{ minWidth: 240, maxWidth: 280, background: dragTask && dragTask.assignedEmployeeId !== emp.id ? "#F0FDF4" : "#F9FAFB", borderRadius: 10, padding: 12, border: dragTask && dragTask.assignedEmployeeId !== emp.id ? "2px dashed #16A34A" : "1px solid var(--border)", transition: "all 0.15s" }} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(emp.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <Avatar name={emp.name} size="sm" />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{emp.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{emp.designation}</div></div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: wlColor + "18", color: wlColor }}>{empTasks.length}</span>
                  </div>
                  {empTasks.length === 0 ? <div style={{ padding: "14px 8px", textAlign: "center", color: "#9CA3AF", fontSize: 12, border: "1.5px dashed #E5E7EB", borderRadius: 8 }}>No active tasks</div>
                    : empTasks.slice(0, 6).map(t => (
                      <div key={t.id} draggable onDragStart={() => setDragTask(t)} onDragEnd={() => setDragTask(null)} style={{ background: "#fff", border: `1.5px solid var(--border)`, borderRadius: 8, padding: "9px 11px", marginBottom: 8, cursor: "grab", borderLeft: `3px solid ${t.priority === "urgent" ? "#DC2626" : t.priority === "high" ? "#F59E0B" : "#E5E7EB"}` }} onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.09)"; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.contentDescription}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{t.clientName} - {t.platform}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, background: "#F3F4F6", color: "#374151", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{t.contentType}</span>
                          <ProdMBadge s={t.productionStatus} />
                          {t.internalDeadline && <span style={{ fontSize: 10, color: new Date(t.internalDeadline) < new Date() ? "#DC2626" : "#6B7280", fontWeight: 600 }}>Due:{t.internalDeadline}</span>}
                        </div>
                      </div>
                    ))}
                  {empTasks.length > 6 && <div style={{ fontSize: 11.5, color: "var(--primary)", textAlign: "center", marginTop: 4 }}>+{empTasks.length - 6} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {grouped.length === 0 && <EmptyState icon={<SvgIcon name="users" size={28} color="var(--muted)" />} title="No employees found" desc="Add employees via Workspace tab." />}
    </div>
  );
}

/* =============================================================
   EMPLOYEE TASKS PAGE (filtered to logged-in employee)
============================================================= */

export default EmployeeWorkloadKanbanPage;
