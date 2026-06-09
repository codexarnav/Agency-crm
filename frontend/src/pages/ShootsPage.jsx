// Shoot Management Page
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../shared/AppContext";
import ScheduleModal from "../components/publishing/ScheduleModal";
import {
  SvgIcon, Btn, StatusBadge, Avatar, FormInput, SearchBar,
  FilterBar, EmptyState, Modal, DataTable, AnimStatCard
} from "../shared/components";
import {
  getShoots, getShootById, createShootBrief, scheduleShoot,
  updateShootStatus, assignShootCrew, draftScript, submitScript,
  approveScript, requestScriptChanges, uploadShootAsset,
  deleteShootAsset, generateEditingTasks, submitShootDraft
} from "../services/api";

function ShootsPage() {
  const { session, clients, employees, showToast } = useApp();
  const role = session?.role || "employee";
  const isManager = role === "superadmin" || role === "manager" || role === "accountmanager";

  // Data states
  const [shoots, setShoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShoot, setSelectedShoot] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filter/view states
  const [view, setView] = useState("table"); // 'table' or 'calendar'
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sub-modal states
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [publishingModalOpen, setPublishingModalOpen] = useState(false);

  // Form states
  const [briefForm, setBriefForm] = useState({
    title: "", clientId: "", creativeLeadId: "", objective: "",
    deliverables: "", targetAudience: "", priority: "MEDIUM",
    expectedDeadline: "", shootDate: "", shootTime: "", location: "",
    clientContact: "", notes: ""
  });
  const [scheduleForm, setScheduleForm] = useState({ shootDate: "", shootTime: "", location: "" });
  const [crewRows, setCrewRows] = useState([{ employeeId: "", role: "VIDEOGRAPHER" }]);
  const [editingTasksList, setEditingTasksList] = useState(["Edit Reel 1", "Edit Founder Video", "Edit Photo Batch"]);

  // Script editing states (for Employee Lead)
  const [scriptForm, setScriptForm] = useState({ hook: "", script: "", voiceover: "", cta: "", references: "" });
  const [scriptFile, setScriptFile] = useState(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [showFeedbackBox, setShowFeedbackBox] = useState(false);

  // Asset upload states
  const [uploadAssetType, setUploadAssetType] = useState("RAW");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Calendar states
  const today = new Date();
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Fetch all shoots
  const fetchShoots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getShoots();
      setShoots(res.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load shoots", "danger");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchShoots();
  }, [fetchShoots]);

  // Load single shoot details
  const loadShootDetails = async (id) => {
    try {
      const res = await getShootById(id);
      setSelectedShoot(res.data);
      // Populate scripts editor if employee lead
      const activeScript = res.data.scripts?.find(s => s.employeeId === session.id);
      if (activeScript) {
        setScriptForm({
          hook: activeScript.hook || "",
          script: activeScript.script || "",
          voiceover: activeScript.voiceover || "",
          cta: activeScript.cta || "",
          references: activeScript.references || ""
        });
      } else {
        setScriptForm({ hook: "", script: "", voiceover: "", cta: "", references: "" });
      }
      setDetailsOpen(true);
    } catch (err) {
      showToast(err.message || "Failed to load details", "danger");
    }
  };

  // Brief briefForm handlers
  const handleBriefSubmit = async (e) => {
    e.preventDefault();
    if (!briefForm.clientId || !briefForm.creativeLeadId || !briefForm.title) {
      showToast("Please fill in Title, Client, and Creative Lead", "warning");
      return;
    }
    try {
      await createShootBrief(briefForm);
      showToast("Shoot Brief created successfully!", "success");
      setBriefModalOpen(false);
      setBriefForm({
        title: "", clientId: "", creativeLeadId: "", objective: "",
        deliverables: "", targetAudience: "", priority: "MEDIUM",
        expectedDeadline: "", shootDate: "", shootTime: "", location: "",
        clientContact: "", notes: ""
      });
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to create brief", "danger");
    }
  };

  // Schedule submit handler
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.shootDate) {
      showToast("Shoot date is required", "warning");
      return;
    }
    try {
      await scheduleShoot(selectedShoot.id, scheduleForm);
      showToast("Shoot scheduled successfully!", "success");
      setScheduleModalOpen(false);
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to schedule shoot", "danger");
    }
  };

  // Crew submit handler
  const handleCrewSubmit = async (e) => {
    e.preventDefault();
    const validRows = crewRows.filter(r => r.employeeId);
    if (validRows.length === 0) {
      showToast("Please add at least one crew member", "warning");
      return;
    }
    try {
      await assignShootCrew(selectedShoot.id, validRows);
      showToast("Crew assigned successfully!", "success");
      setCrewModalOpen(false);
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to assign crew", "danger");
    }
  };

  // Scripts handlers with file brief support
  const handleSaveScriptDraft = async () => {
    const hasText = scriptForm.hook.trim() || scriptForm.script.trim() || scriptForm.voiceover.trim() || scriptForm.cta.trim() || scriptForm.references.trim();
    if (!hasText && !scriptFile && !selectedShoot.scripts?.[0]?.scriptFileUrl) {
      showToast("Please enter script details or upload a script brief file", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("data", JSON.stringify(scriptForm));
    if (scriptFile) {
      formData.append("scriptFile", scriptFile);
    }

    try {
      await draftScript(selectedShoot.id, formData);
      showToast("Draft saved successfully!", "success");
      setScriptFile(null);
      loadShootDetails(selectedShoot.id);
    } catch (err) {
      showToast(err.message || "Failed to save draft", "danger");
    }
  };

  const handleSubmitScript = async () => {
    const hasText = scriptForm.hook.trim() || scriptForm.script.trim() || scriptForm.voiceover.trim() || scriptForm.cta.trim() || scriptForm.references.trim();
    if (!hasText && !scriptFile && !selectedShoot.scripts?.[0]?.scriptFileUrl) {
      showToast("Please enter script details or upload a script brief file", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("data", JSON.stringify(scriptForm));
    if (scriptFile) {
      formData.append("scriptFile", scriptFile);
    }

    try {
      await submitScript(selectedShoot.id, formData);
      showToast("Script submitted for approval!", "success");
      setScriptFile(null);
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to submit script", "danger");
    }
  };

  const handleApproveScript = async () => {
    try {
      await approveScript(selectedShoot.id);
      showToast("Script approved successfully!", "success");
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to approve script", "danger");
    }
  };

  const handleRequestScriptChanges = async () => {
    if (!feedbackInput.trim()) {
      showToast("Please enter feedback comments", "warning");
      return;
    }
    try {
      await requestScriptChanges(selectedShoot.id, feedbackInput);
      showToast("Changes requested!", "success");
      setShowFeedbackBox(false);
      setFeedbackInput("");
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to request script changes", "danger");
    }
  };

  // Asset upload handler
  const handleAssetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", uploadAssetType);
    formData.append("clientName", selectedShoot.client.companyName);
    formData.append("shootTitle", selectedShoot.title);

    try {
      setUploadingFile(true);
      await uploadShootAsset(selectedShoot.id, formData);
      showToast("Asset uploaded successfully!", "success");
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Upload failed", "danger");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAssetDelete = async (assetId) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await deleteShootAsset(assetId);
      showToast("Asset deleted successfully!", "success");
      loadShootDetails(selectedShoot.id);
    } catch (err) {
      showToast(err.message || "Delete failed", "danger");
    }
  };

  // Employee Shoot Draft submission handler
  const handleShootDraftUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("draftFile", file);

    try {
      setUploadingFile(true);
      await submitShootDraft(selectedShoot.id, formData);
      showToast("Shoot draft submitted for manager review successfully!", "success");
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Draft upload failed", "danger");
    } finally {
      setUploadingFile(false);
    }
  };

  // Editing task generation
  const handleGenerateTasks = async () => {
    if (editingTasksList.length === 0) {
      showToast("Please specify at least one editing task", "warning");
      return;
    }
    try {
      await generateEditingTasks(selectedShoot.id, editingTasksList);
      showToast("Editing tasks generated and assigned!", "success");
      setTasksModalOpen(false);
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Failed to generate tasks", "danger");
    }
  };

  // Shoot execution lifecycle
  const handleUpdateStatus = async (status) => {
    try {
      await updateShootStatus(selectedShoot.id, status);
      showToast(`Shoot status updated to ${status.replace("_", " ")}!`, "success");
      loadShootDetails(selectedShoot.id);
      fetchShoots();
    } catch (err) {
      showToast(err.message || "Status update failed", "danger");
    }
  };

  // Stats computed from shoots
  const stats = {
    briefs: shoots.filter(s => s.status === "BRIEF_CREATED" || s.status === "SCRIPT_PENDING").length,
    pendingScript: shoots.filter(s => s.status === "SCRIPT_SUBMITTED").length,
    upcoming: shoots.filter(s => s.status === "SCHEDULED" || s.status === "CREW_ASSIGNED").length,
    completed: shoots.filter(s => s.status === "COMPLETED" || s.status === "PUBLISHED").length
  };

  // Filters mapping
  const filteredShoots = shoots.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
                        s.client?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
                        s.creativeLead?.username?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Calendar builder helper
  const fmtDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const getCalendarCells = () => {
    const first = new Date(curYear, curMonth, 1);
    const last = new Date(curYear, curMonth + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) {
      cells.unshift({ date: new Date(curYear, curMonth, -i), other: true });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push({ date: new Date(curYear, curMonth, d), other: false });
    }
    const rem = 7 - (cells.length % 7);
    if (rem < 7) {
      for (let d = 1; d <= rem; d++) cells.push({ date: new Date(curYear, curMonth + 1, d), other: true });
    }
    return cells;
  };

  const shootsByDate = filteredShoots.reduce((acc, s) => {
    if (s.shootDate) {
      const ds = fmtDateStr(new Date(s.shootDate));
      (acc[ds] = acc[ds] || []).push(s);
    }
    return acc;
  }, {});

  const getShootColor = status => {
    const map = {
      BRIEF_CREATED: ["#EFF6FF", "#1D4ED8"],
      SCRIPT_PENDING: ["#FEF3C7", "#D97706"],
      SCRIPT_SUBMITTED: ["#F5F3FF", "#6D28D9"],
      SCRIPT_APPROVED: ["#D1FAE5", "#065F46"],
      SCHEDULED: ["#ECFDF5", "#059669"],
      IN_PROGRESS: ["#FFF3E8", "#E95A00"],
      RAW_UPLOADED: ["#FFF1F2", "#E11D48"],
      EDITING: ["#EFF6FF", "#2563EB"],
      COMPLETED: ["#D1FAE5", "#047857"],
    };
    return map[status] || ["#F3F4F6", "#4B5563"];
  };

  // Shoot details workflow timeline steps definitions
  const workflowSteps = [
    { key: "BRIEF_CREATED", label: "Brief", activeStatuses: ["BRIEF_CREATED"] },
    { key: "SCRIPT_SUBMITTED", label: "Script", activeStatuses: ["SCRIPT_PENDING", "SCRIPT_SUBMITTED", "SCRIPT_CHANGES_REQUESTED"] },
    { key: "SCRIPT_APPROVED", label: "Approved", activeStatuses: ["SCRIPT_APPROVED"] },
    { key: "SCHEDULED", label: "Scheduled", activeStatuses: ["CREW_ASSIGNED", "SCHEDULED"] },
    { key: "IN_PROGRESS", label: "Shooting", activeStatuses: ["IN_PROGRESS"] },
    { key: "RAW_UPLOADED", label: "Review Draft", activeStatuses: ["RAW_UPLOADED"] },
    { key: "EDITING", label: "Editing", activeStatuses: ["EDITING"] },
    { key: "READY_FOR_REVIEW", label: "Review", activeStatuses: ["READY_FOR_REVIEW", "CLIENT_APPROVAL"] },
    { key: "COMPLETED", label: "Complete", activeStatuses: ["PUBLISHED", "COMPLETED"] }
  ];

  const getStepStatus = (step, currentStatus) => {
    const statusOrder = [
      "BRIEF_CREATED", "SCRIPT_PENDING", "SCRIPT_SUBMITTED", "SCRIPT_CHANGES_REQUESTED",
      "SCRIPT_APPROVED", "CREW_ASSIGNED", "SCHEDULED", "IN_PROGRESS",
      "RAW_UPLOADED", "EDITING", "READY_FOR_REVIEW", "CLIENT_APPROVAL",
      "PUBLISHED", "COMPLETED"
    ];

    const currentIdx = statusOrder.indexOf(currentStatus);
    
    // Find ordering of target step
    let stepIdx = statusOrder.indexOf(step.key);
    if (step.key === "SCRIPT_SUBMITTED" && (currentStatus === "SCRIPT_PENDING" || currentStatus === "SCRIPT_CHANGES_REQUESTED")) {
      stepIdx = statusOrder.indexOf(currentStatus);
    }
    if (step.key === "SCHEDULED" && currentStatus === "CREW_ASSIGNED") {
      stepIdx = statusOrder.indexOf(currentStatus);
    }

    if (step.activeStatuses.includes(currentStatus)) return "active";
    if (currentIdx > stepIdx) return "done";
    return "waiting";
  };

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Shoot Management</h1>
          <p className="page-subtitle">Track shoot lifecycles, script revisions, crew, and raw assets</p>
        </div>
        {isManager && (
          <Btn icon={<SvgIcon name="video" size={14} color="#fff" />} onClick={() => setBriefModalOpen(true)}>
            Create Brief
          </Btn>
        )}
      </div>

      {/* STATS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <AnimStatCard label="Draft Briefs" value={stats.briefs} iconName="checklist" iconBg="#DBEAFE" iconColor="#1D4ED8" />
        <AnimStatCard label="Awaiting Script Approval" value={stats.pendingScript} iconName="clock" iconBg="#F5F3FF" iconColor="#6D28D9" />
        <AnimStatCard label="Upcoming Shoots" value={stats.upcoming} iconName="calendar" iconBg="#ECFDF5" iconColor="#059669" />
        <AnimStatCard label="Completed/Published" value={stats.completed} iconName="check" iconBg="#D1FAE5" iconColor="#047857" />
      </div>

      {/* VIEW SELECTOR & FILTERS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`filter-chip ${view === "table" ? "active" : ""}`} onClick={() => setView("table")}>Table View</button>
          <button className={`filter-chip ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>Calendar View</button>
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input" style={{ width: "auto", minWidth: 160, fontSize: 13 }}>
          <option value="all">All Statuses</option>
          <option value="BRIEF_CREATED">Brief Created</option>
          <option value="SCRIPT_PENDING">Script Pending</option>
          <option value="SCRIPT_SUBMITTED">Script Submitted</option>
          <option value="SCRIPT_APPROVED">Script Approved</option>
          <option value="SCRIPT_CHANGES_REQUESTED">Changes Requested</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RAW_UPLOADED">Raw Uploaded</option>
          <option value="EDITING">Editing</option>
          <option value="READY_FOR_REVIEW">Ready for Review</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <SearchBar value={search} onChange={setSearch} placeholder="Search shoots, clients..." style={{ marginLeft: "auto", minWidth: 220 }} />
      </div>

      {/* RENDER VIEW */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <span className="spin" style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
        </div>
      ) : view === "table" ? (
        <div className="card">
          <DataTable
            columns={[
              { key: "title", label: "Shoot Title", render: (v, row) => <span style={{ fontWeight: 700 }}>{v}</span> },
              { key: "client", label: "Client", render: v => v?.companyName || " - " },
              { key: "creativeLead", label: "Creative Lead", render: v => v?.username || " - " },
              { key: "shootDate", label: "Shoot Date", render: v => v ? new Date(v).toLocaleDateString("en-IN") : <span style={{ color: "var(--muted)" }}>Not set</span> },
              { key: "priority", label: "Priority", render: v => <StatusBadge status={v.toLowerCase()} /> },
              { key: "status", label: "Status", render: v => <StatusBadge status={v} /> },
            ]}
            data={filteredShoots}
            onRowClick={row => loadShootDetails(row.id)}
            emptyState={
              <EmptyState title="No Shoots Found" desc="Create a new brief or adjust your filters." />
            }
          />
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{monthNames[curMonth]} {curYear}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="filter-chip" onClick={() => { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); }}>Today</button>
              <button className="filter-chip" onClick={() => { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); } else setCurMonth(m => m - 1); }}>Prev</button>
              <button className="filter-chip" onClick={() => { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); } else setCurMonth(m => m + 1); }}>Next</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)", background: "#F9FAFB" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ padding: 8, textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {getCalendarCells().map((cell, i) => {
              const ds = fmtDateStr(cell.date);
              const dayShoots = shootsByDate[ds] || [];
              const isToday = ds === fmtDateStr(today);
              return (
                <div key={i} style={{ border: "1px solid var(--border)", padding: 4, minHeight: 90, background: isToday ? "var(--light-orange)" : cell.other ? "#F9FAFB" : "#fff" }}>
                  <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: isToday ? 800 : 500, color: cell.other ? "#D1D5DB" : "var(--dark)", marginBottom: 4 }}>
                    {cell.date.getDate()}
                  </div>
                  {dayShoots.map(s => {
                    const [bg, fg] = getShootColor(s.status);
                    return (
                      <div
                        key={s.id}
                        onClick={() => loadShootDetails(s.id)}
                        style={{
                          background: bg, color: fg, borderLeft: `3px solid ${fg}`,
                          fontSize: 10.5, fontWeight: 600, padding: "2px 4px", borderRadius: 4,
                          marginBottom: 3, cursor: "pointer", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap"
                        }}
                      >
                        {s.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE BRIEF MODAL */}
      <Modal open={briefModalOpen} onClose={() => setBriefModalOpen(false)} title="Create Shoot Brief">
        <form onSubmit={handleBriefSubmit}>
          <FormInput label="Shoot Title" placeholder="e.g. Founder Interview Video" value={briefForm.title} onChange={e => setBriefForm({ ...briefForm, title: e.target.value })} required />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormInput label="Client" type="select" value={briefForm.clientId} onChange={e => setBriefForm({ ...briefForm, clientId: e.target.value })} required>
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </FormInput>

            <FormInput label="Creative Lead (Employee)" type="select" value={briefForm.creativeLeadId} onChange={e => setBriefForm({ ...briefForm, creativeLeadId: e.target.value })} required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </FormInput>
          </div>

          <FormInput label="Objective" type="textarea" placeholder="What is the goal of this shoot?" value={briefForm.objective} onChange={e => setBriefForm({ ...briefForm, objective: e.target.value })} />
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormInput label="Deliverables" placeholder="e.g. 1x Reel, 1x Youtube video" value={briefForm.deliverables} onChange={e => setBriefForm({ ...briefForm, deliverables: e.target.value })} />
            <FormInput label="Target Audience" placeholder="e.g. Small Business Owners" value={briefForm.targetAudience} onChange={e => setBriefForm({ ...briefForm, targetAudience: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormInput label="Priority" type="select" value={briefForm.priority} onChange={e => setBriefForm({ ...briefForm, priority: e.target.value })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </FormInput>

            <FormInput label="Expected Deadline" type="date" value={briefForm.expectedDeadline} onChange={e => setBriefForm({ ...briefForm, expectedDeadline: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormInput label="Client Contact Name/Info" placeholder="e.g. Anil Gupta (+91...)" value={briefForm.clientContact} onChange={e => setBriefForm({ ...briefForm, clientContact: e.target.value })} />
            <FormInput label="Initial Shoot Location" placeholder="e.g. Studio A / Remote" value={briefForm.location} onChange={e => setBriefForm({ ...briefForm, location: e.target.value })} />
          </div>

          <FormInput label="Notes" type="textarea" placeholder="Notes on styling, references etc." value={briefForm.notes} onChange={e => setBriefForm({ ...briefForm, notes: e.target.value })} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <Btn variant="outline" onClick={() => setBriefModalOpen(false)}>Cancel</Btn>
            <Btn type="submit">Create Brief</Btn>
          </div>
        </form>
      </Modal>

      {/* SHOOT DETAILS MODAL DRAWER */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={`Shoot Details: ${selectedShoot?.title}`} size="lg">
        {selectedShoot && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {/* WORKFLOW TRACKER */}
            <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 12, border: "1.5px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>LIFECYCLE WORKFLOW</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                {workflowSteps.map(step => {
                  const s = getStepStatus(step, selectedShoot.status);
                  const color = s === "done" ? "var(--success)" : s === "active" ? "var(--primary)" : "var(--border)";
                  return (
                    <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 60 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", background: s === "done" ? "var(--success)" : s === "active" ? "var(--primary)" : "#F3F4F6",
                        color: s === "waiting" ? "var(--muted)" : "#fff", display: "flex", alignItems: "center", justifycontent: "center",
                        fontSize: 10.5, fontWeight: 700, border: `2px solid ${color}`, marginBottom: 4
                      }}>
                        {s === "done" ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: s === "active" ? 800 : 500, color: s === "active" ? "var(--primary)" : "var(--muted)" }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DRAFT SUBMISSION DISPLAY (PROMINENT AT TOP) */}
            {selectedShoot.shootDraftUrl && (
              <div style={{ background: "var(--light-orange)", padding: 16, borderRadius: 12, border: "1.5px solid rgba(255,106,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--deep)", fontWeight: 800, textTransform: "uppercase" }}>SUBMITTED SHOOT DRAFT (EDITING REVIEW)</span>
                    <a href={selectedShoot.shootDraftUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "var(--deep)", marginTop: 4 }}>
                      <SvgIcon name="video" size={14} color="var(--deep)" />
                      View/Download Shoot Draft File
                    </a>
                  </div>
                  {isManager && selectedShoot.status === "RAW_UPLOADED" && (
                    <Btn size="sm" onClick={() => { setEditingTasksList(["Edit Reel 1", "Edit Founder Video", "Edit Photo Batch"]); setTasksModalOpen(true); }}>
                      Generate Editing Tasks
                    </Btn>
                  )}
                </div>
              </div>
            )}

            {/* MAIN CONTENT GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
              {/* LEFT COLUMN: OVERVIEW & SCRIPT */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* OVERVIEW PANEL */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Overview</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Client: </span>
                      <strong style={{ display: "block" }}>{selectedShoot.client?.companyName}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Creative Lead: </span>
                      <strong style={{ display: "block" }}>{selectedShoot.creativeLead?.username}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Objective: </span>
                      <p style={{ marginTop: 2 }}>{selectedShoot.objective || "No objective defined"}</p>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Deliverables: </span>
                      <p style={{ marginTop: 2 }}>{selectedShoot.deliverables || "None Specified"}</p>
                    </div>
                  </div>

                  {selectedShoot.notes && (
                    <div style={{ marginTop: 12, background: "#F9FAFB", padding: 10, borderRadius: 8, fontSize: 12.5 }}>
                      <strong>Brief Notes:</strong> {selectedShoot.notes}
                    </div>
                  )}

                  {/* EXECUTION ACTION PANEL (FOR MANAGERS) */}
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedShoot.status === "SCHEDULED" && (selectedShoot.creativeLeadId === session.id || isManager) && (
                      <Btn size="sm" onClick={() => handleUpdateStatus("IN_PROGRESS")}>Start Shoot Execution</Btn>
                    )}
                    {selectedShoot.status === "READY_FOR_REVIEW" && isManager && (
                      <Btn size="sm" onClick={() => handleUpdateStatus("CLIENT_APPROVAL")}>Submit for Client Approval</Btn>
                    )}
                    {selectedShoot.status === "CLIENT_APPROVAL" && isManager && (
                      <Btn size="sm" onClick={() => handleUpdateStatus("PUBLISHED")}>Approve & Publish</Btn>
                    )}
                    {selectedShoot.status === "PUBLISHED" && isManager && (
                      <Btn size="sm" variant="success" onClick={() => handleUpdateStatus("COMPLETED")}>Mark Shoot Completed</Btn>
                    )}
                    {selectedShoot.status !== "COMPLETED" && selectedShoot.status !== "CANCELLED" && isManager && (
                      <Btn size="sm" variant="danger" onClick={() => handleUpdateStatus("CANCELLED")}>Cancel Shoot</Btn>
                    )}
                    {(selectedShoot.status === "COMPLETED" || selectedShoot.status === "PUBLISHED") && 
                     (role === "superadmin" || role === "manager") && (
                      <Btn size="sm" onClick={() => setPublishingModalOpen(true)}>
                        <SvgIcon name="calendar" size={14} /> Schedule for Publishing
                      </Btn>
                    )}
                  </div>
                </div>

                {/* SCRIPT WRITER & REVIEW PANEL */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                    <span>Script Development</span>
                    {selectedShoot.scripts?.length > 0 && (
                      <StatusBadge status={selectedShoot.scripts[0].status} />
                    )}
                  </h3>

                  {/* Write/Edit Script (Only Creative Lead Employee and if script is draft/changes requested) */}
                  {selectedShoot.creativeLeadId === session.id &&
                   (!selectedShoot.scripts?.[0] || selectedShoot.scripts[0].status === "DRAFT" || selectedShoot.scripts[0].status === "CHANGES_REQUESTED") ? (
                    <div>
                      {selectedShoot.scripts?.[0]?.managerFeedback && (
                        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                          <strong>Manager Feedback:</strong> "{selectedShoot.scripts[0].managerFeedback}"
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <FormInput label="Hook (Optional)" placeholder="Hook of the video..." value={scriptForm.hook} onChange={e => setScriptForm({ ...scriptForm, hook: e.target.value })} />
                        <FormInput label="Voiceover / Copy (Optional)" type="textarea" placeholder="Voiceover details..." value={scriptForm.voiceover} onChange={e => setScriptForm({ ...scriptForm, voiceover: e.target.value })} />
                      </div>
                      <FormInput label="Main Script Content (Optional)" type="textarea" placeholder="Script lines and actions..." value={scriptForm.script} onChange={e => setScriptForm({ ...scriptForm, script: e.target.value })} />
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <FormInput label="CTA (Optional)" placeholder="Call to action details..." value={scriptForm.cta} onChange={e => setScriptForm({ ...scriptForm, cta: e.target.value })} />
                        <FormInput label="References / Links (Optional)" placeholder="Drive / Figma / Inspiration links..." value={scriptForm.references} onChange={e => setScriptForm({ ...scriptForm, references: e.target.value })} />
                      </div>

                      {/* File Upload for Script Brief */}
                      <div style={{ background: "#F9FAFB", border: "1.5px dashed var(--border)", padding: 14, borderRadius: 8, marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Upload Script Brief File (Optional)</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input type="file" onChange={e => setScriptFile(e.target.files[0])} style={{ fontSize: 12 }} />
                          {scriptFile && <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>Selected file: {scriptFile.name}</span>}
                        </div>
                        {selectedShoot.scripts?.[0]?.scriptFileUrl && (
                          <div style={{ marginTop: 10, fontSize: 12, background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
                            <span style={{ color: "var(--muted)" }}>Current brief file: </span>
                            <a href={selectedShoot.scripts[0].scriptFileUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: "var(--primary)" }}>Download Script File</a>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <Btn variant="outline" size="sm" onClick={handleSaveScriptDraft}>Save Draft</Btn>
                        <Btn size="sm" onClick={handleSubmitScript}>Submit Script</Btn>
                      </div>
                    </div>
                  ) : (
                    /* View Script (Manager View or Readonly Employee View) */
                    <div>
                      {selectedShoot.scripts?.length > 0 ? (
                        <div>
                          {selectedShoot.scripts[0].managerFeedback && (
                            <div style={{ background: "#FEF3C7", padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                              <strong>Manager Feedback:</strong> {selectedShoot.scripts[0].managerFeedback}
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, fontSize: 12.5 }}>
                            <div><strong>Hook:</strong> {selectedShoot.scripts[0].hook || " - "}</div>
                            <div><strong>Script Content:</strong><p style={{ background: "#F9FAFB", padding: 8, borderRadius: 6, marginTop: 3 }}>{selectedShoot.scripts[0].script || " - "}</p></div>
                            <div><strong>Voiceover:</strong> {selectedShoot.scripts[0].voiceover || " - "}</div>
                            <div><strong>CTA:</strong> {selectedShoot.scripts[0].cta || " - "}</div>
                            <div>
                              <strong>References:</strong>{" "}
                              {selectedShoot.scripts[0].references ? (
                                <a href={selectedShoot.scripts[0].references} target="_blank" rel="noopener noreferrer">{selectedShoot.scripts[0].references}</a>
                              ) : " - "}
                            </div>
                            {selectedShoot.scripts[0].scriptFileUrl && (
                              <div style={{ background: "#F9FAFB", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                                <strong>Attached Script Brief File:</strong>
                                <a href={selectedShoot.scripts[0].scriptFileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: "var(--primary)", fontWeight: 700, marginTop: 3 }}>
                                  Download Script Brief File
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Manager Actions (Approve / Reject) */}
                          {isManager && selectedShoot.scripts[0].status === "SUBMITTED" && (
                            <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                              {showFeedbackBox ? (
                                <div>
                                  <FormInput label="Feedback Comments" type="textarea" placeholder="Add feedback instructions..." value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} />
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <Btn size="sm" variant="danger" onClick={handleRequestScriptChanges}>Submit Changes</Btn>
                                    <Btn size="sm" variant="ghost" onClick={() => setShowFeedbackBox(false)}>Cancel</Btn>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <Btn size="sm" variant="success" onClick={handleApproveScript}>Approve Script</Btn>
                                  <Btn size="sm" variant="outline" onClick={() => setShowFeedbackBox(true)}>Request Changes</Btn>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: "var(--muted)" }}>No script submitted yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: SCHEDULE, CREW, ASSETS, DRAFT UPLOADS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* DRAFT SUBMISSION (EMPLOYEE-ONLY VIEW DURING EXECUTION) */}
                {!isManager && (selectedShoot.creativeLeadId === session.id || selectedShoot.crew?.some(c => c.employeeId === session.id)) &&
                 (selectedShoot.status === "IN_PROGRESS" || selectedShoot.status === "SCHEDULED") && (
                  <div className="card" style={{ padding: 16, border: "1.5px solid var(--primary)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)", marginBottom: 8 }}>Submit Shoot Draft</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                      Upload the completed video draft/asset file for editing review.
                    </p>
                    <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1.5px dashed var(--primary)" }}>
                      <input type="file" onChange={handleShootDraftUpload} disabled={uploadingFile} style={{ fontSize: 12 }} />
                      {uploadingFile && <span style={{ display: "block", fontSize: 11, color: "var(--deep)", marginTop: 6, fontWeight: 600 }}>Uploading draft to Cloudinary...</span>}
                    </div>
                  </div>
                )}

                {/* SCHEDULE PANEL */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", justifycontent: "space-between" }}>
                    <span>Schedule</span>
                    {isManager && (
                      <button onClick={() => { setScheduleForm({ shootDate: selectedShoot.shootDate ? fmtDateStr(new Date(selectedShoot.shootDate)) : "", shootTime: selectedShoot.shootTime || "", location: selectedShoot.location || "" }); setScheduleModalOpen(true); }} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Edit</button>
                    )}
                  </h3>
                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div><span style={{ color: "var(--muted)" }}>Date:</span> {selectedShoot.shootDate ? new Date(selectedShoot.shootDate).toLocaleDateString("en-IN") : "Not Scheduled"}</div>
                    <div><span style={{ color: "var(--muted)" }}>Time:</span> {selectedShoot.shootTime || "Not Scheduled"}</div>
                    <div><span style={{ color: "var(--muted)" }}>Location:</span> {selectedShoot.location || "Not Scheduled"}</div>
                    <div><span style={{ color: "var(--muted)" }}>Client Contact:</span> {selectedShoot.clientContact || "None"}</div>
                  </div>
                </div>

                {/* CREW PANEL */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", justifycontent: "space-between" }}>
                    <span>Crew Assigned</span>
                    {isManager && (
                      <button onClick={() => {
                        const currentCrew = selectedShoot.crew?.map(c => ({ employeeId: c.employeeId, role: c.role })) || [];
                        setCrewRows(currentCrew.length > 0 ? currentCrew : [{ employeeId: "", role: "VIDEOGRAPHER" }]);
                        setCrewModalOpen(true);
                      }} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Manage</button>
                    )}
                  </h3>
                  {selectedShoot.crew?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedShoot.crew.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                          <Avatar name={c.employee.username} size="sm" />
                          <div>
                            <strong>{c.employee.username}</strong>
                            <span style={{ display: "block", fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>{c.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No crew members assigned.</p>
                  )}
                </div>

                {/* ASSETS PANEL */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                    Assets Upload (Manager/AM)
                  </h3>

                  {/* UPLOADER (MANAGER ONLY) */}
                  {isManager && (
                    <div style={{ marginBottom: 12, background: "#F9FAFB", padding: 10, borderRadius: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8, marginBottom: 6 }}>
                        <select value={uploadAssetType} onChange={e => setUploadAssetType(e.target.value)} className="form-input" style={{ fontSize: 12, height: 32, padding: "0 8px" }}>
                          <option value="RAW">Raw</option>
                          <option value="EDITED">Edited</option>
                          <option value="FINAL">Final</option>
                          <option value="BTS">BTS</option>
                        </select>
                        <Btn size="sm" variant="outline" disabled={uploadingFile} style={{ height: 32 }}>
                          <label style={{ cursor: "pointer", display: "block", width: "100%", height: "100%", alignContent: "center" }}>
                            {uploadingFile ? "Uploading..." : "Upload File"}
                            <input type="file" onChange={handleAssetUpload} style={{ display: "none" }} disabled={uploadingFile} />
                          </label>
                        </Btn>
                      </div>
                    </div>
                  )}

                  {/* ASSETS LIST */}
                  {selectedShoot.assets?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                      {selectedShoot.assets.map(a => (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", justifycontent: "space-between", fontSize: 12, borderBottom: "1px solid #F3F4F6", paddingBottom: 6, gap: 10 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <a href={a.assetUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.assetUrl.split("/").pop()}
                            </a>
                            <span style={{ fontSize: 9.5, color: "var(--muted)", textTransform: "uppercase" }}>{a.assetType} . By {a.uploader?.username || "unknown"}</span>
                          </div>
                          {isManager && (
                            <button onClick={() => handleAssetDelete(a.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 11, padding: "0 4px" }}>Delete</button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No assets uploaded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* SCHEDULE MODAL */}
      <Modal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule Shoot">
        <form onSubmit={handleScheduleSubmit}>
          <FormInput label="Shoot Date" type="date" value={scheduleForm.shootDate} onChange={e => setScheduleForm({ ...scheduleForm, shootDate: e.target.value })} required />
          <FormInput label="Shoot Time" type="text" placeholder="e.g. 10:00 AM - 2:00 PM" value={scheduleForm.shootTime} onChange={e => setScheduleForm({ ...scheduleForm, shootTime: e.target.value })} />
          <FormInput label="Location" type="text" placeholder="e.g. Studio A / Remote Address" value={scheduleForm.location} onChange={e => setScheduleForm({ ...scheduleForm, location: e.target.value })} />

          <div style={{ display: "flex", justifycontent: "flex-end", gap: 10, marginTop: 14 }}>
            <Btn variant="outline" onClick={() => setScheduleModalOpen(false)}>Cancel</Btn>
            <Btn type="submit">Save Schedule</Btn>
          </div>
        </form>
      </Modal>

      {/* CREW MODAL */}
      <Modal open={crewModalOpen} onClose={() => setCrewModalOpen(false)} title="Assign Shoot Crew">
        <form onSubmit={handleCrewSubmit}>
          <div style={{ maxHeight: 250, overflowY: "auto", marginBottom: 12 }}>
            {crewRows.map((row, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                <FormInput label="Employee" type="select" value={row.employeeId} onChange={e => {
                  const updated = [...crewRows];
                  updated[idx].employeeId = e.target.value;
                  setCrewRows(updated);
                }} required>
                  <option value="">Select Crew Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </FormInput>

                <FormInput label="Role" type="select" value={row.role} onChange={e => {
                  const updated = [...crewRows];
                  updated[idx].role = e.target.value;
                  setCrewRows(updated);
                }}>
                  <option value="VIDEOGRAPHER">Videographer</option>
                  <option value="PHOTOGRAPHER">Photographer</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ASSISTANT">Assistant</option>
                </FormInput>

                {crewRows.length > 1 && (
                  <button type="button" onClick={() => setCrewRows(crewRows.filter((_, i) => i !== idx))} className="btn btn-ghost btn-sm" style={{ marginBottom: 16, color: "var(--danger)" }}>Remove</button>
                )}
              </div>
            ))}
          </div>

          <Btn variant="outline" size="sm" onClick={() => setCrewRows([...crewRows, { employeeId: "", role: "VIDEOGRAPHER" }])}>+ Add Member</Btn>

          <div style={{ display: "flex", justifycontent: "flex-end", gap: 10, marginTop: 14 }}>
            <Btn variant="outline" onClick={() => setCrewModalOpen(false)}>Cancel</Btn>
            <Btn type="submit">Assign Crew</Btn>
          </div>
        </form>
      </Modal>

      {/* GENERATE TASKS MODAL */}
      <Modal open={tasksModalOpen} onClose={() => setTasksModalOpen(false)} title="Generate Editing Tasks">
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
            Confirm and edit tasks to generate automatically in the Task module. They will inherit the Shoot's client/manager details and be assigned to Shoot Crew Editors.
          </p>

          {editingTasksList.map((task, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input
                type="text"
                className="form-input"
                value={task}
                onChange={e => {
                  const updated = [...editingTasksList];
                  updated[idx] = e.target.value;
                  setEditingTasksList(updated);
                }}
              />
              <button onClick={() => setEditingTasksList(editingTasksList.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 12 }}>Remove</button>
            </div>
          ))}

          <Btn variant="outline" size="sm" onClick={() => setEditingTasksList([...editingTasksList, `New Editing Task ${editingTasksList.length + 1}`])}>+ Add Task</Btn>

          <div style={{ display: "flex", justifycontent: "flex-end", gap: 10, marginTop: 14 }}>
            <Btn variant="outline" onClick={() => setTasksModalOpen(false)}>Cancel</Btn>
            <Btn onClick={handleGenerateTasks}>Generate Tasks</Btn>
          </div>
        </div>
      </Modal>

      <ScheduleModal
        open={publishingModalOpen}
        onClose={() => setPublishingModalOpen(false)}
        shoot={selectedShoot}
        onSuccess={() => {
          loadShootDetails(selectedShoot.id);
          fetchShoots();
        }}
      />
    </div>
  );
}

export default ShootsPage;
