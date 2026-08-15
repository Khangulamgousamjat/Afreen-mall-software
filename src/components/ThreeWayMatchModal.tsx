import React, { useState } from 'react';
import { ShieldCheck, X, Check, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface ThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  onSuccess: () => void;
}

export const ThreeWayMatchModal: React.FC<ThreeWayMatchModalProps> = ({ isOpen, onClose, orders, onSuccess }) => {
  const [poNumber, setPoNumber] = useState(orders[0]?.poNumber || 'PO-2026-000001');
  const [grnNumber, setGrnNumber] = useState('GRN-2026-000001');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceAmountRupees, setInvoiceAmountRupees] = useState('154000.00');
  const [freightChargesRupees, setFreightChargesRupees] = useState('1500.00');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!poNumber || !grnNumber || !supplierInvoiceNo || !invoiceAmountRupees) {
      setError('PO Number, GRN Number, Supplier Invoice Number, and Amount are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        poNumber,
        grnNumber,
        supplierInvoiceNo,
        invoiceAmount: Math.round(parseFloat(invoiceAmountRupees) * 100),
        freightCharges: Math.round((parseFloat(freightChargesRupees) || 0) * 100),
      };

      await api.post('/purchasing/invoices/verify', payload);
      setVerified(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(getApiErrorMessage(err, '3-Way invoice match verification failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '620px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Three-Way Match Verification (PO vs GRN vs Supplier Invoice)
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

        {verified && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ 3-Way Match Verified! Invoice {supplierInvoiceNo} matched against PO & GRN and posted to Accounts Payable.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* THREE DOCUMENTS DISPLAY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>1. Purchase Order</div>
              <select className="input-field" style={{ fontSize: '11px', marginTop: '4px' }} value={poNumber} onChange={(e) => setPoNumber(e.target.value)}>
                {orders.map((o) => (
                  <option key={o.id} value={o.poNumber}>
                    {o.poNumber}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>2. Goods Receipt Note</div>
              <input type="text" className="input-field tabular-nums" style={{ fontSize: '11px', marginTop: '4px' }} value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>3. Supplier Invoice</div>
              <input type="text" className="input-field tabular-nums" style={{ fontSize: '11px', marginTop: '4px' }} value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Supplier Invoice Net Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="input-field monetary"
                value={invoiceAmountRupees}
                onChange={(e) => setInvoiceAmountRupees(e.target.value)}
                placeholder="e.g. 154000.00"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Freight & Transport Landed Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input-field monetary"
                value={freightChargesRupees}
                onChange={(e) => setFreightChargesRupees(e.target.value)}
                placeholder="e.g. 1500.00"
              />
            </div>
          </div>

          <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            ⚡ <strong>Tolerance Validation Rule:</strong> Quantities and unit costs are matched with a maximum variance tolerance of 0.5%. Mismatches freeze Accounts Payable posting.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || verified} style={{ padding: '8px 20px' }}>
              {loading ? 'Verifying 3-Way Match...' : 'Verify & Post to AP Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
