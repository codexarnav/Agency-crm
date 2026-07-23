// Global CSS styles for the CRM application
// Extracted from AgencyCRM.jsx - all styles remain identical

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #FF6A00;
    --deep: #E95A00;
    --light-orange: #FFF3E8;
    --bg: #FAFAFA;
    --card: #FFFFFF;
    --dark: #151515;
    --muted: #6B7280;
    --border: #E5E7EB;
    --success: #16A34A;
    --warning: #F59E0B;
    --danger: #DC2626;
    --purple: #7C3AED;
    --sidebar-w: 256px;
    --topbar-h: 64px;
    --radius: 10px;
    --radius-lg: 14px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 10px 28px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--dark); line-height: 1.5; -webkit-font-smoothing: antialiased; }

  h1,h2,h3,h4,h5,h6 { font-family: 'Plus Jakarta Sans', sans-serif; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }

  button { font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; outline: none; }
  input, textarea, select { font-family: 'DM Sans', sans-serif; outline: none; }

  .app-shell { display: flex; height: 100vh; overflow: hidden; }

  .sidebar {
    width: var(--sidebar-w); min-width: var(--sidebar-w);
    background: var(--dark);
    display: flex; flex-direction: column;
    height: 100vh; overflow-y: auto;
    transition: transform 0.3s ease, width 0.3s ease;
    position: relative; z-index: 50;
    text-align: left;
  }
  .sidebar.collapsed { width: 72px; min-width: 72px; }

  .sidebar-logo {
    padding: 20px 20px 16px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .sidebar-logo .logo-mark {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, var(--primary), var(--deep));
    display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800; font-size: 16px; color: #fff;
    flex-shrink: 0;
  }
  .sidebar-logo .logo-text { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 15px; color: #fff; white-space: nowrap; overflow: hidden; }
  .sidebar-logo .logo-sub { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 400; }

  .sidebar-section { padding: 16px 12px 4px; }
  .sidebar-section-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.08em; padding: 0 8px 8px; white-space: nowrap; overflow: hidden; text-align: left; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 8px; margin-bottom: 2px;
    color: rgba(255,255,255,0.55); font-size: 13.5px; font-weight: 500;
    cursor: pointer; transition: all 0.15s; white-space: nowrap; overflow: hidden;
    text-decoration: none;
  }
  .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
  .nav-item.active { background: rgba(255,106,0,0.15); color: var(--primary); }
  .nav-item .nav-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .nav-item .nav-badge {
    margin-left: auto; background: var(--primary); color: #fff;
    font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 99px; flex-shrink: 0;
  }
  .nav-item.active .nav-badge { background: var(--primary); }

  .sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid rgba(255,255,255,0.08); }

  .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .topbar {
    height: var(--topbar-h); background: var(--card); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px; gap: 16px;
    flex-shrink: 0; z-index: 40;
  }
  .topbar-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 18px; flex: 1; }
  .topbar-actions { display: flex; align-items: center; gap: 10px; }

  .page-content { flex: 1; overflow-y: auto; padding: 24px; }

  .stat-card {
    background: var(--card); border-radius: var(--radius-lg); padding: 20px;
    border: 1px solid var(--border); box-shadow: var(--shadow);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .stat-card .stat-label { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-bottom: 8px; }
  .stat-card .stat-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: var(--dark); line-height: 1; }
  .stat-card .stat-sub { font-size: 12px; color: var(--muted); margin-top: 6px; display: flex; align-items: center; gap: 4px; }
  .stat-card .stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  .card { background: var(--card); border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: var(--shadow); }
  .card-header { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 15px; }
  .card-body { padding: 20px; }

  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 600;
    transition: all 0.15s; cursor: pointer; white-space: nowrap;
  }
  .btn-primary { background: var(--primary); color: #fff; border: 1.5px solid var(--primary); }
  .btn-primary:hover { background: var(--deep); border-color: var(--deep); }
  .btn-outline { background: transparent; color: var(--dark); border: 1.5px solid var(--border); }
  .btn-outline:hover { background: #F9FAFB; border-color: #D1D5DB; }
  .btn-ghost { background: transparent; color: var(--muted); border: 1.5px solid transparent; }
  .btn-ghost:hover { background: #F3F4F6; color: var(--dark); }
  .btn-danger { background: var(--danger); color: #fff; border: 1.5px solid var(--danger); }
  .btn-success { background: var(--success); color: #fff; border: 1.5px solid var(--success); }
  .btn-sm { padding: 5px 12px; font-size: 12px; border-radius: 6px; }
  .btn-lg { padding: 11px 22px; font-size: 15px; border-radius: 10px; }
  .btn-icon { padding: 8px; width: 36px; height: 36px; justify-content: center; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 99px; font-size: 11.5px; font-weight: 600;
  }
  .badge-success { background: #DCFCE7; color: #15803D; }
  .badge-warning { background: #FEF9C3; color: #854D0E; }
  .badge-danger { background: #FEE2E2; color: #B91C1C; }
  .badge-info { background: #DBEAFE; color: #1D4ED8; }
  .badge-muted { background: #F3F4F6; color: #4B5563; }
  .badge-purple { background: #EDE9FE; color: #5B21B6; }
  .badge-orange { background: var(--light-orange); color: var(--deep); }

  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 13px; font-weight: 600; color: var(--dark); margin-bottom: 6px; }
  .form-input {
    width: 100%; padding: 9px 12px; border-radius: 8px;
    border: 1.5px solid var(--border); background: #fff; color: var(--dark);
    font-size: 14px; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,106,0,0.1); }
  .form-input::placeholder { color: #9CA3AF; }
  .form-input.error { border-color: var(--danger); }
  .form-hint { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .form-error { font-size: 12px; color: var(--danger); margin-top: 4px; }

  .search-bar {
    display: flex; align-items: center; gap: 8px;
    background: #F9FAFB; border: 1.5px solid var(--border);
    border-radius: 8px; padding: 7px 12px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,106,0,0.08); background: #fff; }
  .search-bar input { border: none; background: transparent; font-size: 13.5px; color: var(--dark); flex: 1; min-width: 0; }
  .search-bar input::placeholder { color: #9CA3AF; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .data-table th {
    text-align: left; padding: 6px 10px; font-size: 11.5px; font-weight: 700;
    color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em;
    background: #F9FAFB; border-bottom: 1px solid var(--border);
  }
  .data-table td { padding: 6px 10px; border-bottom: 1px solid #F3F4F6; color: var(--dark); vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #FAFAFA; }
  .data-table .td-actions { display: flex; align-items: center; gap: 6px; }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; z-index: 100;
    padding: 20px;
    animation: fadeIn 0.15s ease;
  }
  .modal-box {
    background: var(--card); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg); width: 100%; max-width: 520px;
    max-height: 90vh; overflow-y: auto;
    animation: slideUp 0.2s ease;
  }
  .modal-box.modal-lg { max-width: 720px; }
  .modal-box.modal-fullscreen { max-width: 70vw; width: 70vw; max-height: 90vh; overflow: hidden; }
  .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 16px; }
  .modal-body { padding: 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: flex-end; gap: 10px; }

  .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 200; display: flex; flex-direction: column; gap: 8px; }
  .toast {
    background: var(--dark); color: #fff; padding: 12px 16px; border-radius: 10px;
    font-size: 13.5px; display: flex; align-items: center; gap: 10px;
    box-shadow: var(--shadow-lg); min-width: 260px; max-width: 360px;
    animation: slideInRight 0.25s ease;
  }
  .toast.success { background: var(--success); }
  .toast.warning { background: var(--warning); color: var(--dark); }
  .toast.danger { background: var(--danger); }
  .toast.info { background: var(--primary); }

  .progress-bar-wrap { background: #E5E7EB; border-radius: 99px; overflow: hidden; }
  .progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
  .empty-icon { width: 64px; height: 64px; border-radius: 16px; background: var(--light-orange); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 28px; }
  .empty-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 16px; margin-bottom: 8px; }
  .empty-desc { font-size: 13.5px; color: var(--muted); max-width: 300px; line-height: 1.6; }

  .filter-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .filter-chip {
    padding: 5px 12px; border-radius: 99px; font-size: 12.5px; font-weight: 500;
    border: 1.5px solid var(--border); background: #fff; color: var(--muted);
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .filter-chip:hover { border-color: var(--primary); color: var(--primary); }
  .filter-chip.active { border-color: var(--primary); background: var(--light-orange); color: var(--primary); font-weight: 600; }

  .avatar {
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; flex-shrink: 0;
  }
  .avatar-sm { width: 28px; height: 28px; font-size: 11px; }
  .avatar-md { width: 36px; height: 36px; font-size: 13px; }
  .avatar-lg { width: 44px; height: 44px; font-size: 16px; }

  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }

  .flex-between { display: flex; align-items: center; justify-content: space-between; }
  .flex-center { display: flex; align-items: center; justify-content: center; }

  .tag {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
    border-radius: 5px; font-size: 11.5px; font-weight: 600; border: 1px solid;
  }

  .page-header { margin-bottom: 24px; }
  .page-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 24px; color: var(--dark); }
  .page-subtitle { font-size: 14px; color: var(--muted); margin-top: 4px; }

  .mobile-menu-btn { display: none; }
  .sidebar-overlay { display: none; }
  .approval-timeline { display: flex; flex-direction: column; gap: 0; }
  .timeline-step { display: flex; gap: 14px; padding: 0 0 20px 0; position: relative; }
  .timeline-step:last-child { padding-bottom: 0; }
  .timeline-dot-col { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 28px; }
  .timeline-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px; z-index: 1; border: 2.5px solid; }
  .timeline-dot.done { background: var(--success); border-color: var(--success); color: #fff; }
  .timeline-dot.active { background: var(--primary); border-color: var(--primary); color: #fff; animation: pulse 2s infinite; }
  .timeline-dot.waiting { background: #F9FAFB; border-color: var(--border); color: var(--muted); }
  .timeline-line { width: 2px; flex: 1; background: var(--border); margin: 3px 0; min-height: 20px; }
  .timeline-line.done { background: var(--success); }
  .timeline-content { flex: 1; min-width: 0; padding-top: 3px; }
  .timeline-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--dark); margin-bottom: 3px; }
  .timeline-sub { font-size: 12px; color: var(--muted); line-height: 1.5; }

  .approval-card { border: 1.5px solid var(--border); border-radius: 12px; background: var(--card); transition: all 0.15s; }
  .approval-card:hover { border-color: rgba(255,106,0,0.4); box-shadow: 0 4px 14px rgba(255,106,0,0.07); }
  .approval-card.urgent-border { border-color: var(--danger); }
  .approval-card.approved-border { border-color: var(--success); }

  .revision-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 700; }

  .client-action-btn { flex: 1; padding: 10px 8px; border-radius: 9px; border: 1.5px solid; cursor: pointer; font-size: 13px; font-weight: 700; font-family: 'DM Sans', sans-serif; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 7px; }
  .client-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

  .pipeline-row { display: grid; gap: 0; border-bottom: 1px solid var(--border); transition: background 0.12s; cursor: pointer; }
  .pipeline-row:hover { background: #FAFAFA; }
  .pipeline-row:last-child { border-bottom: none; }

  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.65;} }

  @media (max-width: 768px) {
    .sidebar.mobile-open { transform: translateX(0); }
    .mobile-menu-btn { display: flex; }
    .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 190; }
    .page-content { padding: 16px; }
    .topbar { padding: 0 16px; }
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(2, 1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .grid-stats { grid-template-columns: repeat(2, 1fr); }
    .data-table { font-size: 12.5px; }
    .data-table th, .data-table td { padding: 10px; }
    .hide-mobile { display: none !important; }
  }

  @media (max-width: 480px) {
    .grid-4, .grid-stats { grid-template-columns: 1fr; }
    .grid-3 { grid-template-columns: 1fr; }
    .filter-bar { gap: 6px; }
    .page-title { font-size: 20px; }
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
  .fade-in { animation: fadeIn 0.3s ease; }

  .hover-lift { transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease; }
  .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 12px 24px -10px rgba(0,0,0,0.12), 0 4px 12px -5px rgba(0,0,0,0.06); border-color: rgba(255, 106, 0, 0.3); }

  @keyframes slideInDrawer {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .drawer-slide-in {
    animation: slideInDrawer 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .dot-success { background: var(--success); }
  .dot-warning { background: var(--warning); }
  .dot-danger { background: var(--danger); }
  .dot-muted { background: #D1D5DB; }
  .dot-primary { background: var(--primary); }

  select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }

  .notification-dot {
    position: absolute; top: -2px; right: -2px;
    width: 8px; height: 8px; border-radius: 50%; background: var(--danger);
    border: 2px solid var(--card);
  }

  .role-badge-superadmin { background: #1E1B4B; color: #A5B4FC; }
  .role-badge-manager { background: #FFF3E8; color: #E95A00; }
  .role-badge-accountmanager { background: #ECFDF5; color: #065F46; }
  .role-badge-employee { background: #EFF6FF; color: #1D4ED8; }
  .role-badge-client { background: #F5F3FF; color: #5B21B6; }
  .nav-item { position: relative; }
  .nav-item::before {
    content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 0; background: var(--primary); border-radius: 0 3px 3px 0;
    transition: height 0.2s ease; border-radius: 99px;
  }
  .nav-item.active::before { height: 20px; }
  .nav-item .nav-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-collapse-btn {
    position: absolute; top: 20px; right: -12px; width: 24px; height: 24px;
    border-radius: 50%; background: var(--card); border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 60; transition: all 0.15s; box-shadow: var(--shadow);
  }
  .sidebar-collapse-btn:hover { background: var(--light-orange); border-color: var(--primary); }
  .global-search {
    display: flex; align-items: center; gap: 8px;
    background: #F9FAFB; border: 1.5px solid var(--border);
    border-radius: 9px; padding: 6px 12px; min-width: 240px; max-width: 340px;
    transition: all 0.2s; cursor: text;
  }
  .global-search:focus-within { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 3px rgba(255,106,0,0.1); min-width: 300px; }
  .global-search input { border: none; background: transparent; font-size: 13px; color: var(--dark); flex: 1; min-width: 0; }
  .global-search input::placeholder { color: #9CA3AF; }
  .search-shortcut { background: #E5E7EB; color: var(--muted); font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: 600; white-space: nowrap; }
  .user-dropdown-wrap { position: relative; }
  .user-dropdown-trigger {
    display: flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 9px;
    cursor: pointer; transition: background 0.15s; border: 1.5px solid transparent;
    background: transparent;
  }
  .user-dropdown-trigger:hover { background: #F3F4F6; border-color: var(--border); }
  .user-dropdown-menu {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    box-shadow: var(--shadow-lg); min-width: 220px; z-index: 300; overflow: hidden;
    animation: slideUp 0.15s ease;
  }
  .dropdown-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    font-size: 13.5px; color: var(--dark); cursor: pointer; transition: background 0.12s;
    border: none; background: transparent; width: 100%; text-align: left;
  }
  .dropdown-item:hover { background: #F9FAFB; }
  .dropdown-item.danger { color: var(--danger); }
  .dropdown-item.danger:hover { background: #FEF2F2; }
  .dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }
  .notif-panel {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    box-shadow: var(--shadow-lg); width: 340px; max-height: 480px; overflow-y: auto;
    z-index: 300; animation: slideUp 0.15s ease;
  }
  .notif-item { padding: 12px 16px; border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.12s; }
  .notif-item:hover { background: #FAFAFA; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item.unread { background: var(--light-orange); }
  .notif-item.unread:hover { background: #FFE8CC; }
  .role-banner {
    border-radius: var(--radius-lg); padding: 20px 24px; margin-bottom: 24px;
    display: flex; align-items: center; gap: 16px; position: relative; overflow: hidden;
  }
  .role-banner::after {
    content: ""; position: absolute; right: -20px; top: -30px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .role-banner::before {
    content: ""; position: absolute; right: 60px; bottom: -40px;
    width: 120px; height: 120px; border-radius: 50%;
    background: rgba(255,255,255,0.05);
  }
  .activity-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot-wrap { display: flex; flex-direction: column; align-items: center; padding-top: 3px; }
  .activity-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .activity-line { width: 1px; flex: 1; background: #E5E7EB; margin-top: 4px; }
  .approval-card {
    border: 1.5px solid var(--border); border-radius: 10px; padding: 14px;
    transition: all 0.15s; cursor: pointer;
  }
  .approval-card:hover { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,106,0,0.06); }
  .deadline-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
  .deadline-item:last-child { border-bottom: none; }
  .deadline-day-badge {
    width: 40px; height: 44px; border-radius: 8px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; flex-shrink: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .stat-value-anim { animation: countUp 0.5s ease forwards; }
  .kanban-col { background: #F9FAFB; border-radius: 10px; padding: 12px; min-height: 80px; }
  .kanban-col-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .kanban-task { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
  .kanban-task:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); border-color: rgba(255,106,0,0.3); }
  .client-card { border: 1.5px solid var(--border); border-radius: 12px; padding: 16px; transition: all 0.15s; cursor: pointer; background: var(--card); }
  .client-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .section-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 15px; color: var(--dark); }
  .section-link { font-size: 12.5px; color: var(--primary); font-weight: 600; cursor: pointer; }
  .section-link:hover { text-decoration: underline; }
  .pipeline-track { display: flex; gap: 0; }
  .pipeline-step { flex: 1; text-align: center; padding: 6px 4px; font-size: 11px; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.3); }
  .pipeline-step:last-child { border-right: none; }
  .quick-action {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 14px 10px; border-radius: 10px; cursor: pointer; transition: all 0.15s;
    border: 1.5px solid var(--border); background: var(--card); flex: 1; min-width: 80px;
  }
  .quick-action:hover { border-color: var(--primary); background: var(--light-orange); }
  .quick-action .qa-icon { font-size: 20px; }
  .quick-action .qa-label { font-size: 11.5px; font-weight: 600; color: var(--dark); text-align: center; }

  @media (max-width: 768px) {
    .global-search { min-width: 160px; }
    .global-search:focus-within { min-width: 200px; }
    .notif-panel { width: 300px; right: -60px; }
    .user-dropdown-menu { width: 200px; }
    .role-banner { padding: 16px; }
    .kanban-col { min-height: 60px; }
  }
  @media (max-width: 480px) {
    .global-search { display: none; }
    .notif-panel { width: 90vw; right: -20px; }
  }
`;

export default css;
