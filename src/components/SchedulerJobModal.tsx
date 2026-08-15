import React, { useState } from 'react';
import { Clock, Play, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface SchedulerJobModalProps {
  onClose: () => void;
  onCreated: (job: any) => void;
}

const MODULES = ['Backup', 'Inventory', 'CRM', 'Accounting', 'Reports', 'HRMS', 'Database', 'Admin', 'Notification'];
const COMMON_CRONS = [
  { label: 'Every 30 minutes', cron: '*/30 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every day at 2:00 AM', cron: '0 2 * * *' },
  { label: 'Every day at 8:00 AM', cron: '0 8 * * *' },
  { label: 'Every Monday at 7:00 AM', cron: '0 7 * * 1' },
  { label: '1st of every month at 9:00 AM', cron: '0 9 1 * *' },
  { label: 'Every Sunday at 3:00 AM', cron: '0 3 * * 0' },
  { label: 'Custom (enter below)', cron: '' },
];

export const SchedulerJobModal: React.FC<SchedulerJobModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    module: 'Backup',
    action: '',
    cron: '0 2 * * *',
    cronDesc: 'Every day at 2:00 AM',
    enabled: true,
    customCron: '',
    useCustom: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleCronSelect = (preset: { label: string; cron: string }) => {
    if (preset.cron === '') {
      set('useCustom', true);
    } else {
      set('useCustom', false);
      set('cron', preset.cron);
      set('cronDesc', preset.label);
    }
  };

  const effectiveCron = form.useCustom ? form.customCron : form.cron;
  const effectiveDesc = form.useCustom ? form.customCron : form.cronDesc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.module || !form.action || !effectiveCron) {
      setError('Name, module, action, and cron expression are required');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/scheduler/jobs', {
        name: form.name, module: form.module, action: form.action,
        cron: effectiveCron, cronDesc: effectiveDesc, enabled: form.enabled,
      });
      onCreated(res.data.job);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create scheduled job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Clock size={24} style={{ color: '#8b5cf6' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Create Scheduled Job</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configure recurring automated tasks using cron expressions</div>
          </div>
        </div>

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Job Name *</label>
            <input type="text" className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Weekly Sales Report Email" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Module *</label>
              <select className="input-field" value={form.module} onChange={(e) => set('module', e.target.value)}>
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Action / Event Key *</label>
              <input type="text" className="input-field" value={form.action} onChange={(e) => set('action', e.target.value.toUpperCase().replace(/\s/g, '_'))} placeholder="e.g. SALES_REPORT_EMAIL" required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Schedule (Cron Preset)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {COMMON_CRONS.map((preset) => (
                <button key={preset.label} type="button"
                  onClick={() => handleCronSelect(preset)}
                  style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'left', border: `1px solid ${(form.useCustom && preset.cron === '') || (!form.useCustom && form.cron === preset.cron) ? '#8b5cf6' : 'var(--border-color)'}`, backgroundColor: (form.useCustom && preset.cron === '') || (!form.useCustom && form.cron === preset.cron) ? 'rgba(139,92,246,0.08)' : 'transparent', cursor: 'pointer', color: 'var(--text-color)' }}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {form.useCustom ? (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Custom Cron Expression *</label>
              <input type="text" className="input-field" value={form.customCron} onChange={(e) => set('customCron', e.target.value)} placeholder="e.g. 0 9 * * 1-5 (weekdays at 9am)" style={{ fontFamily: 'monospace' }} />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Format: minute hour day month weekday</div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', padding: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Clock size={12} style={{ color: '#8b5cf6' }} />
                <span style={{ fontFamily: 'monospace', color: '#8b5cf6' }}>{form.cron}</span>
                <span style={{ color: 'var(--text-muted)' }}>—</span>
                <span>{form.cronDesc}</span>
              </div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
            Enable job immediately after creation
          </label>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckCircle2 size={14} /> {loading ? 'Creating…' : 'Create Scheduled Job'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
