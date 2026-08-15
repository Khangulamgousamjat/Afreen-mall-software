import React, { useState } from 'react';
import { RotateCcw, X, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState('SO-2026-000045');
  const [customerName, setCustomerName] = useState('Aman Retail Hypermarket');
  const [productName, setProductName] = useState('Britannia Good Day Biscuits 200g');
  const [returnQty, setReturnQty] = useState('10');
  const [reason, setReason] = useState('Damaged Outer Packaging');
  const [refundMode, setRefundMode] = useState('CREDIT_NOTE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(returnQty);
    if (!qty || qty <= 0) {
      setError('Enter a valid positive return quantity.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        originalInvoiceNo,
        customerName,
        items: [{ productName, returnQty: qty }],
        reason,
        refundMode,
      };

      const res = await api.post('/sales/returns', payload);
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to process sales return'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '560px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Sales Return & Credit Note Generator
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
            ✓ Return {result.returnNo} processed! Credit Note {result.creditNoteNo} issued & inventory restored.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Original Invoice / SO Ref *</label>
              <input type="text" className="input-field tabular-nums" value={originalInvoiceNo} onChange={(e) => setOriginalInvoiceNo(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Title</label>
              <input type="text" className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Product Returned</label>
              <input type="text" className="input-field" value={productName} onChange={(e) => setProductName(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Return Qty *</label>
              <input type="number" className="input-field tabular-nums" value={returnQty} onChange={(e) => setReturnQty(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Return Reason *</label>
              <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="Damaged Outer Packaging">Damaged Outer Packaging</option>
                <option value="Customer Cancellation">Customer Cancellation</option>
                <option value="Wrong Billing Quantity">Wrong Billing Quantity</option>
                <option value="Product Defect / Quality Issue">Product Defect / Quality Issue</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Refund Settlement Mode</label>
              <select className="input-field" value={refundMode} onChange={(e) => setRefundMode(e.target.value)}>
                <option value="CREDIT_NOTE">Issue Credit Note</option>
                <option value="CASH">Cash Refund</option>
                <option value="BANK_TRANSFER">Bank Transfer Credit</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!result} style={{ padding: '8px 20px' }}>
              {loading ? 'Processing...' : 'Process Sales Return & Credit Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
