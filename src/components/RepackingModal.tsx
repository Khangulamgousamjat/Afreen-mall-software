import React, { useState } from 'react';
import { RefreshCw, X, AlertTriangle, PackageCheck } from 'lucide-react';
import { api } from '../services/api';

interface RepackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onSuccess: () => void;
}

export const RepackingModal: React.FC<RepackingModalProps> = ({ isOpen, onClose, products, onSuccess }) => {
  const [bulkProductId, setBulkProductId] = useState(products[0]?.productId || products[0]?.id || '');
  const [bulkQtyUsed, setBulkQtyUsed] = useState('1');
  const [retailProductId, setRetailProductId] = useState(products[1]?.productId || products[1]?.id || '');
  const [retailQtyProduced, setRetailQtyProduced] = useState('10');
  const [wastageQty, setWastageQty] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (bulkProductId === retailProductId) {
      setError('Bulk Source Product and Retail Destination Product must be different.');
      return;
    }

    const bulkQty = parseInt(bulkQtyUsed);
    const retailQty = parseInt(retailQtyProduced);

    if (!bulkQty || bulkQty <= 0 || !retailQty || retailQty <= 0) {
      setError('Enter valid positive bulk and retail quantities.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/inventory/repack', {
        bulkProductId,
        bulkQtyUsed: bulkQty,
        retailProductId,
        retailQtyProduced: retailQty,
        wastageQty: parseInt(wastageQty) || 0,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Repacking process failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '540px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageCheck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Bulk Goods Repacking & Pack Conversion
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
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--status-amber)', marginBottom: '8px' }}>
              1. Source Bulk Inventory Item (Sack / Barrel)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <select className="input-field" value={bulkProductId} onChange={(e) => setBulkProductId(e.target.value)}>
                {products.map((p) => (
                  <option key={p.id} value={p.productId || p.id}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input-field tabular-nums"
                value={bulkQtyUsed}
                onChange={(e) => setBulkQtyUsed(e.target.value)}
                placeholder="Qty Used..."
                required
              />
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--status-green)', marginBottom: '8px' }}>
              2. Destination Retail Pack Item (Produced Pcs)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <select className="input-field" value={retailProductId} onChange={(e) => setRetailProductId(e.target.value)}>
                {products.map((p) => (
                  <option key={p.id} value={p.productId || p.id}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="input-field tabular-nums"
                value={retailQtyProduced}
                onChange={(e) => setRetailQtyProduced(e.target.value)}
                placeholder="Qty Produced..."
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Packaging Loss / Spillage Wastage Qty</label>
            <input
              type="number"
              className="input-field tabular-nums"
              value={wastageQty}
              onChange={(e) => setWastageQty(e.target.value)}
              placeholder="e.g. 0"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Converting...' : 'Process Bulk Conversion & Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
