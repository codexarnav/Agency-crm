// Super Admin Dashboard
import { useState, useEffect } from "react";
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import { getActivityLogs } from "../services/api";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
  Avatar, ProgressBar, DataTable, StatusBadge,
} from "../shared/components";

function SuperAdminDashboard({ setPage }) {
  const { clients, tasks, employees, session, announcements } = useApp();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let active = true;
    getActivityLogs()
      .then(res => {
        if (active) setLogs(res.data || []);
      })
      .catch(err => {
        console.error("Failed to load dashboard activity logs:", err);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="fade-in">
      <RoleBanner session={session} />
      <AnnouncementBanner announcements={announcements} />
      <QuickActions role="superadmin" setPage={setPage} />

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <AnimStatCard label="Total Clients" value={clients.length} sub="2 onboarded this month" trend="up" iconName="building" iconBg="#FFF3E8" iconColor="#FF6A00" delay={0} />
        <AnimStatCard label="Active Tasks" value={tasks.filter(t => t.productionStatus !== "approved").length} sub="Across all clients" iconName="checklist" iconBg="#EFF6FF" iconColor="#1D4ED8" delay={80} />
        <AnimStatCard label="Pending Approval" value={tasks.filter(t => t.approvalStatus === "pending").length} sub="Awaiting client review" trend="down" iconName="clock" iconBg="#FFFBEB" iconColor="#F59E0B" delay={160} />
        <AnimStatCard label="Team Members" value={employees.length} sub="All active" trend="up" iconName="users" iconBg="#F0FDF4" iconColor="#16A34A" delay={240} />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Approvals</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("approvals")}>View All</button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <PendingApprovals tasks={tasks} />
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Deadlines</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("tasks")}>View All</button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <UpcomingDeadlines tasks={tasks} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Team workload */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Team Workload</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("workload")}>Manage</button>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {employees.map(e => (
              <div key={e.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={e.name} size="sm" />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.designation}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{e.currentLoad}/{e.maxLoad}</span>
                </div>
                <ProgressBar value={e.currentLoad} max={e.maxLoad} height={5} />
              </div>
            ))}
          </div>
        </div>

        {/* Activity log */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("activity")}>Full Log</button>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ActivityFeed logs={logs} />
          </div>
        </div>
      </div>

      {/* Client status table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Client Status Overview</span>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("clients")}>All Clients</button>
        </div>
        <DataTable
          columns={[
            {
              key: "name", label: "Client", render: (v, row) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: (row.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: row.brandColor || "var(--primary)", flexShrink: 0 }}>{v.charAt(0)}</div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                </div>
              )
            },
            { key: "industry", label: "Industry", hideOnMobile: true },
            { key: "plan", label: "Plan", render: v => <span className={`badge ${v === "elite" ? "badge-purple" : v === "premium" ? "badge-warning" : "badge-info"}`} style={{ textTransform: "capitalize" }}>{v}</span> },
            { key: "status", label: "Status", render: v => <StatusBadge status={v} /> },
            {
              key: "platforms", label: "Platforms", hideOnMobile: true, render: v => (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {v.slice(0, 2).map(p => <span key={p} className="badge badge-muted" style={{ fontSize: 10.5 }}>{p}</span>)}
                  {v.length > 2 && <span className="badge badge-muted" style={{ fontSize: 10.5 }}>+{v.length - 2}</span>}
                </div>
              )
            },
          ]}
          data={clients}
        />
      </div>
    </div>
  );
}


export default SuperAdminDashboard;
