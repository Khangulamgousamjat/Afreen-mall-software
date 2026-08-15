import React, { useState } from 'react';
import { UserPlus, X, ShieldCheck, Building } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface OnboardEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OnboardEmployeeModal: React.FC<OnboardEmployeeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Senior Cashier');
  const [department, setDepartment] = useState('POS & Sales');
  const [branch, setBranch] = useState('Afreen Mall Main Store');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !designation || !department) {
      setError('Full Name, Designation, and Department are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName,
        email,
        phone,
        designation,
        department,
        branch,
        employmentType,
        pan,
        aadhaar,
        bankName,
        bankAccountNo,
      };

      await api.post('/hrms/employees', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to onboard new employee'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '640px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Employee Onboarding & Master Registration
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Employee Name *</label>
              <input type="text" className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Phone</label>
              <input type="text" className="input-field tabular-nums" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 11223" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Official Email Address</label>
              <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@afreenmall.com" />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Employment Type</label>
              <select className="input-field" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                <option value="FULL_TIME">Full Time Permanent</option>
                <option value="PART_TIME">Part Time</option>
                <option value="PROBATION">Probationary Period</option>
                <option value="CONTRACT">Contractual Staff</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Designation *</label>
              <select className="input-field" value={designation} onChange={(e) => setDesignation(e.target.value)}>
                <option value="Senior Cashier">Senior Cashier</option>
                <option value="POS Billing Staff">POS Billing Staff</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Inventory Executive">Inventory Executive</option>
                <option value="Purchase Officer">Purchase Officer</option>
                <option value="Accountant">Accountant</option>
                <option value="HR Specialist">HR Specialist</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Department *</label>
              <select className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="POS & Sales">POS & Sales</option>
                <option value="Inventory & Warehouse">Inventory & Warehouse</option>
                <option value="Purchasing">Purchasing</option>
                <option value="Accounts & Finance">Accounts & Finance</option>
                <option value="HR & Admin">HR & Admin</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assigned Branch</label>
              <input type="text" className="input-field" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>PAN Card Number</label>
              <input type="text" className="input-field tabular-nums" value={pan} onChange={(e) => setPan(e.target.value)} placeholder="e.g. ABCPS1234F" />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bank Account Number</label>
              <input type="text" className="input-field tabular-nums" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="e.g. 5020001928374" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Onboarding...' : 'Onboard Employee & Activate Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
