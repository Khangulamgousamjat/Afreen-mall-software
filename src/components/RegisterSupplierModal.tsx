import React, { useState } from 'react';
import { Truck, X, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface RegisterSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterSupplierModal: React.FC<RegisterSupplierModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('Fortune Edible Oils Pvt Ltd');
  const [gstNo, setGstNo] = useState('27AAACF1234F1Z9');
  const [category, setCategory] = useState('Grocery & Edible Oils');
  const [contactPhone, setContactPhone] = useState('+91 98333 44556');
  const [email, setEmail] = useState('orders@fortuneoils.in');
  const [creditLimitRupees, setCreditLimitRupees] = useState('1000000.00');
  const [creditDays, setCreditDays] = useState('30');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError('Supplier Name is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name,
        gstNo,
        category,
        contactPhone,
        email,
        creditLimitRupees,
        creditDays: parseInt(creditDays) || 30,
        leadTimeDays: parseInt(leadTimeDays) || 2,
      };

      await api.post('/suppliers', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to register supplier'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '620px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Register / Onboard New Master Supplier
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', border: '1px solid var(--status-red)', fontSize: '12px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Company Trade Name *</label>
            <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>GSTIN Number</label>
              <input type="text" className="input-field tabular-nums" value={gstNo} onChange={(e) => setGstNo(e.target.value)} placeholder="27XXXXX1234X1ZX" />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Primary Business Category</label>
              <input type="text" className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Mobile Phone</label>
              <input type="text" className="input-field tabular-nums" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Credit Limit (₹)</label>
              <input type="number" className="input-field monetary" value={creditLimitRupees} onChange={(e) => setCreditLimitRupees(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Credit Period (Days)</label>
              <input type="number" className="input-field tabular-nums" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Delivery Lead Time (Days)</label>
              <input type="number" className="input-field tabular-nums" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Activating...' : 'Activate Master Supplier Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
