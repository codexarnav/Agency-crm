// Account Manager Dashboard
import { useApp } from "../shared/AppContext";
import { LS_KEYS } from "../shared/constants";
import { MOCK } from "../shared/constants";
import { LSUtils } from "../shared/utils";
import {
  AnimStatCard, RoleBanner, AnnouncementBanner, ActivityFeed,
  PendingApprovals, UpcomingDeadlines, QuickActions, SvgIcon,
} from "../shared/components";

function AccountManagerDashboard({ setPage }) {
  const { clients, tasks, session } = useApp();
  const announcements = LSUtils.getData(LS_KEYS.ANNOUNCEMENTS) || MOCK.announcements;
  // Simulate: AM manages clients assigned to user_mgr1
  const myClients = clients.filter(c => c.assignedAM === session?.id || c.assignedAM === "user_mgr1");
  const myTasks = tasks.filter(t => myClients.some(c => c.id === t.clientId));
  const pendingFeedback = MOCK.feedback?.filter(f => f.revisionRequested) || [];

  return (
    <div className="fade-in">
      <RoleBanner session={session} />
      <AnnouncementBanner announcements={announcements} />
      <QuickActions role="accountmanager" setPage={setPage} />

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <AnimStatCard label="My Clients" value={myClients.length} sub="Assigned to you" iconName="handshake" iconBg="#ECFDF5" iconColor="#059669" delay={0} />
        <AnimStatCard label="Active Tasks" value={myTasks.filter(t => t.productionStatus !== "approved").length} sub="Across your clients" iconName="checklist" iconBg="#EFF6FF" iconColor="#1D4ED8" delay={80} />
        <AnimStatCard label="Pending Reviews" value={myTasks.filter(t => t.approvalStatus === "pending").length} sub="Awaiting response" trend="down" iconName="clock" iconBg="#FFFBEB" iconColor="#F59E0B" delay={160} />
        <AnimStatCard label="Revision Needed" value={pendingFeedback.length} sub="Needs rework" iconName="repeat" iconBg="#FEE2E2" iconColor="#B91C1C" delay={240} />
      </div>

      {/* My client cards */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">My Clients</span>
          <span className="section-link" onClick={() => setPage("clients")}>View All</span>
        </div>
        <div className="grid-3">
          {myClients.slice(0, 6).map(c => {
            const clientTasks = tasks.filter(t => t.clientId === c.id);
            const pending = clientTasks.filter(t => t.approvalStatus === "pending").length;
            return (
              <div key={c.id} className="client-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: (c.brandColor || "#FF6A00") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: c.brandColor || "var(--primary)", flexShrink: 0 }}>{c.name.charAt(0)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }} className="truncate">{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.industry}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <StatusBadge status={c.status} />
                  {pending > 0 && <span className="badge badge-warning" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}><SvgIcon name="clock" size={11} color="#854D0E" />{pending} pending</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Approvals</span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--primary)" }} onClick={() => setPage("approvals")}>View All</button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}><PendingApprovals tasks={myTasks} /></div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Upcoming Deadlines</span></div>
          <div className="card-body" style={{ paddingTop: 12 }}><UpcomingDeadlines tasks={myTasks} /></div>
        </div>
      </div>
    </div>
  );
}


export default AccountManagerDashboard;
