import React, { useState } from 'react';
import { Key, Copy, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface CreateApiKeyModalProps {
  onClose: () => void;
  onCreated: (key: any, rawKey: string) => void;
}

const SCOPES = [
  { value: 'READ', label: 'Read Only', desc: 'GET requests only. Cannot create, update, or delete data.' },
  { value: 'READ_WRITE', label: 'Read & Write', desc: 'Full CRUD access. Cannot manage users or system config.' },
  { value: 'ADMIN', label: 'Admin', desc: 'Full access including user management. Use with extreme caution.' },
];

export const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    scope: 'READ',
    allowedOrigins: '*',
    rateLimit: '60',
    expiresInDays: '365',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState<{ key: string; id: string } | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError('API key name is required'); return; }
    setLoading(true); setError('');
    try {
      const origins = form.allowedOrigins === '*' ? ['*'] : form.allowedOrigins.split(',').map((o) => o.trim()).filter(Boolean);
      const res = await api.post('/admin/api-keys', {
        name: form.name, scope: form.scope,
        allowedOrigins: origins,
        rateLimit: Number(form.rateLimit),
        expiresInDays: Number(form.expiresInDays),
      });
      setCreatedKey({ key: res.data.apiKey.key, id: res.data.apiKey.id });
      onCreated(res.data.apiKey, res.data.apiKey.key);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };

  if (createdKey) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '480px', border: '2px solid #10b981' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Key size={40} style={{ color: '#10b981', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>API Key Created</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              This key is shown <strong>ONCE ONLY</strong>. Copy it now — it cannot be retrieved again.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>API Key ({createdKey.id})</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ flex: 1, fontSize: '11px', fontFamily: 'monospace', color: '#10b981', wordBreak: 'break-all' }}>
                {keyVisible ? createdKey.key : '•'.repeat(createdKey.key.length)}
              </code>
              <button onClick={() => setKeyVisible((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-muted)' }}>
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', padding: '12px' }}>
            I Have Copied This Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Key size={24} style={{ color: '#f59e0b' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Generate API Key</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Create a secure API key for external integrations</div>
          </div>
        </div>

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Integration Name *</label>
            <input type="text" className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. External POS Integration" required />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Access Scope *</label>
            {SCOPES.map((s) => (
              <label key={s.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px', marginBottom: '4px', border: `1px solid ${form.scope === s.value ? '#f59e0b' : 'var(--border-color)'}`, backgroundColor: form.scope === s.value ? 'rgba(245,158,11,0.05)' : 'transparent', cursor: 'pointer' }}>
                <input type="radio" name="scope" value={s.value} checked={form.scope === s.value} onChange={() => set('scope', s.value)} style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{s.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rate Limit (req/min)</label>
              <input type="number" className="input-field" value={form.rateLimit} onChange={(e) => set('rateLimit', e.target.value)} min="1" max="10000" />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Expires In (days)</label>
              <input type="number" className="input-field" value={form.expiresInDays} onChange={(e) => set('expiresInDays', e.target.value)} min="1" max="3650" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Allowed Origins (comma-separated, * for all)</label>
            <input type="text" className="input-field" value={form.allowedOrigins} onChange={(e) => set('allowedOrigins', e.target.value)} placeholder="https://pos.afreenmall.com, https://app.afreenmall.com" style={{ fontFamily: 'monospace', fontSize: '12px' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <Key size={14} /> {loading ? 'Generating…' : 'Generate API Key'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
