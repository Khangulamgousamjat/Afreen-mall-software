import React, { useState, useEffect } from 'react';
import {
  Settings, Moon, Sun, Key, LogOut, UserCheck, CheckCircle2,
  Lock, ShieldAlert, UserPlus, Eye, EyeOff, AlertCircle, Sliders,
  Shield, Check, User, Trash2, RefreshCw, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { RoleName } from '@afreen-mall/shared-types';

export const SettingsScreen: React.FC = () => {
  const { user, theme, toggleTheme, changePassword, logout } = useAuth();
  const isSuperAdmin = user?.role === RoleName.SUPER_ADMIN;
  const isManager = user?.role === RoleName.STORE_MANAGER;
  const isAuthorizedManager = isSuperAdmin || isManager;

  // ── Password Change State ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // ── Staff Management State (For Managers & Super Admin) ──
  const [staffList, setStaffList] = useState<any[]>([
    { id: '1', staffId: 300000, username: 'Superkhan', fullName: 'Gous Khan (Super Admin)', role: RoleName.SUPER_ADMIN, isLocked: false, isDeactivated: false, canProcessSaleReturn: true },
    { id: '2', staffId: 300001, username: 'manager1', fullName: 'Sanjay Gupta (Store Manager)', role: RoleName.STORE_MANAGER, isLocked: false, isDeactivated: false, canProcessSaleReturn: true },
    { id: '3', staffId: 300002, username: 'pooja1', fullName: 'Pooja Sharma (Head Cashier)', role: RoleName.CASHIER, isLocked: false, isDeactivated: false, canProcessSaleReturn: true },
    { id: '4', staffId: 300003, username: 'vinayak1', fullName: 'Vinayak Shinde (Cashier)', role: RoleName.CASHIER, isLocked: false, isDeactivated: false, canProcessSaleReturn: false },
    { id: '5', staffId: 300004, username: 'babuji1', fullName: 'Babuji Namole (Cash Officer)', role: RoleName.CASH_OFFICER, isLocked: false, isDeactivated: false, canProcessSaleReturn: true },
    { id: '6', staffId: 300005, username: 'amit1', fullName: 'Amit Verma (Senior Accountant)', role: RoleName.ACCOUNTANT, isLocked: false, isDeactivated: false, canProcessSaleReturn: true },
    { id: '7', staffId: 300010, username: 'rohan1', fullName: 'Rohan Kadam (Cashier)', role: RoleName.CASHIER, isLocked: false, isDeactivated: false, canProcessSaleReturn: false },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<RoleName>(RoleName.CASHIER);
  const [newCanProcessSaleReturn, setNewCanProcessSaleReturn] = useState(false);
  const [newInitialPassword, setNewInitialPassword] = useState('Pass@123');

  const [resetPasswordModal, setResetPasswordModal] = useState<{
    userId: string;
    username: string;
    fullName: string;
    staffId: number;
  } | null>(null);
  const [customResetPassword, setCustomResetPassword] = useState('Pass@123');
  const [resetLoading, setResetLoading] = useState(false);

  const [oneTimePasswordReveal, setOneTimePasswordReveal] = useState<{
    staffId: number;
    username: string;
    tempPass: string;
  } | null>(null);

  const loadStaff = () => {
    if (isAuthorizedManager) {
      api.get('/admin/users').then((res) => {
        if (res.data?.users) setStaffList(res.data.users);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    loadStaff();
  }, [isAuthorizedManager]);

  // Handle Password Change Form Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword) {
      setPassError('Current password is required');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword === currentPassword) {
      setPassError('New password must be different from current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirm password do not match');
      return;
    }

    try {
      setPassLoading(true);
      await changePassword(newPassword, currentPassword);
      setPassSuccess('Password updated successfully! Please log in again with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || getApiErrorMessage(err, 'Failed to update password'));
    } finally {
      setPassLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post('/admin/users', {
        username: newUsername,
        fullName: newFullName,
        role: newRole,
        canProcessSaleReturn: newCanProcessSaleReturn,
        initialPassword: newInitialPassword || 'Pass@123',
      });

      const created = res.data.user;
      const tempPass = res.data.oneTimeTemporaryPassword || newInitialPassword || 'Pass@123';

      setStaffList((prev) => [...prev, created]);
      setShowCreateModal(false);
      setNewUsername('');
      setNewFullName('');
      setNewCanProcessSaleReturn(false);
      setNewInitialPassword('Pass@123');

      setOneTimePasswordReveal({
        staffId: created.staffId,
        username: created.username,
        tempPass,
      });
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to create staff member'));
    }
  };

  const handleOpenResetPassword = (s: any) => {
    setResetPasswordModal({
      userId: s.id,
      username: s.username,
      fullName: s.fullName,
      staffId: s.staffId,
    });
    setCustomResetPassword('Pass@123');
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModal) return;
    try {
      setResetLoading(true);
      const res = await api.post(`/admin/users/${resetPasswordModal.userId}/reset-password`, {
        newPassword: customResetPassword || 'Pass@123',
      });
      const tempPass = res.data.tempPassword || res.data.temporaryPassword || customResetPassword || 'Pass@123';
      setOneTimePasswordReveal({
        staffId: resetPasswordModal.staffId,
        username: resetPasswordModal.username,
        tempPass,
      });
      setResetPasswordModal(null);
      loadStaff();
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to reset staff password'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteStaffAccount = async (userId: string, fullName: string, username: string, staffId: number) => {
    if (staffId === 300000) {
      alert('Root Super Admin account cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ PERMANENT ACCOUNT DELETION\n\nAre you sure you want to permanently remove staff account for:\n"${fullName}" (${username}, Staff ID: ${staffId})?\n\nAll active sessions will be terminated and this account will be completely removed from the database.\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      setStaffList((prev) => prev.filter((u) => u.id !== userId));
      alert(`Staff account for ${fullName} (Staff ID: ${staffId}) has been permanently deleted.`);
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to permanently delete staff account'));
    }
  };

  const handleRoleChange = async (userId: string, role: RoleName) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setStaffList((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to update user role'));
    }
  };

  const handleToggleDeactivation = async (userId: string, currentDeactivated: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isDeactivated: !currentDeactivated });
      setStaffList((prev) => prev.map((u) => (u.id === userId ? { ...u, isDeactivated: !currentDeactivated } : u)));
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to update user status'));
    }
  };

  const handleToggleSaleReturnPermission = async (userId: string, currentPerm: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/permissions`, { canProcessSaleReturn: !currentPerm });
      setStaffList((prev) => prev.map((u) => (u.id === userId ? { ...u, canProcessSaleReturn: !currentPerm } : u)));
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to update sales return permission'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      {/* Settings Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={26} style={{ color: 'var(--accent-lime)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              System Settings & User Preferences
            </h1>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage appearance theme (Dark/Light), security password, and session settings (Shortcut: <strong style={{ color: 'var(--accent-lime)' }}>Ctrl + S</strong>)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 10px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            Staff ID: <strong style={{ color: 'var(--accent-lime)' }}>{user?.staffId || '300000'}</strong>
          </span>
          <button className="btn btn-primary" onClick={() => logout()} style={{ padding: '8px 16px', fontSize: '13px' }}>
            <LogOut size={15} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* Top Grid: 3 Main Settings Cards (Theme, Password, Logout Session) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

        {/* 🎨 CARD 1: Dark and Light Mode Theme Option */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {theme === 'dark' ? <Moon size={20} style={{ color: 'var(--accent-lime)' }} /> : <Sun size={20} style={{ color: '#f59e0b' }} />}
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Appearance Theme Mode</h3>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: theme === 'dark' ? 'var(--accent-lime)' : '#d97706',
                  border: theme === 'dark' ? '1px solid var(--accent-lime)' : '1px solid #f59e0b',
                }}
              >
                {theme === 'dark' ? 'DARK MODE ACTIVE' : 'LIGHT MODE ACTIVE'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Choose your preferred visual theme for the Afreen Mall POS system. Theme updates immediately across all screens and sidebar navigation.
            </p>

            {/* Dark & Light Theme Selectable Preview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                style={{
                  padding: '14px 12px',
                  backgroundColor: '#090d16',
                  color: '#f8fafc',
                  border: theme === 'dark' ? '2px solid var(--accent-lime)' : '1px solid #1e293b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <Moon size={22} style={{ margin: '0 auto 6px', color: '#10b981' }} />
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Dark Mode</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Emerald Dark Contrast</div>
                {theme === 'dark' && <span style={{ fontSize: '10px', color: '#10b981', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>✓ Selected</span>}
              </div>

              <div
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                style={{
                  padding: '14px 12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: theme === 'light' ? '2px solid #10b981' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sun size={22} style={{ margin: '0 auto 6px', color: '#d97706' }} />
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Light Mode</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Crisp High Legibility</div>
                {theme === 'light' && <span style={{ fontSize: '10px', color: '#10b981', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>✓ Selected</span>}
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={toggleTheme} style={{ width: '100%', padding: '10px', fontSize: '13px', justifyContent: 'center' }}>
            <Sliders size={15} />
            <span>Switch to {theme === 'dark' ? 'Light Theme ☀️' : 'Dark Theme 🌙'}</span>
          </button>
        </div>

        {/* 🔑 CARD 2: Change Password Option */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Key size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Change Security Password</h3>
          </div>

          {passError && (
            <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid var(--status-red)', color: 'var(--status-red)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div style={{ padding: '8px 12px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-lime)', color: 'var(--accent-lime)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} />
              <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  className="input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password (if set)"
                  style={{ fontSize: '13px', padding: '8px 36px 8px 10px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  required
                  style={{ fontSize: '13px', padding: '8px 36px 8px 10px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password to confirm"
                required
                style={{ fontSize: '13px', padding: '8px 10px' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={passLoading} style={{ marginTop: 'auto', padding: '10px', fontSize: '13px', justifyContent: 'center' }}>
              <Lock size={15} />
              <span>{passLoading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        </div>

        {/* 🚪 CARD 3: Active Session & Logout Option */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <UserCheck size={20} style={{ color: 'var(--accent-lime)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Active Staff Session</h3>
            </div>

            <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-lime)', fontWeight: 'bold' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{user?.fullName || 'Staff User'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{user?.username || 'user'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Staff ID</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-lime)' }}>{user?.staffId || 300000}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Assigned Role</span>
                  <strong style={{ color: 'var(--text-main)' }}>{user?.role || 'CASHIER'}</strong>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Logging out will clear your active terminal session and require credentials to sign in again.
            </p>
          </div>

          <button
            className="btn"
            onClick={() => logout()}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              justifyContent: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'var(--status-red)',
              color: 'var(--status-red)',
              fontWeight: 'bold',
            }}
          >
            <LogOut size={15} />
            <span>Logout Staff Account</span>
          </button>
        </div>
      </div>

      {/* Manager & Admin Staff Management Section */}
      {isAuthorizedManager && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: 'var(--accent-lime)' }} />
                <span>Store Manager Staff Account Controls</span>
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Manage staff permissions, 7-day inactivity locks, and add new store staff profiles
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" onClick={loadStaff} title="Refresh Staff List">
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <UserPlus size={16} />
                <span>Add New Staff Account</span>
              </button>
            </div>
          </div>

          {/* Staff Directory Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Assigned Role</th>
                    <th>Sale Return Perm</th>
                    <th>Account Status</th>
                    <th style={{ minWidth: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((s) => (
                    <tr key={s.id}>
                      <td className="tabular-nums" style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-lime)' }}>
                        {s.staffId}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{s.username}</td>
                      <td>{s.fullName}</td>
                      <td>
                        <select
                          className="input-field"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                          value={s.role}
                          onChange={(e) => handleRoleChange(s.id, e.target.value as RoleName)}
                          disabled={s.staffId === 300000}
                        >
                          {Object.values(RoleName).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: s.canProcessSaleReturn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: s.canProcessSaleReturn ? '#10b981' : '#ef4444',
                            }}
                          >
                            {s.canProcessSaleReturn ? 'ALLOWED ✓' : 'SALES ONLY'}
                          </span>
                          <button
                            className="btn"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => handleToggleSaleReturnPermission(s.id, s.canProcessSaleReturn)}
                          >
                            {s.canProcessSaleReturn ? 'Revoke' : 'Allow Return'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            border: '1px solid var(--border-color)',
                            color: s.isDeactivated ? 'var(--status-red)' : s.isLocked ? 'var(--status-amber)' : 'var(--status-green)',
                          }}
                        >
                          {s.isDeactivated ? 'DEACTIVATED (7-Day Inactive)' : s.isLocked ? 'LOCKED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Reset Password Button without requiring old password */}
                          <button
                            className="btn"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              backgroundColor: 'rgba(6, 182, 212, 0.15)',
                              borderColor: '#06b6d4',
                              color: '#06b6d4',
                            }}
                            onClick={() => handleOpenResetPassword(s)}
                            title="Reset Staff Password (No Old Password Required)"
                            disabled={s.staffId === 300000 && !isSuperAdmin}
                          >
                            <Key size={12} />
                            <span>Reset Pass</span>
                          </button>

                          {/* Deactivate / Reactivate */}
                          {s.isDeactivated ? (
                            <button
                              className="btn"
                              style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#10b981' }}
                              onClick={() => handleToggleDeactivation(s.id, true)}
                            >
                              <CheckCircle2 size={12} />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              className="btn"
                              style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--status-amber)' }}
                              onClick={() => handleToggleDeactivation(s.id, false)}
                              disabled={s.staffId === 300000}
                              title="Deactivate Account"
                            >
                              <Lock size={12} />
                              <span>Deactivate</span>
                            </button>
                          )}

                          {/* Delete Account Permanently Button */}
                          {s.staffId !== 300000 && (
                            <button
                              className="btn"
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                borderColor: '#ef4444',
                                color: '#ef4444',
                              }}
                              onClick={() => handleDeleteStaffAccount(s.id, s.fullName, s.username, s.staffId)}
                              title="Permanently Remove Account from Database"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
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
      )}

      {/* Modal: Reset Staff Password (No Old Password Required) */}
      {resetPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <KeyRound size={22} style={{ color: '#06b6d4' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Manager Password Reset</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Resetting password for <strong>{resetPasswordModal.fullName}</strong> ({resetPasswordModal.username})
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '10px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-color)', marginBottom: '14px' }}>
              ℹ️ <strong>No old password required.</strong> Enter a new password or leave as <code>Pass@123</code>. The staff member will be required to change it on their next login.
            </div>

            <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  New Password to Assign *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={customResetPassword}
                  onChange={(e) => setCustomResetPassword(e.target.value)}
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
                  onClick={() => setCustomResetPassword('Pass@123')}
                >
                  Quick Fill: Pass@123
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setCustomResetPassword('Afreen#' + Math.floor(100000 + Math.random() * 900000))}
                >
                  Generate Random
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setResetPasswordModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading} style={{ backgroundColor: '#06b6d4', borderColor: '#06b6d4' }}>
                  {resetLoading ? 'Resetting…' : 'Apply New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Staff Account */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Add New Staff Profile</h3>
            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Staff Full Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>System Username *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ramesh1"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Assign Role *</label>
                <select
                  className="input-field"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleName)}
                >
                  {Object.values(RoleName).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Initial Temporary Password</label>
                <input
                  type="text"
                  className="input-field"
                  value={newInitialPassword}
                  onChange={(e) => setNewInitialPassword(e.target.value)}
                  placeholder="Pass@123"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="saleReturn"
                  checked={newCanProcessSaleReturn}
                  onChange={(e) => setNewCanProcessSaleReturn(e.target.checked)}
                />
                <label htmlFor="saleReturn" style={{ fontSize: '13px' }}>
                  Allow Processing Sale Returns
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reveal Modal */}
      {oneTimePasswordReveal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Staff Credentials Ready!</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Give the following credentials to the staff member:
            </p>
            <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--accent-lime)', padding: '16px', margin: '16px 0', borderRadius: '6px' }}>
              {oneTimePasswordReveal.staffId > 0 && (
                <div>Staff ID: <strong style={{ color: 'var(--accent-lime)', fontFamily: 'monospace' }}>{oneTimePasswordReveal.staffId}</strong></div>
              )}
              <div>Username: <strong>{oneTimePasswordReveal.username}</strong></div>
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                Password: <strong style={{ color: '#f59e0b', fontSize: '16px', fontFamily: 'monospace' }}>{oneTimePasswordReveal.tempPass}</strong>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setOneTimePasswordReveal(null)} style={{ width: '100%' }}>
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
