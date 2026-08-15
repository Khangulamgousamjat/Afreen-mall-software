import React, { useState } from 'react';
import { CheckCircle2, Tag } from 'lucide-react';
import { api } from '../services/api';

interface LicenseActivateModalProps {
  currentLicense: any;
  onClose: () => void;
  onActivated: (license: any) => void;
}

export const LicenseActivateModal: React.FC<LicenseActivateModalProps> = ({ currentLicense, onClose, onActivated }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setError('License key is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/license/activate', { key: key.trim() });
      onActivated(res.data.license);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate license');
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = currentLicense?.daysUntilExpiry ?? 0;
  const isExpiringSoon = daysLeft < 30;
  const isExpired = daysLeft <= 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Tag size={24} style={{ color: '#10b981' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>License Management</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Activate or renew your Afreen Mall ERP license</div>
          </div>
        </div>

        {/* Current License Status */}
        <div style={{ backgroundColor: 'var(--bg-color)', border: `1px solid ${isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981'}`, padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Current License</div>
            <span style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: isExpired ? 'rgba(239,68,68,0.1)' : isExpiringSoon ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981', border: `1px solid ${isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981'}`, fontWeight: 'bold' }}>
              {isExpired ? 'EXPIRED' : isExpiringSoon ? `EXPIRING IN ${daysLeft} DAYS` : 'ACTIVE'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> {currentLicense?.type}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Support:</span> {currentLicense?.supportTier}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Issued To:</span> {currentLicense?.issuedTo?.split(' ').slice(0, 2).join(' ')}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Expiry:</span> {currentLicense?.expiryDate}</div>
          </div>
          <div style={{ marginTop: '10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            {currentLicense?.key}
          </div>
        </div>

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>New License Key</label>
            <input
              type="text" className="input-field"
              value={key} onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="AFREEN-MALL-ENT-XXXX-XXXX-XXXX-XXXX"
              style={{ fontFamily: 'monospace', letterSpacing: '1px' }} required
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Format: AFREEN-[TYPE]-[TIER]-[KEY1]-[KEY2]-[KEY3]-[KEY4]
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong style={{ color: '#10b981' }}>What happens on activation:</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '16px', lineHeight: '1.6' }}>
              <li>License key is validated with the activation server</li>
              <li>Module entitlements are updated</li>
              <li>User and terminal limits are refreshed</li>
              <li>New expiry date is applied immediately</li>
              <li>Activation is recorded in the Audit Log</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckCircle2 size={14} /> {loading ? 'Activating…' : 'Activate License'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
