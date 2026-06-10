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

  const today = new Date();
  const upcomingRenewals = clients.filter(c => {
    if (!c.renewalDate) return false;
    const rDate = new Date(c.renewalDate);
    const diffDays = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0 && c.status === "active";
  }).sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));

  return (
    <div className="fade-in">
      <RoleBanner session={session} />
      <AnnouncementBanner announcements={announcements} />
      <QuickActions role="superadmin" setPage={setPage} />

      {/* Dynamic renewals widget */}
      {upcomingRenewals.length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: "1.5px solid #FEF08A", background: "#FFFDF5" }}>
          <div className="card-header" style={{ borderBottom: "1px solid #FEF08A", padding: "12px 20px" }}>
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "#854D0E", margin: 0, fontSize: 14.5 }}>
              ⏳ Upcoming Contract Renewals
            </span>
            <span className="badge badge-warning" style={{ color: "#854D0E", background: "#FEF08A" }}>
              {upcomingRenewals.length} Alert{upcomingRenewals.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="card-body" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingRenewals.map(client => {
                const rDate = new Date(client.renewalDate);
                const days = Math.ceil((rDate - today) / (1000 * 60 * 60 * 24));
                const assignedEmp = employees.find(e => e.id === client.assignedAM);
                return (
                  <div 
                    key={client.id} 
                    onClick={() => setPage("clients")}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "10px 14px", 
                      background: "#FFFFFF", 
                      borderRadius: 8, 
                      border: "1px solid #FDE047", 
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: (client.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: client.brandColor || "var(--primary)" }}>
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--dark)" }}>{client.name}</span>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>AM: {assignedEmp?.name || "Unassigned"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="badge badge-warning" style={{ fontSize: 11, color: "#854D0E", background: "#FEF9C3", border: "1px solid #FEF08A" }}>
                        Renews in {days} day{days !== 1 ? "s" : ""}
                      </span>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{rDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
