// Manager Dashboard
import { useApp } from "../shared/AppContext";
import { LS_KEYS, MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
  Avatar, ProgressBar,
} from "../shared/components";

function ManagerDashboard({ setPage }) {
  const { clients, tasks, employees, session, announcements } = useApp();
  const logs = LSUtils.getData(LS_KEYS.ACTIVITY_LOGS) || MOCK.activityLogs;
  const inReview = tasks.filter(t => t.productionStatus === "review");
  const inProd = tasks.filter(t => t.productionStatus === "in_progress" || t.productionStatus === "production");

  return (
    <div className="fade-in">
      <RoleBanner session={session} />
      <AnnouncementBanner announcements={announcements} />
      <QuickActions role="manager" setPage={setPage} />

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <AnimStatCard label="Active Clients" value={clients.filter(c => c.status === "active").length} sub="Currently managed" iconName="handshake" iconBg="#FFF3E8" iconColor="#FF6A00" delay={0} />
        <AnimStatCard label="In Production" value={inProd.length} sub="Being worked on" iconName="repeat" iconBg="#EFF6FF" iconColor="#1D4ED8" delay={80} />
        <AnimStatCard label="In Review" value={inReview.length} sub="Awaiting approval" trend="down" iconName="checklist" iconBg="#FFFBEB" iconColor="#F59E0B" delay={160} />
        <AnimStatCard label="Team Size" value={employees.length} sub="Active employees" iconName="users" iconBg="#F0FDF4" iconColor="#16A34A" delay={240} />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Approvals</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("approvals")}>View All</button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <PendingApprovals tasks={tasks} />
          </div>
        </div>
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
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Upcoming Deadlines</span></div>
          <div className="card-body" style={{ paddingTop: 12 }}><UpcomingDeadlines tasks={tasks} /></div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          <div className="card-body" style={{ paddingTop: 8 }}><ActivityFeed logs={logs} /></div>
        </div>
      </div>
    </div>
  );
}


export default ManagerDashboard;
