import React, { useState } from 'react';
import { FileText, X, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateQuotationModal: React.FC<CreateQuotationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('Metro Supermarket Chain');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [validUntil, setValidUntil] = useState('2026-08-25');
  const [items, setItems] = useState([
    { productName: 'Afreen Premium Basmati Rice 5kg', qty: 30, rateRupees: '590.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { productName: 'Amul Butter 500g', qty: 50, rateRupees: '260.00' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName || items.length === 0) {
      setError('Customer Name and line items are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerName,
        contactPhone,
        validUntil,
        items: items.map((i) => ({
          productName: i.productName,
          qty: i.qty,
          rate: Math.round(parseFloat(i.rateRupees) * 100),
        })),
      };

      await api.post('/sales/quotations', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to create quotation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '640px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Create Sales Quotation (QT-2026-XXXXXX)
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Title *</label>
              <input type="text" className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Phone</label>
              <input type="text" className="input-field tabular-nums" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Quotation Valid Until</label>
              <input type="date" className="input-field tabular-nums" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
            </div>
          </div>

          {/* ITEM GRID */}
          <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Quoted Items Grid</span>
              <button type="button" className="btn" onClick={handleAddItem} style={{ padding: '4px 8px', fontSize: '11px' }}>
                <Plus size={12} /> Add Item Row
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input-field"
                  value={item.productName}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].productName = e.target.value;
                    setItems(copy);
                  }}
                  placeholder="Product Title..."
                />
                <input
                  type="number"
                  className="input-field tabular-nums"
                  value={item.qty}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].qty = parseInt(e.target.value) || 1;
                    setItems(copy);
                  }}
                  placeholder="Qty..."
                />
                <input
                  type="number"
                  className="input-field monetary"
                  value={item.rateRupees}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].rateRupees = e.target.value;
                    setItems(copy);
                  }}
                  placeholder="Rate ₹..."
                />
                <button type="button" className="btn" onClick={() => handleRemoveItem(idx)} style={{ padding: '4px', color: 'var(--status-red)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Generating...' : 'Issue Sales Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
