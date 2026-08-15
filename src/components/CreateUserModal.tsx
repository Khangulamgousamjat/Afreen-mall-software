import React, { useState } from 'react';
import { UserPlus, Key, Building2, GitBranch, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { RoleName } from '@afreen-mall/shared-types';

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: (user: any, tempPassword: string) => void;
}

const DEPARTMENTS = ['Sales', 'Purchase', 'Inventory', 'Accounting', 'HR', 'CRM', 'IT', 'Operations', 'Management'];
const BRANCHES = ['AFREEN-001 – Main Store', 'AFREEN-002 – North Branch', 'AFREEN-003 – South Branch'];
const COMPANIES = ['Afreen Mall Enterprises Pvt. Ltd.'];

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const special = '@#$!';
  let pass = '';
  for (let i = 0; i < 7; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  pass += special[Math.floor(Math.random() * special.length)];
  return 'Afr' + pass;
};

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    employeeCode: '',
    department: '',
    branch: BRANCHES[0],
    company: COMPANIES[0],
    role: RoleName.CASHIER as RoleName,
    initialPassword: 'Pass@123',
    canProcessSaleReturn: false,
  });
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.username || !form.role) {
      setError('Full Name, Username, and Role are required');
      return;
    }
    if (!form.initialPassword || form.initialPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/admin/users', form);
      onCreated(res.data.user, res.data.oneTimeTemporaryPassword || form.initialPassword || 'Pass@123');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <UserPlus size={24} style={{ color: '#10b981' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Create New Staff Account</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Super Admin only — Staff ID is auto-assigned after creation.
            </div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* ─── Credentials Section (most important — placed first) ─── */}
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} /> Login Credentials
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Username * <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(used to log in)</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="e.g. ramesh1"
                  required
                />
              </div>
            </div>

            {/* Password — full-width, prominent */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                <Key size={12} style={{ display: 'inline', marginRight: '5px', color: '#f59e0b' }} />
                <strong>Initial Password *</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>— Staff must change on first login</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    value={form.initialPassword}
                    onChange={(e) => set('initialPassword', e.target.value)}
                    placeholder="e.g. Pass@123"
                    required
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      letterSpacing: '1px',
                      fontWeight: 'bold',
                      color: '#f59e0b',
                      paddingRight: '38px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                  onClick={() => set('initialPassword', 'Pass@123')}
                  title="Reset to default Pass@123"
                >
                  Pass@123
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                  onClick={() => set('initialPassword', generatePassword())}
                  title="Generate strong random password"
                >
                  <RefreshCw size={12} /> Random
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                ⚠️ Note this password — it will be shown once after account creation.
              </div>
            </div>
          </div>

          {/* ─── Role & Permissions ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assign Role *</label>
              <select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value as RoleName)}>
                {Object.values(RoleName).map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Department</label>
              <select className="input-field" value={form.department} onChange={(e) => set('department', e.target.value)}>
                <option value="">Select Department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input type="checkbox" checked={form.canProcessSaleReturn} onChange={(e) => set('canProcessSaleReturn', e.target.checked)} />
            Allow Sale Return Permission
          </label>

          {/* ─── Optional Info ─── */}
          <details style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 10px' }}>
            <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 0' }}>
              Optional Details (Email, Mobile, Branch, Company)
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ramesh@afreenmall.com" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mobile</label>
                  <input type="tel" className="input-field" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Employee Code</label>
                  <input type="text" className="input-field" value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} placeholder="EMP-2026-000001" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    <Building2 size={12} style={{ display: 'inline', marginRight: '4px' }} />Company
                  </label>
                  <select className="input-field" value={form.company} onChange={(e) => set('company', e.target.value)}>
                    {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  <GitBranch size={12} style={{ display: 'inline', marginRight: '4px' }} />Branch
                </label>
                <select className="input-field" value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </details>

          {/* Auto-generated Staff ID notice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 12px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} style={{ color: '#10b981', flexShrink: 0 }} />
            <span>Staff ID is <strong>auto-assigned</strong> from the 300000+ series after account creation.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }} disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Staff Account'}
            </button>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '10px 20px' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
