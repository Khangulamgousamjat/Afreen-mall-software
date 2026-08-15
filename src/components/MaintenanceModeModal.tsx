import React, { useState } from 'react';
import { Wrench, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';

interface MaintenanceModeModalProps {
  maintenance: any;
  onClose: () => void;
  onUpdated: (maintenance: any) => void;
}

export const MaintenanceModeModal: React.FC<MaintenanceModeModalProps> = ({ maintenance, onClose, onUpdated }) => {
  const [message, setMessage] = useState(maintenance?.message || 'Afreen Mall ERP is currently undergoing scheduled maintenance. We will be back shortly.');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { setError('Maintenance message is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/maintenance/enable', {
        message: message.trim(),
        scheduledEnd: scheduledEnd || undefined,
      });
      onUpdated(res.data.maintenance);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enable maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Disable maintenance mode? All users will regain access immediately.')) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/maintenance/disable');
      onUpdated(res.data.maintenance);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentlyEnabled = maintenance?.enabled;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px', border: isCurrentlyEnabled ? '2px solid #f59e0b' : '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Wrench size={24} style={{ color: isCurrentlyEnabled ? '#f59e0b' : '#6b7280' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {isCurrentlyEnabled ? '⚠ Maintenance Mode ACTIVE' : 'Maintenance Mode'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isCurrentlyEnabled ? `Enabled by ${maintenance.enabledBy} — regular users are blocked` : 'Enable to block regular users during maintenance'}
            </div>
          </div>
        </div>

        {isCurrentlyEnabled && (
          <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '6px' }}>Current Maintenance Message</div>
            <div style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-color)' }}>"{maintenance.message}"</div>
            {maintenance.enabledAt && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Enabled at: {new Date(maintenance.enabledAt).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        )}

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        {!isCurrentlyEnabled ? (
          <form onSubmit={handleEnable} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)', padding: '10px', fontSize: '12px', color: '#f59e0b' }}>
              <AlertTriangle size={12} style={{ display: 'inline', marginRight: '6px' }} />
              All regular users will see a maintenance page. Super Admins and Store Managers retain full access.
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Maintenance Message (shown to users)</label>
              <textarea
                className="input-field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Enter message to display to users during maintenance…"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Scheduled End Time (optional)</label>
              <input type="datetime-local" className="input-field" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Leave blank if end time is unknown. You can disable manually.</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn" style={{ flex: 1, backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b', color: '#f59e0b' }} disabled={loading}>
                <Wrench size={14} /> {loading ? 'Enabling…' : 'Enable Maintenance Mode'}
              </button>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '6px', color: '#10b981' }} />
              Clicking "Disable Maintenance Mode" will immediately restore access for all users. Active background jobs will resume.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDisable} disabled={loading}>
                <CheckCircle2 size={14} /> {loading ? 'Disabling…' : 'Disable Maintenance Mode'}
              </button>
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
