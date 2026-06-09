// Employee Deadlines Page
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  SvgIcon, Btn, Avatar, StatusBadge, EmptyState,
} from "../shared/components";
import { ProdMBadge, PrioMBadge } from "../shared/taskConstants";

function EmployeeDeadlinesPage() {
  const { session, tasks, employees } = useApp();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split("T")[0];
  const myTasks = tasks.filter(t => t.assignedEmployeeId === session?.id || t.employeeId === session?.id || t.assignedTo?.toLowerCase() === (session?.name || "").toLowerCase());
  const scored = myTasks.filter(t => t.productionStatus !== "completed").map(t => {
    const dl = t.internalDeadline; const isOverdue = dl && dl < todayStr; const isDueToday = dl === todayStr; const isTomorrow = dl === tomorrowStr;
    const score = isOverdue && t.priority === "urgent" ? 0 : isOverdue ? 1 : isDueToday ? 2 : isTomorrow ? 3 : t.priority === "high" ? 4 : 5;
    return { ...t, score, isOverdue, isDueToday, isTomorrow };
  }).sort((a, b) => a.score - b.score || (a.internalDeadline || "").localeCompare(b.internalDeadline || ""));
  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}><h1 className="page-title">My Deadlines</h1><p className="page-subtitle">{scored.length} pending tasks sorted by deadline and priority.</p></div>
      {scored.length === 0 ? <EmptyState icon={<SvgIcon name="clock" size={28} color="var(--success)" />} title="No pending deadlines" desc="All caught up!" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scored.map(t => {
            const days = t.internalDeadline ? Math.ceil((new Date(t.internalDeadline) - today) / 86400000) : null;
            const badgeText = t.isOverdue ? `${Math.abs(days || 0)}d overdue` : t.isDueToday ? "Due Today" : t.isTomorrow ? "Due Tomorrow" : days !== null ? `${days}d left` : null;
            const badgeColor = t.isOverdue ? "#B91C1C" : t.isDueToday ? "#854D0E" : t.isTomorrow ? "#1D4ED8" : "#6B7280";
            const badgeBg = t.isOverdue ? "#FEE2E2" : t.isDueToday ? "#FEF9C3" : t.isTomorrow ? "#DBEAFE" : "#F3F4F6";
            return (
              <div key={t.id} style={{ background: "#fff", border: `1.5px solid ${t.isOverdue ? "#FECACA" : t.isDueToday ? "#FEF08A" : "var(--border)"}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 48, height: 52, borderRadius: 10, background: badgeBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {t.internalDeadline ? (<><span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, fontWeight: 800, color: badgeColor, lineHeight: 1 }}>{new Date(t.internalDeadline).getDate()}</span><span style={{ fontSize: 9, fontWeight: 700, color: badgeColor }}>{new Date(t.internalDeadline).toLocaleString("default", { month: "short" }).toUpperCase()}</span></>) : <span style={{ fontSize: 11, color: "var(--muted)" }}>--</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.contentDescription}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 7 }}>{t.clientName} - {t.platform} - {t.contentType}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <PrioMBadge s={t.priority} /><ProdMBadge s={t.productionStatus} />
                    {badgeText && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: badgeBg, color: badgeColor }}>{badgeText}</span>}
                    {t.productionStatus === "changes_required" && <span style={{ fontSize: 11, fontWeight: 700, background: "#FEF9C3", color: "#854D0E", padding: "2px 8px", borderRadius: 99 }}>Changes Required</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =============================================================
   CLIENT CALENDAR PAGE (only shows this client's content)
============================================================= */

export default EmployeeDeadlinesPage;
