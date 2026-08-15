import React, { useState } from 'react';
import { RotateCcw, X, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [supplierId, setSupplierId] = useState('sup-1');
  const [grnNumber, setGrnNumber] = useState('GRN-2026-000001');
  const [productName, setProductName] = useState('Amul Butter 500g');
  const [productId, setProductId] = useState('prod-4');
  const [returnQty, setReturnQty] = useState('5');
  const [reason, setReason] = useState('Damaged Packaging during Transit');
  const [loading, setLoading] = useState(false);
  const [returnResult, setReturnResult] = useState<any | null>(null);
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
        supplierId,
        grnNumber,
        productId,
        returnQty: qty,
        reason,
      };

      const res = await api.post('/purchasing/returns', payload);
      setReturnResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to process purchase return'));
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
              Purchase Return & Supplier Debit Note Generator
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

        {returnResult && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Return {returnResult.returnNo} processed! Debit Note {returnResult.debitNoteNo} issued & inventory decremented.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Supplier</label>
              <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="sup-1">Fortune Global Oils Ltd</option>
                <option value="sup-2">Amul Dairy Co-op Ltd</option>
                <option value="sup-3">Britannia Industries Distribution</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Original GRN Ref</label>
              <input type="text" className="input-field tabular-nums" value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Product Title</label>
              <input type="text" className="input-field" value={productName} onChange={(e) => setProductName(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Return Qty *</label>
              <input type="number" className="input-field tabular-nums" value={returnQty} onChange={(e) => setReturnQty(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Return Reason *</label>
            <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Damaged Packaging during Transit">Damaged Packaging during Transit</option>
              <option value="Expired / Short Expiry Goods Received">Expired / Short Expiry Goods Received</option>
              <option value="Quality Inspection Failure">Quality Inspection Failure</option>
              <option value="Supplier Over-shipment Excess">Supplier Over-shipment Excess</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!returnResult} style={{ padding: '8px 20px' }}>
              {loading ? 'Processing Return...' : 'Process Return & Issue Debit Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
