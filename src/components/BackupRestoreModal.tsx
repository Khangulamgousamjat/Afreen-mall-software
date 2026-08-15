import React, { useState } from 'react';
import { Database, Shield, HardDrive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface BackupRestoreModalProps {
  backups: any[];
  onClose: () => void;
  onBackupStarted: (backup: any) => void;
}

const BACKUP_TYPES = [
  { value: 'FULL', label: 'Full Backup', desc: 'Complete backup of all data, files, and configuration. ~40–50 MB.', time: '~90 seconds' },
  { value: 'INCREMENTAL', label: 'Incremental Backup', desc: 'Only changes since the last backup. Much faster, smaller size.', time: '~15 seconds' },
  { value: 'DIFFERENTIAL', label: 'Differential Backup', desc: 'All changes since the last FULL backup. Medium size.', time: '~45 seconds' },
];

const TARGETS = [
  { value: 'LOCAL', label: 'Local Storage', icon: '💾' },
  { value: 'NETWORK', label: 'Network Share (NAS)', icon: '🖧' },
  { value: 'CLOUD', label: 'Cloud Storage (Coming Soon)', icon: '☁', disabled: true },
];

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ backups, onClose, onBackupStarted }) => {
  const [mode, setMode] = useState<'backup' | 'restore'>('backup');
  const [backupType, setBackupType] = useState('FULL');
  const [target, setTarget] = useState('LOCAL');
  const [selectedBackup, setSelectedBackup] = useState('');
  const [confirmRestore, setConfirmRestore] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRunBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/admin/backups/run', { type: backupType, target });
      onBackupStarted(res.data.backup);
      setSuccess(`${backupType} backup started (${res.data.backup.id}). It will complete in the background and notify you when done.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBackup) { setError('Select a backup to restore from'); return; }
    if (confirmRestore !== 'RESTORE') { setError('Type RESTORE exactly to confirm this destructive operation'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await api.post(`/admin/backups/${selectedBackup}/restore`, { confirmed: true });
      setSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate restore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Database size={24} style={{ color: '#06b6d4' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Backup & Restore</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enterprise backup management and disaster recovery</div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
          {(['backup', 'restore'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: mode === m ? 'bold' : 'normal', background: mode === m ? '#06b6d4' : 'transparent', color: mode === m ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
              {m === 'backup' ? '💾 Run Backup' : '⟳ Restore from Backup'}
            </button>
          ))}
        </div>

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>{success}</div>}

        {mode === 'backup' ? (
          <form onSubmit={handleRunBackup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Backup Type</label>
              {BACKUP_TYPES.map((bt) => (
                <label key={bt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', marginBottom: '6px', border: `1px solid ${backupType === bt.value ? '#06b6d4' : 'var(--border-color)'}`, backgroundColor: backupType === bt.value ? 'rgba(6,182,212,0.05)' : 'transparent', cursor: 'pointer' }}>
                  <input type="radio" name="backupType" value={bt.value} checked={backupType === bt.value} onChange={() => setBackupType(bt.value)} style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{bt.label} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({bt.time})</span></div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{bt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Backup Target</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {TARGETS.map((t) => (
                  <button key={t.value} type="button" disabled={t.disabled}
                    onClick={() => !t.disabled && setTarget(t.value)}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', border: `1px solid ${target === t.value ? '#06b6d4' : 'var(--border-color)'}`, backgroundColor: target === t.value ? 'rgba(6,182,212,0.08)' : 'transparent', color: t.disabled ? 'var(--text-muted)' : 'var(--text-color)', cursor: t.disabled ? 'not-allowed' : 'pointer', opacity: t.disabled ? 0.5 : 1 }}>
                    <div>{t.icon}</div>
                    <div style={{ marginTop: '4px' }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <HardDrive size={12} style={{ display: 'inline', marginRight: '6px', color: '#06b6d4' }} />
              Backup will include: Database · Audit Logs · System Config · Uploaded Files · Number Series.
              Production operations continue uninterrupted during backup.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                <Database size={14} /> {loading ? 'Starting…' : `Start ${backupType} Backup`}
              </button>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRestore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', padding: '12px', fontSize: '12px', color: '#ef4444' }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
              <strong>DESTRUCTIVE OPERATION:</strong> Restoring from a backup will overwrite all current data. This action is irreversible. Ensure all active transactions are complete before proceeding.
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Select Backup to Restore</label>
              {backups.filter((b) => b.status === 'COMPLETED' && b.verified).map((b) => (
                <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '6px', border: `1px solid ${selectedBackup === b.id ? '#ef4444' : 'var(--border-color)'}`, cursor: 'pointer', backgroundColor: selectedBackup === b.id ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                  <input type="radio" name="restoreFrom" value={b.id} checked={selectedBackup === b.id} onChange={() => setSelectedBackup(b.id)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{b.id} — {b.type} Backup</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {b.completedAt ? new Date(b.completedAt).toLocaleString('en-IN') : '—'} · {b.sizeMb?.toFixed(1)} MB · Triggered by: {b.triggeredBy}
                    </div>
                  </div>
                  {b.verified && <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />}
                </label>
              ))}
              {backups.filter((b) => b.status === 'COMPLETED').length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No completed backups available</div>
              )}
            </div>

            {selectedBackup && (
              <div>
                <label style={{ fontSize: '12px', color: '#ef4444', display: 'block', marginBottom: '4px' }}>Type <strong>RESTORE</strong> to confirm this destructive operation</label>
                <input type="text" className="input-field" value={confirmRestore} onChange={(e) => setConfirmRestore(e.target.value)} placeholder="Type RESTORE here" style={{ borderColor: confirmRestore === 'RESTORE' ? '#10b981' : '#ef4444' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn" style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', color: '#ef4444' }} disabled={loading || !selectedBackup || confirmRestore !== 'RESTORE'}>
                {loading ? 'Initiating…' : '⟳ Restore from Backup'}
              </button>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
