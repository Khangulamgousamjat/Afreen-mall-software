import React, { useState } from 'react';
import { DollarSign, X, Check, CreditCard, Landmark } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CustomerCollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerCollectionsModal: React.FC<CustomerCollectionsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('Standard Wholesale Mart');
  const [amountRupees, setAmountRupees] = useState('125000.00');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE'>('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('Payment against invoice SO-2026-000044');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amountRupees);
    if (!amt || amt <= 0) {
      setError('Enter a valid positive collection amount.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerName,
        amount: Math.round(amt * 100),
        paymentMode,
        referenceNo,
        notes,
      };

      const res = await api.post('/sales/collections', payload);
      setReceipt(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to record customer collection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '540px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Customer Receivables Credit Recovery Collection
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

        {receipt && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Receipt {receipt.receiptNo} generated! ₹{parseFloat(amountRupees).toLocaleString('en-IN')} credited to {customerName}'s account.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Customer *</label>
            <input type="text" className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Collection Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="input-field monetary"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="e.g. 125000.00"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment Method</label>
              <select className="input-field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as any)}>
                <option value="UPI">UPI Digital Payment</option>
                <option value="BANK_TRANSFER">Bank RTGS/NEFT Transfer</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="CHEQUE">Bank Cheque Deposit</option>
                <option value="CASH">Cash Collection</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bank UTR / Transaction Ref</label>
              <input type="text" className="input-field tabular-nums" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ledger Remarks</label>
              <input type="text" className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!receipt} style={{ padding: '8px 20px' }}>
              {loading ? 'Recording...' : 'Capture Credit Collection & Issue Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
