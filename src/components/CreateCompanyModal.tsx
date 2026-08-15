import React, { useState } from 'react';
import { Building2, Globe, Hash, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface CreateCompanyModalProps {
  onClose: () => void;
  onCreated: (company: any) => void;
}

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'Asia/Singapore', 'Europe/London'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'SGD', 'GBP'];
const FY_OPTIONS = ['2025-26', '2026-27', '2027-28'];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    gstin: '',
    pan: '',
    address: '',
    financialYear: '2026-27',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError('Company name is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/companies', form);
      onCreated(res.data.company);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Building2 size={24} style={{ color: '#10b981' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Register New Company</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Multi-company ERP — data isolation enforced between companies</div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Company Name *</label>
            <input type="text" className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Afreen Mall Enterprises Pvt. Ltd." required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                <Hash size={11} style={{ display: 'inline', marginRight: '4px' }} />GSTIN
              </label>
              <input type="text" className="input-field" value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="27AABCA1234L1Z5" maxLength={15} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>PAN</label>
              <input type="text" className="input-field" value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="AABCA1234L" maxLength={10} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Registered Address</label>
            <input type="text" className="input-field" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Shop No. 1, Afreen Mall, Mumbai, Maharashtra 400001" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Financial Year</label>
              <select className="input-field" value={form.financialYear} onChange={(e) => set('financialYear', e.target.value)}>
                {FY_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                <Globe size={11} style={{ display: 'inline', marginRight: '4px' }} />Currency
              </label>
              <select className="input-field" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Timezone</label>
              <select className="input-field" value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckCircle2 size={15} />
              {loading ? 'Registering…' : 'Register Company'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
