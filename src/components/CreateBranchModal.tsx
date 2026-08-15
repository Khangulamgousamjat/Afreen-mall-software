import React, { useState } from 'react';
import { GitBranch, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface CreateBranchModalProps {
  companies: any[];
  onClose: () => void;
  onCreated: (branch: any) => void;
}

const STORE_TYPES = ['RETAIL', 'WHOLESALE', 'WAREHOUSE', 'FRANCHISE', 'OUTLET', 'FLAGSHIP'];

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({ companies, onClose, onCreated }) => {
  const [form, setForm] = useState({
    companyId: companies[0]?.id || 'COMP-001',
    code: '',
    name: '',
    storeType: 'RETAIL',
    address: '',
    gstin: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) { setError('Branch code and name are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/branches', form);
      onCreated(res.data.branch);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <GitBranch size={24} style={{ color: '#10b981' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Create New Branch</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Branches are store locations within a company. Users are assigned to branches.</div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Parent Company</label>
            <select className="input-field" value={form.companyId} onChange={(e) => set('companyId', e.target.value)}>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Branch Code *</label>
              <input type="text" className="input-field" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="AFREEN-002" required />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Branch Name *</label>
              <input type="text" className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Afreen Mall – North Branch" required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Store Type</label>
            <select className="input-field" value={form.storeType} onChange={(e) => set('storeType', e.target.value)}>
              {STORE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <MapPin size={11} style={{ display: 'inline', marginRight: '4px' }} />Store Address
            </label>
            <input type="text" className="input-field" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Ground Floor, Afreen Mall, Mumbai" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>GST Registration No.</label>
              <input type="text" className="input-field" value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="27AABCA1234L1Z5" maxLength={15} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                <Phone size={11} style={{ display: 'inline', marginRight: '4px' }} />Contact Phone
              </label>
              <input type="tel" className="input-field" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckCircle2 size={15} />
              {loading ? 'Creating…' : 'Create Branch'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
