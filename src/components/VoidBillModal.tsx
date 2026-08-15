import React, { useState } from 'react';
import { Lock, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

interface VoidBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoiceNo: string) => void;
}

export const VoidBillModal: React.FC<VoidBillModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [reason, setReason] = useState('Customer Cancelled / Billing Error');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/pos/void', {
        invoiceNo: invoiceNo.trim(),
        managerPin: managerPin.trim(),
        reason: reason.trim(),
      });

      if (res.data?.sale) {
        onSuccess(invoiceNo.trim());
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to void invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '480px', border: '2px solid var(--status-red)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-red)' }}>
            <ShieldAlert size={22} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Manager Authorized Invoice Void
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--status-red)', color: 'var(--status-red)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Target Invoice Number (e.g. AFM-2026-000042)
            </label>
            <input
              type="text"
              className="input-field tabular-nums"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Type Invoice Number..."
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Store Manager Authorization PIN / Password
            </label>
            <input
              type="password"
              className="input-field"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              placeholder="Enter Store Manager Password or PIN..."
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Mandatory Void Reason
            </label>
            <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Customer Cancelled / Billing Error">Customer Cancelled / Billing Error</option>
              <option value="Duplicate Invoice Generated">Duplicate Invoice Generated</option>
              <option value="Payment Gateway Failure">Payment Gateway Failure</option>
              <option value="Pricing / Tax Override Mistake">Pricing / Tax Override Mistake</option>
            </select>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-color)', padding: '10px', border: '1px solid var(--border-color)' }}>
            ⚠️ Voiding will reverse sale status, restore inventory stock, and write an immutable audit log entry.
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, backgroundColor: 'var(--status-red)', borderColor: 'var(--status-red)' }}>
              {loading ? 'Authorizing Void...' : 'Authorize & Void Invoice'}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
