import React, { useState } from 'react';
import { FileCheck, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface VendorContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VendorContractModal: React.FC<VendorContractModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [supplierName, setSupplierName] = useState('Metro Wholesale Traders Pvt Ltd');
  const [contractTitle, setContractTitle] = useState('Annual Basmati Rice Bulk Supply & Price Lock Agreement');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2027-07-31');
  const [slaDays, setSlaDays] = useState('2');
  const [notes, setNotes] = useState('Guaranteed ₹590/5kg Basmati Rice rate lock with 48-hr delivery SLA.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supplierName || !contractTitle) {
      setError('Supplier Name and Contract Title are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        supplierName,
        contractTitle,
        startDate,
        endDate,
        slaDays: parseInt(slaDays) || 2,
        notes,
      };

      const res = await api.post('/suppliers/contracts', payload);
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to register vendor contract'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '580px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Execute Vendor Contract & Price Lock Agreement
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

        {result && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Contract {result.contractNo} executed for {supplierName}! Price lock active until {endDate}.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Supplier *</label>
            <input type="text" className="input-field" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contract Title / Scope *</label>
            <input type="text" className="input-field" value={contractTitle} onChange={(e) => setContractTitle(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contract Start Date</label>
              <input type="date" className="input-field tabular-nums" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contract Expiry Date</label>
              <input type="date" className="input-field tabular-nums" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Delivery SLA (Hours)</label>
              <input type="number" className="input-field tabular-nums" value={slaDays} onChange={(e) => setSlaDays(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Price Lock & Discount Terms</label>
            <textarea
              className="input-field"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!result} style={{ padding: '8px 20px' }}>
              {loading ? 'Executing...' : 'Execute Vendor Contract & Lock Prices'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
