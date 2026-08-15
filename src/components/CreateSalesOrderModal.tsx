import React, { useState } from 'react';
import { ShoppingCart, X, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('Aman Retail Hypermarket');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [expectedDelivery, setExpectedDelivery] = useState('2026-08-12');
  const [items, setItems] = useState([
    { productName: 'Britannia Good Day Biscuits 200g', qty: 200, rateRupees: '36.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { productName: 'Coca Cola Soft Drink 1.25L', qty: 100, rateRupees: '60.00' },
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
        paymentTerms,
        expectedDelivery,
        items: items.map((i) => ({
          productName: i.productName,
          qty: i.qty,
          rate: Math.round(parseFloat(i.rateRupees) * 100),
        })),
      };

      await api.post('/sales/orders', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to create sales order'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '640px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Create Sales Order & Reserve Inventory (SO-2026-XXXXXX)
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
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment Terms</label>
              <select className="input-field" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days</option>
                <option value="COD">Cash On Delivery (COD)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Expected Delivery Date</label>
              <input type="date" className="input-field tabular-nums" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} required />
            </div>
          </div>

          {/* ITEM GRID */}
          <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Order Items Grid</span>
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
                  placeholder="Selling Rate ₹..."
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
              {loading ? 'Confirming...' : 'Confirm Sales Order & Reserve Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
