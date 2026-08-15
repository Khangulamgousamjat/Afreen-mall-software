import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Lock, Unlock, Key, Activity, Building2, GitBranch,
  Settings, Hash, Zap, GitMerge, Bell, Monitor, BookOpen, History,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, LogOut, UserX, UserCheck,
  Eye, EyeOff, ChevronRight, RotateCcw, Wifi, Database, Clock, Flag,
  ToggleLeft, ToggleRight, Tag, Wrench, Server, HardDrive, Cpu, MemoryStick,
  Play, Pause, ListChecks, Radio, Globe, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { RoleName } from '@afreen-mall/shared-types';
import { CreateUserModal } from '../components/CreateUserModal';
import { CreateCompanyModal } from '../components/CreateCompanyModal';
import { CreateBranchModal } from '../components/CreateBranchModal';
import { RolePermissionsModal } from '../components/RolePermissionsModal';
import { ApprovalRuleModal } from '../components/ApprovalRuleModal';
import { WorkflowEditorModal } from '../components/WorkflowEditorModal';
import { NumberSeriesModal } from '../components/NumberSeriesModal';
import { BackupRestoreModal } from '../components/BackupRestoreModal';
import { SchedulerJobModal } from '../components/SchedulerJobModal';
import { CreateApiKeyModal } from '../components/CreateApiKeyModal';
import { LicenseActivateModal } from '../components/LicenseActivateModal';
import { MaintenanceModeModal } from '../components/MaintenanceModeModal';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type AdminTab =
  | 'dashboard' | 'users' | 'roles' | 'permissions' | 'companies'
  | 'branches' | 'config' | 'number-series' | 'approvals' | 'workflows'
  | 'sessions' | 'audit' | 'login-history'
  | 'activity-log' | 'backup' | 'system-health' | 'scheduler'
  | 'feature-flags' | 'api-management' | 'licensing' | 'maintenance';

const TAB_GROUPS = [
  { label: 'Identity & Access', tabs: ['dashboard','users','roles','permissions','sessions','audit','login-history'] },
  { label: 'Organisation', tabs: ['companies','branches','config','number-series'] },
  { label: 'Engines', tabs: ['approvals','workflows'] },
  { label: 'Operations', tabs: ['activity-log','backup','system-health','scheduler','maintenance'] },
  { label: 'Platform', tabs: ['feature-flags','api-management','licensing'] },
];

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Security Dashboard', icon: Monitor },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
  { id: 'permissions', label: 'Permission Matrix', icon: Eye },
  { id: 'companies', label: 'Multi-Company', icon: Building2 },
  { id: 'branches', label: 'Multi-Branch', icon: GitBranch },
  { id: 'config', label: 'System Config', icon: Settings },
  { id: 'number-series', label: 'Number Series', icon: Hash },
  { id: 'approvals', label: 'Approval Engine', icon: Zap },
  { id: 'workflows', label: 'Workflow Engine', icon: GitMerge },
  { id: 'sessions', label: 'Active Sessions', icon: Wifi },
  { id: 'audit', label: 'Audit Log', icon: BookOpen },
  { id: 'login-history', label: 'Login History', icon: History },
  // Part 2
  { id: 'activity-log', label: 'Activity Log', icon: Activity },
  { id: 'backup', label: 'Backup & Restore', icon: Database },
  { id: 'system-health', label: 'System Health', icon: Server },
  { id: 'scheduler', label: 'Scheduler', icon: Clock },
  { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
  { id: 'api-management', label: 'API Management', icon: Globe },
  { id: 'licensing', label: 'Licensing', icon: Tag },
  { id: 'maintenance', label: 'Maintenance Mode', icon: Wrench },
];

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#10b981', INACTIVE: '#6b7280', LOCKED: '#f59e0b',
  SUSPENDED: '#ef4444', ONLINE: '#10b981', OFFLINE: '#6b7280',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const SystemAdminScreen: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === RoleName.SUPER_ADMIN;
  const isManager =
    user?.role === RoleName.STORE_MANAGER ||
    user?.role === RoleName.COMPANY_ADMIN ||
    user?.role === RoleName.BRANCH_ADMIN ||
    user?.role === RoleName.REGIONAL_MANAGER ||
    user?.role === RoleName.PURCHASE_MANAGER ||
    user?.role === RoleName.INVENTORY_MANAGER ||
    user?.role === RoleName.FINANCE_MANAGER ||
    user?.role === RoleName.HR_MANAGER ||
    user?.role === RoleName.SALES_MANAGER ||
    user?.role === RoleName.CRM_MANAGER ||
    user?.role === RoleName.CASH_OFFICER;
  const isAuthorized = isSuperAdmin || isManager;

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // ── Dashboard ──
  const [dashboardData, setDashboardData] = useState<any>(null);

  // ── Users ──
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [oneTimePasswordReveal, setOneTimePasswordReveal] = useState<{ staffId: number; username: string; tempPass: string } | null>(null);
  const [resetPassModal, setResetPassModal] = useState<{ userId: string; username: string; fullName: string; staffId: number } | null>(null);
  const [customPassInput, setCustomPassInput] = useState('Pass@123');
  const [resetPassLoading, setResetPassLoading] = useState(false);

  // ── Roles & Permissions ──
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  // ── Companies & Branches ──
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);

  // ── System Config ──
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [configCategory, setConfigCategory] = useState('pos');

  // ── Number Series ──
  const [numberSeries, setNumberSeries] = useState<any>({});
  const [editingSeries, setEditingSeries] = useState<{ key: string; data: any } | null>(null);

  // ── Approval Engine ──
  const [approvalRules, setApprovalRules] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showCreateApproval, setShowCreateApproval] = useState(false);

  // ── Workflow Engine ──
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);

  // ── Sessions ──
  const [sessions, setSessions] = useState<any[]>([]);

  // ── Audit Log ──
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // ── Login History ──
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loginFilter, setLoginFilter] = useState<'all' | 'success' | 'failed'>('all');

  // ── Notifications ──
  const [notifications, setNotifications] = useState<any[]>([]);

  // ── Part 2: Activity Log ──
  const [activities, setActivities] = useState<any[]>([]);
  const [activityModuleFilter, setActivityModuleFilter] = useState('');
  const [activitySeverityFilter, setActivitySeverityFilter] = useState('');

  // ── Part 2: Backup & Restore ──
  const [backups, setBackups] = useState<any[]>([]);
  const [disasterRecovery, setDisasterRecovery] = useState<any>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // ── Part 2: System Health ──
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [healthRefreshing, setHealthRefreshing] = useState(false);

  // ── Part 2: Scheduler ──
  const [schedulerJobs, setSchedulerJobs] = useState<any[]>([]);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  // ── Part 2: Feature Flags ──
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  // ── Part 2: API Management ──
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiMonitor, setApiMonitor] = useState<any>(null);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [newlyCreatedApiKey, setNewlyCreatedApiKey] = useState<{ key: string; id: string } | null>(null);

  // ── Part 2: Licensing ──
  const [licenseData, setLicenseData] = useState<any>(null);
  const [licenseUsage, setLicenseUsage] = useState<any>(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // ── Part 2: Maintenance Mode ──
  const [maintenanceMode, setMaintenanceMode] = useState<any>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // DATA LOADERS
  // ─────────────────────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    try {
      const res = await api.get('/admin/security-dashboard');
      setDashboardData(res.data.dashboard);
    } catch {
      setDashboardData({
        totalUsers: 7, activeUsers: 6, lockedUsers: 1, deactivatedUsers: 1,
        failedLoginsToday: 3, successfulLoginsToday: 22, activeSessions: 4,
        recentAuditLogs: [],
        systemStatus: { api: 'ONLINE', database: 'CONNECTED', storage: 'HEALTHY' },
      });
    }
  };

  const loadUsers = async () => {
    try {
      const params: any = {};
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users || []);
    } catch {
      const res2 = await api.get('/users').catch(() => ({ data: { users: [] } }));
      setUsers(res2.data?.users || []);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      setRoles(res.data.roles || []);
    } catch { setRoles([]); }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.get('/admin/permissions');
      setPermissionMatrix(res.data.permissionMatrix);
    } catch { setPermissionMatrix(null); }
  };

  const loadCompanies = async () => {
    try {
      const res = await api.get('/admin/companies');
      setCompanies(res.data.companies || []);
    } catch { setCompanies([]); }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get('/admin/branches');
      setBranches(res.data.branches || []);
    } catch { setBranches([]); }
  };

  const loadConfig = async () => {
    try {
      const res = await api.get('/admin/config');
      setSystemConfig(res.data.config);
    } catch { setSystemConfig(null); }
  };

  const loadNumberSeries = async () => {
    try {
      const res = await api.get('/admin/number-series');
      setNumberSeries(res.data.numberSeries || {});
    } catch { setNumberSeries({}); }
  };

  const loadApprovals = async () => {
    try {
      const [rulesRes, pendingRes] = await Promise.all([
        api.get('/admin/approval-rules'),
        api.get('/admin/pending-approvals'),
      ]);
      setApprovalRules(rulesRes.data.rules || []);
      setPendingApprovals(pendingRes.data.approvals || []);
    } catch { setApprovalRules([]); setPendingApprovals([]); }
  };

  const loadWorkflows = async () => {
    try {
      const res = await api.get('/admin/workflows');
      setWorkflows(res.data.workflows || []);
    } catch { setWorkflows([]); }
  };

  const loadSessions = async () => {
    try {
      const res = await api.get('/admin/sessions');
      setSessions(res.data.sessions || []);
    } catch { setSessions([]); }
  };

  const loadAuditLogs = async (page = 1) => {
    try {
      const res = await api.get('/admin/audit-logs', { params: { page, limit: 30 } });
      setAuditLogs(res.data.logs || []);
      setAuditTotal(res.data.pagination?.total || 0);
    } catch { setAuditLogs([]); }
  };

  const loadLoginHistory = async () => {
    try {
      const params: any = { limit: 50 };
      if (loginFilter !== 'all') params.success = loginFilter === 'success';
      const res = await api.get('/admin/login-history', { params });
      setLoginHistory(res.data.history || []);
    } catch { setLoginHistory([]); }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setNotifications(res.data.notifications || []);
    } catch { setNotifications([]); }
  };

  // Part 2 loaders
  const loadActivities = async () => {
    try {
      const params: any = {};
      if (activityModuleFilter) params.module = activityModuleFilter;
      if (activitySeverityFilter) params.severity = activitySeverityFilter;
      const res = await api.get('/admin/activity-log', { params });
      setActivities(res.data.activities || []);
    } catch { setActivities([]); }
  };

  const loadBackups = async () => {
    try {
      const res = await api.get('/admin/backups');
      setBackups(res.data.backups || []);
      setDisasterRecovery(res.data.disasterRecovery);
    } catch { setBackups([]); }
  };

  const loadSystemHealth = async () => {
    setHealthRefreshing(true);
    try {
      const res = await api.get('/admin/system-health');
      setSystemHealth(res.data.health);
    } catch { setSystemHealth(null); }
    finally { setHealthRefreshing(false); }
  };

  const loadScheduler = async () => {
    try {
      const res = await api.get('/admin/scheduler/jobs');
      setSchedulerJobs(res.data.jobs || []);
    } catch { setSchedulerJobs([]); }
  };

  const loadFeatureFlags = async () => {
    try {
      const res = await api.get('/admin/feature-flags');
      setFeatureFlags(res.data.flags || []);
    } catch { setFeatureFlags([]); }
  };

  const loadApiManagement = async () => {
    try {
      const [keysRes, monitorRes] = await Promise.all([
        api.get('/admin/api-keys'),
        api.get('/admin/api-monitor'),
      ]);
      setApiKeys(keysRes.data.apiKeys || []);
      setApiMonitor(monitorRes.data.monitor);
    } catch { setApiKeys([]); setApiMonitor(null); }
  };

  const loadLicense = async () => {
    try {
      const [licRes, usageRes] = await Promise.all([
        api.get('/admin/license'),
        api.get('/admin/license/usage'),
      ]);
      setLicenseData(licRes.data.license);
      setLicenseUsage(usageRes.data.usage);
    } catch { setLicenseData(null); }
  };

  const loadMaintenance = async () => {
    try {
      const res = await api.get('/admin/maintenance');
      setMaintenanceMode(res.data.maintenance);
    } catch { setMaintenanceMode(null); }
  };

  // ── Load on tab change ──
  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'dashboard') { loadDashboard(); loadNotifications(); }
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'roles') loadRoles();
    if (activeTab === 'permissions') { loadPermissions(); loadRoles(); }
    if (activeTab === 'companies') loadCompanies();
    if (activeTab === 'branches') { loadCompanies(); loadBranches(); }
    if (activeTab === 'config') loadConfig();
    if (activeTab === 'number-series') loadNumberSeries();
    if (activeTab === 'approvals') loadApprovals();
    if (activeTab === 'workflows') loadWorkflows();
    if (activeTab === 'sessions') loadSessions();
    if (activeTab === 'audit') loadAuditLogs(1);
    if (activeTab === 'login-history') loadLoginHistory();
    // Part 2
    if (activeTab === 'activity-log') loadActivities();
    if (activeTab === 'backup') loadBackups();
    if (activeTab === 'system-health') loadSystemHealth();
    if (activeTab === 'scheduler') loadScheduler();
    if (activeTab === 'feature-flags') loadFeatureFlags();
    if (activeTab === 'api-management') loadApiManagement();
    if (activeTab === 'licensing') loadLicense();
    if (activeTab === 'maintenance') loadMaintenance();
  }, [activeTab, isAuthorized]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [userSearch, userRoleFilter]);

  useEffect(() => {
    if (activeTab === 'login-history') loadLoginHistory();
  }, [loginFilter]);

  useEffect(() => {
    if (activeTab === 'activity-log') loadActivities();
  }, [activityModuleFilter, activitySeverityFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACCESS GUARD
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '64px 24px', border: '1px solid #ef4444' }}>
        <ShieldCheck size={52} style={{ color: '#ef4444', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>SYSTEM ADMINISTRATION — RESTRICTED</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '10px', maxWidth: '500px', margin: '10px auto 0' }}>
          This module is exclusively accessible by Super Administrators and Store Managers. Your role ({user?.role}) does not have access to system administration.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  const handleForceLogout = async (userId: string) => {
    if (!confirm('Force logout all sessions for this user?')) return;
    try {
      await api.post(`/admin/users/${userId}/force-logout`);
      loadUsers();
      alert('User sessions terminated.');
    } catch { alert('Failed to force logout'); }
  };

  const handleOpenResetPassword = (u: any) => {
    setResetPassModal({
      userId: u.id,
      username: u.username,
      fullName: u.fullName,
      staffId: u.staffId,
    });
    setCustomPassInput('Pass@123');
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal) return;
    try {
      setResetPassLoading(true);
      const res = await api.post(`/admin/users/${resetPassModal.userId}/reset-password`, {
        newPassword: customPassInput || 'Pass@123',
      });
      const tempPass = res.data.tempPassword || res.data.temporaryPassword || customPassInput || 'Pass@123';
      setOneTimePasswordReveal({ staffId: resetPassModal.staffId, username: resetPassModal.username, tempPass });
      setResetPassModal(null);
      loadUsers();
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to reset password'));
    } finally {
      setResetPassLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, fullName: string, username: string, staffId: number) => {
    if (staffId === 300000) {
      alert('Root Super Admin account cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ PERMANENT USER DELETION\n\nAre you sure you want to permanently remove user account:\n"${fullName}" (${username}, Staff ID: ${staffId})?\n\nAll active sessions will be terminated and this account will be completely removed from the database.\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
      alert(`User ${fullName} (${staffId}) has been permanently deleted.`);
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to delete user account'));
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      loadUsers();
    } catch { alert('Failed to update status'); }
  };

  const handleUnlockUser = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/unlock`);
      loadUsers();
    } catch { alert('Failed to unlock account'); }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      loadSessions();
    } catch (err: any) { alert(getApiErrorMessage(err, 'Failed to terminate session')); }
  };

  const handleToggleApprovalRule = async (ruleId: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/approval-rules/${ruleId}`, { isActive: !isActive });
      loadApprovals();
    } catch (err: any) { alert(getApiErrorMessage(err, 'Failed to update approval rule')); }
  };

  const handleToggleWorkflow = async (wfId: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/workflows/${wfId}`, { isActive: !isActive });
      loadWorkflows();
    } catch {
      setWorkflows((prev) => prev.map((w) => w.id === wfId ? { ...w, isActive: !isActive } : w));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const StatusBadge = ({ status, label }: { status: string; label?: string }) => (
    <span style={{
      fontSize: '10px', padding: '2px 7px', fontWeight: 'bold',
      border: `1px solid ${STATUS_COLOR[status] || '#6b7280'}`,
      color: STATUS_COLOR[status] || '#6b7280',
    }}>
      {label || status}
    </span>
  );

  const MetricCard = ({ label, value, sub, color = '#10b981', icon: Icon }: any) => (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 'bold', color, lineHeight: 1 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
        </div>
        {Icon && <Icon size={28} style={{ color, opacity: 0.3 }} />}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB RENDERERS
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metric Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <MetricCard label="Total Users" value={dashboardData?.totalUsers} sub="Registered accounts" icon={Users} />
        <MetricCard label="Active Sessions" value={dashboardData?.activeSessions} sub="Live right now" icon={Wifi} color="#06b6d4" />
        <MetricCard label="Locked Accounts" value={dashboardData?.lockedUsers} sub="Need admin unlock" icon={Lock} color="#f59e0b" />
        <MetricCard label="Failed Logins (24h)" value={dashboardData?.failedLoginsToday} sub="Brute-force monitor" icon={AlertTriangle} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Recent Audit Activity */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Recent Audit Activity</div>
            <button className="btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setActiveTab('audit')}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Action</th><th>Entity</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData?.recentAuditLogs || []).length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No recent activity</td></tr>
                ) : dashboardData.recentAuditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px' }}>{log.userName}</td>
                    <td><span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#10b981' }}>{log.action}</span></td>
                    <td style={{ fontSize: '12px' }}>{log.entityName}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status + Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>System Status</div>
            {[
              { label: 'API Server', status: dashboardData?.systemStatus?.api },
              { label: 'Database', status: dashboardData?.systemStatus?.database === 'CONNECTED' ? 'ONLINE' : 'OFFLINE' },
              { label: 'Storage', status: dashboardData?.systemStatus?.storage === 'HEALTHY' ? 'ONLINE' : 'OFFLINE' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>{item.label}</span>
                <StatusBadge status={item.status || 'OFFLINE'} />
              </div>
            ))}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }} className="tabular-nums">{dashboardData?.successfulLoginsToday || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Successful Logins</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }} className="tabular-nums">{dashboardData?.failedLoginsToday || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Failed Attempts</div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Notifications</span>
              <span style={{ fontSize: '11px', color: '#10b981' }}>{notifications.filter((n) => !n.isRead).length} unread</span>
            </div>
            {notifications.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>No notifications</div>
            ) : notifications.slice(0, 3).map((n) => (
              <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', opacity: n.isRead ? 0.6 : 1 }}>
                <div style={{ fontSize: '12px', fontWeight: n.isRead ? 'normal' : 'bold' }}>{n.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message.substring(0, 60)}…</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input type="text" className="input-field" style={{ width: '220px' }} placeholder="Search name or username…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
        <select className="input-field" style={{ width: '180px' }} value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {Object.values(RoleName).map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={loadUsers}><RefreshCw size={14} /></button>
          {isSuperAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>
              <Users size={14} /> Add New Staff
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Staff ID</th><th>Name</th><th>Username</th><th>Role</th><th>Status</th>
                <th>Sessions</th><th>Last Login</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="tabular-nums" style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 'bold' }}>{u.staffId}</td>
                  <td style={{ fontWeight: 'bold' }}>{u.fullName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{u.username}</td>
                  <td>
                    <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      {u.role?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      status={u.isDeactivated ? 'INACTIVE' : u.isLocked ? 'LOCKED' : 'ACTIVE'}
                      label={u.isDeactivated ? 'INACTIVE' : u.isLocked ? `LOCKED (${u.failedAttempts} fails)` : 'ACTIVE'}
                    />
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: u._count?.sessions > 0 ? '#10b981' : 'var(--text-muted)' }}>
                      {u._count?.sessions ?? '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {u.isLocked && (
                        <button className="btn" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => handleUnlockUser(u.id)} title="Unlock Account">
                          <Unlock size={11} /> Unlock
                        </button>
                      )}
                      {u.isDeactivated ? (
                        <button className="btn" style={{ padding: '2px 6px', fontSize: '10px', color: '#10b981' }} onClick={() => handleStatusChange(u.id, 'ACTIVE')} title="Reactivate">
                          <UserCheck size={11} />
                        </button>
                      ) : (
                        <button className="btn" style={{ padding: '2px 6px', fontSize: '10px', color: '#f59e0b' }} onClick={() => handleStatusChange(u.id, 'INACTIVE')} title="Deactivate" disabled={u.staffId === 300000}>
                          <UserX size={11} />
                        </button>
                      )}
                      <button
                        className="btn"
                        style={{ padding: '2px 6px', fontSize: '10px', color: '#06b6d4' }}
                        onClick={() => handleOpenResetPassword(u)}
                        title="Reset Password (No Old Password Required)"
                        disabled={u.staffId === 300000 && user?.role !== RoleName.SUPER_ADMIN}
                      >
                        <Key size={11} />
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '2px 6px', fontSize: '10px', color: '#f59e0b' }}
                        onClick={() => handleForceLogout(u.id)}
                        title="Force Logout All Sessions"
                      >
                        <LogOut size={11} />
                      </button>
                      {u.staffId !== 300000 && (
                        <button
                          className="btn"
                          style={{ padding: '2px 6px', fontSize: '10px', color: '#ef4444' }}
                          onClick={() => handleDeleteUser(u.id, u.fullName, u.username, u.staffId)}
                          title="Permanently Remove Account"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button className="btn" onClick={loadRoles}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {roles.map((role) => (
          <div key={role.name} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${role.color || '#6b7280'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: role.color || 'var(--text-color)' }}>
                  {role.name.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{role.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 'bold', color: role.color }}>{role.userCount}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>users</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                Level {role.level}
              </span>
              <button
                className="btn"
                style={{ padding: '2px 8px', fontSize: '10px', marginLeft: 'auto' }}
                onClick={() => setSelectedRole(role)}
              >
                <Eye size={11} /> Permissions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPermissionMatrix = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>Permission Matrix Overview</div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Select any role card from the <strong>Roles & Permissions</strong> tab to open the full permission editor with Module → Screen → Action level controls.
        </p>
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'].map((action) => (
            <div key={action} style={{ textAlign: 'center', padding: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>{action}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Action Level</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Click a role to configure its permissions:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {roles.map((r) => (
              <button key={r.name} className="btn" style={{ fontSize: '11px', borderColor: r.color, color: r.color }} onClick={() => { setSelectedRole(r); setActiveTab('roles'); }}>
                <ShieldCheck size={11} /> {r.name.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {permissionMatrix?.modules && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Module Registry</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {permissionMatrix.modules.map((mod: any) => (
              <div key={mod.id} style={{ padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981', marginBottom: '6px' }}>{mod.name}</div>
                {mod.screens.map((s: any) => (
                  <div key={s.id} style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>→ {s.name}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCompanies = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setShowCreateCompany(true)}>
          <Building2 size={14} /> Register Company
        </button>
      </div>
      {companies.map((c) => (
        <div key={c.id} className="card" style={{ padding: '16px', borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Company Name</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>{c.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>GST / PAN</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.gstin || '—'}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '2px' }}>{c.pan || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Financial Year / Currency</div>
              <div style={{ fontSize: '13px' }}>{c.financialYear}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.currency} · {c.timezone}</div>
            </div>
          </div>
          {c.address && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>{c.address}</div>}
          <div style={{ marginTop: '8px' }}>
            <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderBranches = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setShowCreateBranch(true)}>
          <GitBranch size={14} /> Create Branch
        </button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Branch Code</th><th>Name</th><th>Company</th><th>Type</th><th>GSTIN</th><th>Contact</th><th>Status</th></tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No branches configured</td></tr>
              ) : branches.map((b) => (
                <tr key={b.id}>
                  <td className="tabular-nums" style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 'bold' }}>{b.code}</td>
                  <td style={{ fontWeight: 'bold' }}>{b.name}</td>
                  <td style={{ fontSize: '12px' }}>{companies.find((c) => c.id === b.companyId)?.name?.split(' ').slice(0, 2).join(' ') || b.companyId}</td>
                  <td><span style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}>{b.storeType}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{b.gstin || '—'}</td>
                  <td style={{ fontSize: '12px' }}>{b.contactPhone || '—'}</td>
                  <td><StatusBadge status={b.status || 'ACTIVE'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px' }}>
      {systemConfig ? (
        <>
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '12px' }}>
            {Object.keys(systemConfig).map((cat) => (
              <div
                key={cat}
                onClick={() => setConfigCategory(cat)}
                style={{
                  padding: '8px 10px', cursor: 'pointer', fontSize: '13px', marginBottom: '2px',
                  borderLeft: configCategory === cat ? '2px solid #10b981' : '2px solid transparent',
                  backgroundColor: configCategory === cat ? 'rgba(16,185,129,0.08)' : 'transparent',
                  color: configCategory === cat ? '#10b981' : 'var(--text-color)',
                }}
              >
                {systemConfig[cat]?.label || cat}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '14px', color: '#10b981' }}>
              {systemConfig[configCategory]?.label}
            </div>
            {Object.entries(systemConfig[configCategory]?.settings || {}).map(([key, setting]: any) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{setting.label}</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{configCategory}.{key}</div>
                </div>
                {setting.type === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isSuperAdmin ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={setting.value === 'true'}
                      disabled={!isSuperAdmin}
                      onChange={async (e) => {
                        try { await api.patch('/admin/config', { category: configCategory, key, value: e.target.checked ? 'true' : 'false' }); loadConfig(); } catch { loadConfig(); }
                      }}
                    />
                    <span style={{ fontSize: '12px' }}>{setting.value === 'true' ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : (
                  <input
                    type={setting.type || 'text'}
                    className="input-field"
                    style={{ width: '160px', textAlign: 'right', fontFamily: 'monospace' }}
                    defaultValue={setting.value}
                    disabled={!isSuperAdmin}
                    onBlur={async (e) => {
                      if (e.target.value !== setting.value) {
                        try { await api.patch('/admin/config', { category: configCategory, key, value: e.target.value }); loadConfig(); } catch { loadConfig(); }
                      }
                    }}
                  />
                )}
              </div>
            ))}
            {!isSuperAdmin && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', padding: '10px', border: '1px solid var(--border-color)' }}>
                ⚠ System configuration can only be modified by Super Administrators.
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
          <RefreshCw size={24} style={{ marginBottom: '8px', animation: 'spin 1s linear infinite' }} />
          <div>Loading configuration…</div>
        </div>
      )}
    </div>
  );

  const renderNumberSeries = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        Configure document numbering formats for all ERP modules. Click Edit to change prefix, suffix, or year code.
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Module</th><th>Prefix</th><th>Year Code</th><th>Suffix</th><th>Current Seq.</th><th>Example</th><th>Action</th></tr>
            </thead>
            <tbody>
              {Object.entries(numberSeries).map(([key, series]: any) => (
                <tr key={key}>
                  <td style={{ fontWeight: 'bold' }}>{series.module}</td>
                  <td style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{series.prefix}</td>
                  <td style={{ fontFamily: 'monospace' }}>{series.yearCode}</td>
                  <td style={{ fontFamily: 'monospace' }}>{series.suffix || '—'}</td>
                  <td className="tabular-nums" style={{ fontFamily: 'monospace' }}>#{String(series.currentSeq).padStart(4, '0')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#10b981' }}>{series.example}</td>
                  <td>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => setEditingSeries({ key, data: series })}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderApprovals = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button className="btn" onClick={loadApprovals}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowCreateApproval(true)}>
          <Zap size={14} /> New Approval Rule
        </button>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', border: '1px solid #f59e0b' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f59e0b', marginBottom: '10px' }}>
            ⏳ Pending Approvals ({pendingApprovals.length})
          </div>
          {pendingApprovals.map((ap) => (
            <div key={ap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{ap.module} — {ap.description}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requested by {ap.requestedBy} · {ap.requestedAt}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn" style={{ padding: '3px 10px', fontSize: '11px', color: '#10b981', borderColor: '#10b981' }}>Approve</button>
                <button className="btn" style={{ padding: '3px 10px', fontSize: '11px', color: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '14px' }}>
          Approval Rules ({approvalRules.length})
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Module</th><th>Event</th><th>Threshold</th><th>Approver Role</th><th>Escalation</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {approvalRules.map((rule) => (
                <tr key={rule.id}>
                  <td style={{ fontWeight: 'bold', fontSize: '13px' }}>{rule.module}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#06b6d4' }}>{rule.event.replace(/_/g, ' ')}</td>
                  <td className="tabular-nums" style={{ fontSize: '13px' }}>
                    {rule.threshold === 0 ? 'All' : rule.event.includes('PERCENT') ? `${rule.threshold}%` : `₹${(rule.threshold / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td style={{ fontSize: '12px' }}>{rule.approverRole?.replace(/_/g, ' ')}</td>
                  <td style={{ fontSize: '12px' }}>{rule.escalationHours}h</td>
                  <td><StatusBadge status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleToggleApprovalRule(rule.id, rule.isActive)}>
                      {rule.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button className="btn" onClick={loadWorkflows}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowWorkflowEditor(true)}>
          <GitMerge size={14} /> New Workflow
        </button>
      </div>
      {workflows.map((wf) => (
        <div key={wf.id} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${wf.isActive ? '#8b5cf6' : '#6b7280'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{wf.name}</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8b5cf6', marginTop: '2px' }}>{wf.trigger.replace(/_/g, ' ')}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <StatusBadge status={wf.isActive ? 'ACTIVE' : 'INACTIVE'} />
              <button className="btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleToggleWorkflow(wf.id, wf.isActive)}>
                {wf.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto' }}>
            <div style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', whiteSpace: 'nowrap' }}>
              ▶ START
            </div>
            {wf.steps.map((step: any, idx: number) => (
              <React.Fragment key={idx}>
                <div style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '16px' }}>→</div>
                <div style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'var(--bg-color)', border: '1px solid #8b5cf6', color: '#8b5cf6', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 'bold' }}>Step {step.stepNo}: {step.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{step.role?.replace(/_/g, ' ')} · {step.timeoutHours}h</div>
                </div>
              </React.Fragment>
            ))}
            <div style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '16px' }}>→</div>
            <div style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', whiteSpace: 'nowrap' }}>
              ✓ COMPLETE
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSessions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={loadSessions}><RefreshCw size={14} /> Refresh Sessions</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>User</th><th>Staff ID</th><th>Role</th><th>Login Time</th><th>Expires</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No active sessions</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 'bold' }}>{s.user?.fullName || '—'}</td>
                  <td className="tabular-nums" style={{ fontFamily: 'monospace', color: '#10b981' }}>{s.user?.staffId}</td>
                  <td style={{ fontSize: '11px' }}>{s.user?.role?.replace(/_/g, ' ')}</td>
                  <td style={{ fontSize: '12px' }}>{new Date(s.createdAt).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '12px', color: new Date(s.expiresAt) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>
                    {new Date(s.expiresAt).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: '10px', color: '#ef4444' }} onClick={() => handleTerminateSession(s.id)}>
                      <LogOut size={11} /> Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAuditLog = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {auditTotal.toLocaleString('en-IN')} total audit entries · Immutable — no edits permitted
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn" style={{ padding: '4px 10px', fontSize: '11px' }} disabled={auditPage <= 1} onClick={() => { setAuditPage((p) => p - 1); loadAuditLogs(auditPage - 1); }}>← Prev</button>
          <span style={{ padding: '4px 8px', fontSize: '12px' }}>Page {auditPage}</span>
          <button className="btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => { setAuditPage((p) => p + 1); loadAuditLogs(auditPage + 1); }}>Next →</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Reason</th></tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No audit logs found</td></tr>
              ) : auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontSize: '12px' }}>{log.userName}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.userRole?.replace(/_/g, ' ')}</td>
                  <td>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', padding: '2px 5px' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>{log.entityName}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLoginHistory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {(['all', 'success', 'failed'] as const).map((f) => (
          <button
            key={f}
            className="btn"
            style={{
              padding: '5px 12px', fontSize: '12px',
              backgroundColor: loginFilter === f ? '#10b981' : 'transparent',
              color: loginFilter === f ? 'white' : 'var(--text-muted)',
              borderColor: loginFilter === f ? '#10b981' : 'var(--border-color)',
            }}
            onClick={() => setLoginFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={loadLoginHistory}><RefreshCw size={14} /></button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Timestamp</th><th>Username</th><th>Staff ID</th><th>Result</th><th>IP Address</th><th>User Agent</th></tr>
            </thead>
            <tbody>
              {loginHistory.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No login history found</td></tr>
              ) : loginHistory.map((h) => (
                <tr key={h.id}>
                  <td className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(h.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{h.username || '—'}</td>
                  <td className="tabular-nums" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{h.staffId || '—'}</td>
                  <td>
                    {h.success ? (
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>✓ SUCCESS</span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>✗ FAILED</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{h.ipAddress || '—'}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.userAgent ? h.userAgent.substring(0, 40) + '…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PART 2 RENDERERS
  // ─────────────────────────────────────────────────────────────────────────

  const SEVERITY_COLOR: Record<string, string> = { INFO: '#06b6d4', WARNING: '#f59e0b', ERROR: '#ef4444', SUCCESS: '#10b981' };

  const renderActivityLog = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select className="input-field" style={{ width: '160px' }} value={activityModuleFilter} onChange={(e) => setActivityModuleFilter(e.target.value)}>
          <option value="">All Modules</option>
          {['Scheduler','HRMS','Notification','Inventory','API','Database','CRM','Backup','Admin'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="input-field" style={{ width: '140px' }} value={activitySeverityFilter} onChange={(e) => setActivitySeverityFilter(e.target.value)}>
          <option value="">All Severities</option>
          {['INFO','WARNING','ERROR'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={loadActivities}><RefreshCw size={14} /></button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Timestamp</th><th>Module</th><th>Event</th><th>Severity</th><th>Status</th><th>Message</th></tr></thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No activity logs found</td></tr>
              ) : activities.map((a) => (
                <tr key={a.id}>
                  <td className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(a.createdAt).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '11px', fontWeight: 'bold' }}>{a.module}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10px', color: '#06b6d4' }}>{a.event}</td>
                  <td><span style={{ fontSize: '10px', fontWeight: 'bold', color: SEVERITY_COLOR[a.severity] || '#6b7280' }}>{a.severity}</span></td>
                  <td><span style={{ fontSize: '10px', color: a.status === 'SUCCESS' ? '#10b981' : a.status === 'FAILED' ? '#ef4444' : '#f59e0b' }}>{a.status}</span></td>
                  <td style={{ fontSize: '12px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={loadBackups}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowBackupModal(true)}><Database size={14} /> Run Backup / Restore</button>
      </div>

      {/* Disaster Recovery Config */}
      {disasterRecovery && (
        <div className="card" style={{ padding: '14px 16px', borderLeft: '3px solid #06b6d4' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', color: '#06b6d4' }}>Disaster Recovery Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>RTO</div><div style={{ fontWeight: 'bold', fontSize: '18px' }} className="tabular-nums">{disasterRecovery.rto}</div></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>RPO</div><div style={{ fontWeight: 'bold', fontSize: '18px' }} className="tabular-nums">{disasterRecovery.rpo}</div></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Retention</div><div style={{ fontWeight: 'bold', fontSize: '18px' }} className="tabular-nums">{disasterRecovery.backupRetentionDays} days</div></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Last DR Test</div><div style={{ fontWeight: 'bold' }}>{disasterRecovery.lastDrTestDate}</div></div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Recovery Contacts: {disasterRecovery.recoveryContacts?.join(', ')}
          </div>
        </div>
      )}

      {/* Backup History */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '14px' }}>Backup History</div>
        <div className="table-container">
          <table>
            <thead><tr><th>Backup ID</th><th>Type</th><th>Target</th><th>Size</th><th>Duration</th><th>Triggered By</th><th>Completed</th><th>Verified</th><th>Status</th></tr></thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 'bold', fontSize: '12px' }}>{b.id}</td>
                  <td><span style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}>{b.type}</span></td>
                  <td style={{ fontSize: '12px' }}>{b.target}</td>
                  <td className="tabular-nums" style={{ fontSize: '12px' }}>{b.sizeMb > 0 ? `${b.sizeMb.toFixed(1)} MB` : '—'}</td>
                  <td className="tabular-nums" style={{ fontSize: '12px' }}>{b.duration > 0 ? `${b.duration}s` : '—'}</td>
                  <td style={{ fontSize: '12px' }}>{b.triggeredBy}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.completedAt ? new Date(b.completedAt).toLocaleString('en-IN') : b.startedAt ? `Started ${new Date(b.startedAt).toLocaleTimeString('en-IN')}` : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{b.verified ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>}</td>
                  <td><span style={{ fontSize: '10px', color: b.status === 'COMPLETED' ? '#10b981' : b.status === 'RUNNING' ? '#f59e0b' : '#ef4444', fontWeight: 'bold' }}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const HealthGauge = ({ label, value, unit, max, color, icon: Icon }: any) => {
    const pct = Math.min(100, Math.round((value / max) * 100));
    const gaugeColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color || '#10b981';
    return (
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          {Icon && <Icon size={16} style={{ color: gaugeColor, opacity: 0.6 }} />}
        </div>
        <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 'bold', color: gaugeColor, marginBottom: '8px' }}>
          {value}{unit}
        </div>
        <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }}>
          <div style={{ height: '4px', width: `${pct}%`, backgroundColor: gaugeColor, borderRadius: '2px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{pct}% of {max}{unit}</div>
      </div>
    );
  };

  const renderSystemHealth = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Last updated: {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString('en-IN') : '—'}
          </span>
          {systemHealth?.overall && (
            <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: systemHealth.overall === 'HEALTHY' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: systemHealth.overall === 'HEALTHY' ? '#10b981' : '#f59e0b', border: `1px solid ${systemHealth.overall === 'HEALTHY' ? '#10b981' : '#f59e0b'}`, fontWeight: 'bold' }}>
              ● {systemHealth.overall}
            </span>
          )}
        </div>
        <button className="btn" onClick={loadSystemHealth} disabled={healthRefreshing}>
          <RefreshCw size={14} style={{ animation: healthRefreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {!systemHealth ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>
          <Server size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
          <div>Loading system health metrics…</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <HealthGauge label="Memory Used" value={systemHealth.memory?.usedMb} unit=" MB" max={systemHealth.memory?.totalMb || 512} color="#06b6d4" icon={Cpu} />
            <HealthGauge label="Storage Used" value={systemHealth.storage?.usedGb} unit=" GB" max={systemHealth.storage?.totalGb || 50} color="#8b5cf6" icon={HardDrive} />
            <HealthGauge label="DB Response" value={systemHealth.database?.responseMs} unit=" ms" max={500} color="#10b981" icon={Database} />
            <HealthGauge label="API req/min" value={systemHealth.api?.requestsPerMin} unit="" max={500} color="#f59e0b" icon={Globe} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'API Server', status: systemHealth.api?.status, detail: `${systemHealth.api?.responseMs}ms avg` },
              { label: 'Database', status: systemHealth.database?.status, detail: `${systemHealth.database?.connections} connections` },
              { label: 'Queue', status: systemHealth.queue?.status === 'IDLE' ? 'ONLINE' : 'DEGRADED', detail: `${systemHealth.queue?.pending} pending` },
            ].map((item) => (
              <div key={item.label} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${item.status === 'ONLINE' || item.status === 'HEALTHY' ? '#10b981' : '#ef4444'}` }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: item.status === 'ONLINE' || item.status === 'HEALTHY' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>● {item.status}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Active Sessions', value: systemHealth.activeSessions, color: '#10b981' },
              { label: 'Audit Events Today', value: systemHealth.totalAuditEventsToday, color: '#06b6d4' },
              { label: 'Failed Logins (5m)', value: systemHealth.failedLoginsLast5Min, color: systemHealth.failedLoginsLast5Min > 5 ? '#ef4444' : '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {systemHealth.uptime && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
              Server Uptime: <strong style={{ color: 'var(--text-color)' }}>{systemHealth.uptime.formatted}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderScheduler = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={loadScheduler}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowSchedulerModal(true)}><Clock size={14} /> New Job</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Job Name</th><th>Module</th><th>Schedule</th><th>Last Run</th><th>Status</th><th>Next Run</th><th>Runs</th><th>Actions</th></tr></thead>
            <tbody>
              {schedulerJobs.map((job) => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 'bold', fontSize: '13px' }}>{job.name}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.module}</td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8b5cf6' }}>{job.cron}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{job.cronDesc}</div>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString('en-IN') : '—'}
                    {job.lastStatus && <div style={{ fontSize: '10px', color: job.lastStatus === 'SUCCESS' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{job.lastStatus}</div>}
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={job.enabled} onChange={async (e) => {
                        try { await api.patch(`/admin/scheduler/jobs/${job.id}`, { enabled: e.target.checked }); loadScheduler(); } catch { loadScheduler(); }
                      }} />
                      <span style={{ fontSize: '11px', color: job.enabled ? '#10b981' : 'var(--text-muted)' }}>{job.enabled ? 'ENABLED' : 'DISABLED'}</span>
                    </label>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="tabular-nums" style={{ fontSize: '13px', textAlign: 'center' }}>{job.runCount.toLocaleString('en-IN')}</td>
                  <td>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: '10px', color: '#10b981' }}
                      disabled={runningJobId === job.id}
                      onClick={async () => {
                        setRunningJobId(job.id);
                        try { await api.post(`/admin/scheduler/jobs/${job.id}/run-now`); loadScheduler(); } catch { loadScheduler(); }
                        finally { setRunningJobId(null); }
                      }}>
                      <Play size={10} /> {runningJobId === job.id ? 'Running…' : 'Run Now'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFeatureFlags = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Enable or disable features without code changes. Changes take effect immediately. All changes are audit-logged.
      </div>
      {['CRM', 'POS', 'Inventory', 'Finance', 'Sales', 'Auth', 'Suppliers', 'Reports', 'Admin'].map((module) => {
        const moduleFlags = featureFlags.filter((f) => f.module === module);
        if (moduleFlags.length === 0) return null;
        return (
          <div key={module} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#10b981', marginBottom: '10px' }}>{module}</div>
            {moduleFlags.map((flag) => (
              <div key={flag.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{flag.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{flag.description}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Scope: <strong>{flag.scope}</strong> · Key: <code style={{ fontFamily: 'monospace' }}>{flag.key}</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {flag.enabled && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{flag.rolloutPercent}%</div>
                  )}
                  <button
                    onClick={async () => {
                      setTogglingFlag(flag.key);
                      try { await api.patch(`/admin/feature-flags/${flag.key}`, { enabled: !flag.enabled }); loadFeatureFlags(); } catch { loadFeatureFlags(); }
                      finally { setTogglingFlag(null); }
                    }}
                    disabled={togglingFlag === flag.key}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: flag.enabled ? '#10b981' : 'var(--text-muted)', padding: 0 }}>
                    {flag.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: flag.enabled ? '#10b981' : 'var(--text-muted)', minWidth: '55px' }}>
                    {flag.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const renderApiManagement = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* API Monitor */}
      {apiMonitor && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Requests', value: apiMonitor.totalRequestsToday.toLocaleString('en-IN'), color: '#10b981' },
            { label: 'Failed Requests', value: apiMonitor.failedRequestsToday, color: '#ef4444' },
            { label: 'Avg Response', value: `${apiMonitor.avgResponseTimeMs}ms`, color: '#06b6d4' },
            { label: 'Auth Failures', value: apiMonitor.authFailuresToday, color: '#f59e0b' },
            { label: 'Rate Limit Hits', value: apiMonitor.rateLimitViolationsToday, color: '#8b5cf6' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{stat.label}</div>
              <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top Endpoints */}
      {apiMonitor?.topEndpoints && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>Top Endpoints Today</div>
          {apiMonitor.topEndpoints.map((ep: any) => (
            <div key={ep.endpoint} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <code style={{ fontSize: '12px', color: '#06b6d4' }}>{ep.endpoint}</code>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span className="tabular-nums">{ep.requests.toLocaleString('en-IN')} req</span>
                <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{ep.avgMs}ms avg</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API Keys */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button className="btn" onClick={loadApiManagement}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowCreateApiKey(true)}><Key size={14} /> Generate API Key</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '14px' }}>API Keys ({apiKeys.length})</div>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Key Preview</th><th>Scope</th><th>Rate Limit</th><th>Requests Today</th><th>Allowed Origins</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id}>
                  <td style={{ fontWeight: 'bold', fontSize: '13px' }}>{k.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#f59e0b' }}>{k.keyPreview}</td>
                  <td><span style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}>{k.scope}</span></td>
                  <td className="tabular-nums" style={{ fontSize: '12px' }}>{k.rateLimit} req/min</td>
                  <td className="tabular-nums" style={{ fontSize: '12px' }}>{k.requestsToday.toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '11px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.allowedOrigins?.join(', ')}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td><span style={{ fontSize: '10px', color: k.isActive ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{k.isActive ? 'ACTIVE' : 'REVOKED'}</span></td>
                  <td>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: '10px', color: '#ef4444' }}
                      onClick={async () => { if (!confirm(`Revoke API key "${k.name}"?`)) return; try { await api.delete(`/admin/api-keys/${k.id}`); loadApiManagement(); } catch { loadApiManagement(); } }}>
                      <Trash2 size={10} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const UsageBar = ({ label, used, allowed, unit = '' }: any) => {
    const pct = Math.min(100, Math.round((used / allowed) * 100));
    const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#10b981';
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px' }}>{label}</span>
          <span className="tabular-nums" style={{ fontSize: '12px', color }}>{used}{unit} / {allowed}{unit} ({pct}%)</span>
        </div>
        <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px' }}>
          <div style={{ height: '6px', width: `${pct}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.5s' }} />
        </div>
      </div>
    );
  };

  const renderLicensing = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {licenseData && (
        <div className="card" style={{ padding: '20px', borderLeft: `3px solid ${licenseData.daysUntilExpiry < 30 ? '#ef4444' : '#10b981'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Afreen Mall ERP — {licenseData.type} License</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{licenseData.issuedTo}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{licenseData.key}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expiry</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: licenseData.daysUntilExpiry < 30 ? '#ef4444' : '#10b981' }} className="tabular-nums">{licenseData.expiryDate}</div>
              <div style={{ fontSize: '12px', color: licenseData.daysUntilExpiry < 30 ? '#ef4444' : 'var(--text-muted)' }}>{licenseData.daysUntilExpiry} days remaining</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {licenseData.activatedModules?.map((m: string) => (
              <span key={m} style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                ✓ {m}
              </span>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowLicenseModal(true)} style={{ alignSelf: 'flex-start' }}>
            <Tag size={14} /> Renew / Activate License
          </button>
        </div>
      )}

      {licenseUsage && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>License Usage</div>
          <UsageBar label="Users" used={licenseUsage.users?.used} allowed={licenseUsage.users?.allowed} />
          <UsageBar label="Companies" used={licenseUsage.companies?.used} allowed={licenseUsage.companies?.allowed} />
          <UsageBar label="Branches" used={licenseUsage.branches?.used} allowed={licenseUsage.branches?.allowed} />
          <UsageBar label="POS Terminals" used={licenseUsage.posTerminals?.used} allowed={licenseUsage.posTerminals?.allowed} />
          <UsageBar label="Storage" used={licenseUsage.storageGb?.used} allowed={licenseUsage.storageGb?.allowed} unit=" GB" />
        </div>
      )}
    </div>
  );

  const renderMaintenance = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {maintenanceMode?.enabled && (
        <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '2px solid #f59e0b', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#f59e0b' }}>MAINTENANCE MODE IS ACTIVE</span>
          </div>
          <div style={{ fontSize: '13px' }}>Message shown to users: <em>"{maintenanceMode.message}"</em></div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Enabled by: <strong>{maintenanceMode.enabledBy}</strong> · {maintenanceMode.enabledAt ? `at ${new Date(maintenanceMode.enabledAt).toLocaleString('en-IN')}` : ''}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '16px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Maintenance Mode Control</div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
          When maintenance mode is enabled, all regular users see a maintenance message and cannot access the ERP.
          Super Administrators and Store Managers retain full access. Background jobs continue unless individually paused.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn"
            style={{ flex: 1, padding: '12px', backgroundColor: maintenanceMode?.enabled ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', borderColor: maintenanceMode?.enabled ? '#10b981' : '#f59e0b', color: maintenanceMode?.enabled ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}
            onClick={() => setShowMaintenanceModal(true)}>
            <Wrench size={15} />
            {maintenanceMode?.enabled ? '✓ Disable Maintenance Mode' : '⚠ Configure & Enable Maintenance Mode'}
          </button>
          <button className="btn" onClick={loadMaintenance}><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Allowed Roles During Maintenance</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(maintenanceMode?.allowedRoles || ['SUPER_ADMIN', 'STORE_MANAGER']).map((role: string) => (
            <span key={role} style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              ✓ {role.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} style={{ color: '#10b981' }} />
            System Administration & Security
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Department 11 · User Management · RBAC · Multi-Company · Workflows · Audit · Security
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#f59e0b', border: '1px solid #f59e0b', padding: '4px 8px' }}>
              <Bell size={12} />
              {notifications.filter((n) => !n.isRead).length} alerts
            </div>
          )}
          <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: isSuperAdmin ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: isSuperAdmin ? '#ef4444' : '#f59e0b', border: `1px solid ${isSuperAdmin ? '#ef4444' : '#f59e0b'}` }}>
            {isSuperAdmin ? '⬡ SUPER ADMIN' : '◈ STORE MANAGER'}
          </span>
        </div>
      </div>

      {/* Tab Strip — Grouped */}
      <div style={{ marginBottom: '20px' }}>
        {TAB_GROUPS.map((group) => {
          const groupTabs = TABS.filter((t) => group.tabs.includes(t.id));
          const isGroupActive = group.tabs.includes(activeTab);
          return (
            <div key={group.label} style={{ marginBottom: '0' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 4px 0', marginTop: '4px' }}>{group.label}</div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', gap: '0' }}>
                {groupTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px', fontSize: '11px', background: 'none', border: 'none',
                        borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
                        color: isActive ? '#10b981' : 'var(--text-muted)',
                        cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: isActive ? 'bold' : 'normal',
                        transition: 'all 0.15s',
                      }}>
                      <Icon size={12} />{tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Content — Part 1 */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'roles' && renderRoles()}
      {activeTab === 'permissions' && renderPermissionMatrix()}
      {activeTab === 'companies' && renderCompanies()}
      {activeTab === 'branches' && renderBranches()}
      {activeTab === 'config' && renderConfig()}
      {activeTab === 'number-series' && renderNumberSeries()}
      {activeTab === 'approvals' && renderApprovals()}
      {activeTab === 'workflows' && renderWorkflows()}
      {activeTab === 'sessions' && renderSessions()}
      {activeTab === 'audit' && renderAuditLog()}
      {activeTab === 'login-history' && renderLoginHistory()}

      {/* Tab Content — Part 2 */}
      {activeTab === 'activity-log' && renderActivityLog()}
      {activeTab === 'backup' && renderBackup()}
      {activeTab === 'system-health' && renderSystemHealth()}
      {activeTab === 'scheduler' && renderScheduler()}
      {activeTab === 'feature-flags' && renderFeatureFlags()}
      {activeTab === 'api-management' && renderApiManagement()}
      {activeTab === 'licensing' && renderLicensing()}
      {activeTab === 'maintenance' && renderMaintenance()}

      {/* ─── Modals — Part 1 ─── */}
      {showCreateUser && isSuperAdmin && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={(newUser, tempPass) => {
            setUsers((prev) => [...prev, newUser]);
            setShowCreateUser(false);
            setOneTimePasswordReveal({ staffId: newUser.staffId, username: newUser.username, tempPass });
          }}
        />
      )}

      {showCreateCompany && (
        <CreateCompanyModal
          onClose={() => setShowCreateCompany(false)}
          onCreated={(company) => { setCompanies((prev) => [...prev, company]); setShowCreateCompany(false); }}
        />
      )}

      {showCreateBranch && (
        <CreateBranchModal
          companies={companies}
          onClose={() => setShowCreateBranch(false)}
          onCreated={(branch) => { setBranches((prev) => [...prev, branch]); setShowCreateBranch(false); }}
        />
      )}

      {selectedRole && permissionMatrix && (
        <RolePermissionsModal
          role={selectedRole}
          permissionMatrix={permissionMatrix}
          onClose={() => setSelectedRole(null)}
        />
      )}

      {showCreateApproval && (
        <ApprovalRuleModal
          onClose={() => setShowCreateApproval(false)}
          onCreated={(rule) => { setApprovalRules((prev) => [...prev, rule]); setShowCreateApproval(false); }}
        />
      )}

      {showWorkflowEditor && (
        <WorkflowEditorModal
          onClose={() => setShowWorkflowEditor(false)}
          onCreated={(wf) => { setWorkflows((prev) => [...prev, wf]); setShowWorkflowEditor(false); }}
        />
      )}

      {editingSeries && (
        <NumberSeriesModal
          seriesKey={editingSeries.key}
          series={editingSeries.data}
          onClose={() => setEditingSeries(null)}
          onSaved={(key, updated) => {
            setNumberSeries((prev: any) => ({ ...prev, [key]: updated }));
            setEditingSeries(null);
          }}
        />
      )}

      {/* Admin Reset Password Modal */}
      {resetPassModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Key size={22} style={{ color: '#06b6d4' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Admin Reset Password</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Target: <strong>{resetPassModal.fullName}</strong> ({resetPassModal.username}, Staff ID: {resetPassModal.staffId})
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '10px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-color)', marginBottom: '14px' }}>
              ℹ️ <strong>No old password required.</strong> Enter an exact new password or use <code>Pass@123</code>. The user will be required to change it on their next login.
            </div>

            <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  New Password to Assign *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={customPassInput}
                  onChange={(e) => setCustomPassInput(e.target.value)}
                  placeholder="e.g. Pass@123"
                  required
                  style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '1px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setCustomPassInput('Pass@123')}
                >
                  Quick Fill: Pass@123
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setCustomPassInput('Afreen#' + Math.floor(100000 + Math.random() * 900000))}
                >
                  Generate Random
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setResetPassModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetPassLoading} style={{ backgroundColor: '#06b6d4', borderColor: '#06b6d4' }}>
                  {resetPassLoading ? 'Resetting…' : 'Apply New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-Time Password Reveal */}
      {oneTimePasswordReveal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', border: '2px solid #10b981' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Key size={40} style={{ color: '#10b981', marginBottom: '8px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Credentials Ready</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Provide the following credentials to the user:
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {oneTimePasswordReveal.staffId > 0 && (
                <div>Staff ID: <strong className="tabular-nums" style={{ color: '#10b981' }}>{oneTimePasswordReveal.staffId}</strong></div>
              )}
              <div>Username: <strong>{oneTimePasswordReveal.username}</strong></div>
              <div>Password: <strong style={{ color: '#10b981', fontSize: '18px', fontFamily: 'monospace' }}>{oneTimePasswordReveal.tempPass}</strong></div>
            </div>
            <button className="btn btn-primary" onClick={() => setOneTimePasswordReveal(null)} style={{ width: '100%', padding: '12px' }}>
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Modals — Part 2 ─── */}
      {showBackupModal && (
        <BackupRestoreModal
          backups={backups}
          onClose={() => setShowBackupModal(false)}
          onBackupStarted={(backup) => { setBackups((prev) => [backup, ...prev]); setShowBackupModal(false); }}
        />
      )}

      {showSchedulerModal && (
        <SchedulerJobModal
          onClose={() => setShowSchedulerModal(false)}
          onCreated={(job) => { setSchedulerJobs((prev) => [...prev, job]); setShowSchedulerModal(false); }}
        />
      )}

      {showCreateApiKey && (
        <CreateApiKeyModal
          onClose={() => { setShowCreateApiKey(false); setNewlyCreatedApiKey(null); loadApiManagement(); }}
          onCreated={(key, rawKey) => { setNewlyCreatedApiKey({ key: rawKey, id: key.id }); }}
        />
      )}

      {showLicenseModal && licenseData && (
        <LicenseActivateModal
          currentLicense={licenseData}
          onClose={() => setShowLicenseModal(false)}
          onActivated={(license) => { setLicenseData(license); setShowLicenseModal(false); }}
        />
      )}

      {showMaintenanceModal && (
        <MaintenanceModeModal
          maintenance={maintenanceMode}
          onClose={() => setShowMaintenanceModal(false)}
          onUpdated={(m) => { setMaintenanceMode(m); setShowMaintenanceModal(false); }}
        />
      )}
    </div>
  );
};
