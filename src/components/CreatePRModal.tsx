import React, { useState } from 'react';
import { FilePlus, X, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreatePRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePRModal: React.FC<CreatePRModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [department, setDepartment] = useState('Grocery & Staples');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'>('HIGH');
  const [requiredDate, setRequiredDate] = useState('2026-08-15');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState([
    { productName: 'Afreen Premium Basmati Rice 5kg', barcode: '890103000001', currentStock: 80, requestedQty: 50, estimatedCostRupees: '29500' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { productName: 'Britannia Good Day Biscuits 200g', barcode: '890103000002', currentStock: 12, requestedQty: 100, estimatedCostRupees: '3600' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!department || !justification) {
      setError('Department and Justification are required.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/purchasing/requisitions', {
        department,
        priority,
        requiredDate,
        justification,
        items,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to create Purchase Requisition'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '680px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilePlus size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Create Purchase Requisition (Internal PR)
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
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Department</label>
              <select className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="Grocery & Staples">Grocery & Staples</option>
                <option value="Snacks & Beverages">Snacks & Beverages</option>
                <option value="Dairy & Frozen Foods">Dairy & Frozen Foods</option>
                <option value="Home & Kitchenware">Home & Kitchenware</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Priority Level</label>
              <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                <option value="LOW">Low (Standard Routine)</option>
                <option value="MEDIUM">Medium (General Stocking)</option>
                <option value="HIGH">High (Fast Selling Stock)</option>
                <option value="URGENT">Urgent (Critical Stock Deficit)</option>
                <option value="EMERGENCY">Emergency (Out of Stock)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Required Delivery Date</label>
              <input
                type="date"
                className="input-field tabular-nums"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Business Justification / Purpose *</label>
            <input
              type="text"
              className="input-field"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Replenishing high-demand stock ahead of weekend sale..."
              required
            />
          </div>

          {/* ITEM GRID */}
          <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Requisition Items Grid</span>
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
                  value={item.requestedQty}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].requestedQty = parseInt(e.target.value) || 1;
                    setItems(copy);
                  }}
                  placeholder="Requested Qty..."
                />
                <input
                  type="number"
                  className="input-field monetary"
                  value={item.estimatedCostRupees}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].estimatedCostRupees = e.target.value;
                    setItems(copy);
                  }}
                  placeholder="Est. Cost ₹..."
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
              {loading ? 'Submitting...' : 'Submit Requisition for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
