import React, { useState } from 'react';
import { ShoppingBag, X, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [supplierId, setSupplierId] = useState('sup-1');
  const [supplierName, setSupplierName] = useState('Fortune Global Oils Ltd');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [deliveryDate, setDeliveryDate] = useState('2026-08-18');
  const [items, setItems] = useState([
    { productId: 'prod-1', productName: 'Afreen Premium Basmati Rice 5kg', qty: 100, unitCostRupees: '520.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { productId: 'prod-2', productName: 'Britannia Good Day Biscuits 200g', qty: 500, unitCostRupees: '32.00' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supplierId || items.length === 0) {
      setError('Supplier and items are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        supplierId,
        items: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitCost: Math.round(parseFloat(i.unitCostRupees) * 100),
        })),
      };

      await api.post('/purchasing/orders', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to create Purchase Order'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '680px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Issue Formal Purchase Order (PO-2026-XXXXXX)
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
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Supplier</label>
              <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="sup-1">Fortune Global Oils Ltd</option>
                <option value="sup-2">Amul Dairy Co-op Ltd</option>
                <option value="sup-3">Britannia Industries Distribution</option>
                <option value="sup-4">Metro Wholesale Traders Pvt Ltd</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment Terms</label>
              <select className="input-field" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days (Standard)</option>
                <option value="NET_60">Net 60 Days</option>
                <option value="COD">Cash On Delivery (COD)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Expected Delivery Date</label>
              <input
                type="date"
                className="input-field tabular-nums"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ITEM GRID */}
          <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Line Items Breakdown</span>
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
                  placeholder="Product Name..."
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
                  placeholder="Order Qty..."
                />
                <input
                  type="number"
                  className="input-field monetary"
                  value={item.unitCostRupees}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].unitCostRupees = e.target.value;
                    setItems(copy);
                  }}
                  placeholder="Unit Cost ₹..."
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
              {loading ? 'Issuing PO...' : 'Issue Purchase Order to Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
