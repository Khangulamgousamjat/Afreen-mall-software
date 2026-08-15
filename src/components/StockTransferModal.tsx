import React, { useState } from 'react';
import { Truck, X, AlertTriangle, Check } from 'lucide-react';
import { api } from '../services/api';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onSuccess: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({ isOpen, onClose, products, onSuccess }) => {
  const [selectedInventoryId, setSelectedInventoryId] = useState(products[0]?.id || '');
  const [sourceWarehouse, setSourceWarehouse] = useState('Main Warehouse');
  const [destinationWarehouse, setDestinationWarehouse] = useState('Store Floor');
  const [transferQty, setTransferQty] = useState('10');
  const [notes, setNotes] = useState('Stock replenishment for store floor shelves');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const product = products.find((p) => p.id === selectedInventoryId) || products[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (sourceWarehouse === destinationWarehouse) {
      setError('Source and Destination Warehouses must be different.');
      return;
    }

    const qty = parseInt(transferQty);
    if (!qty || qty <= 0) {
      setError('Enter a valid positive transfer quantity.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/inventory/transfer', {
        inventoryId: selectedInventoryId,
        sourceWarehouse,
        destinationWarehouse,
        transferQty: qty,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '520px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Inter-Warehouse Stock Transfer
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
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Product to Transfer</label>
            <select className="input-field" value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.currentStock} {p.unit || 'PCS'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Source Warehouse</label>
              <select className="input-field" value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)}>
                <option value="Main Warehouse">Main Warehouse</option>
                <option value="Store Floor">Store Floor</option>
                <option value="Cold Storage">Cold Storage</option>
                <option value="Damage Store">Damage Store</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Destination Warehouse</label>
              <select className="input-field" value={destinationWarehouse} onChange={(e) => setDestinationWarehouse(e.target.value)}>
                <option value="Store Floor">Store Floor</option>
                <option value="Main Warehouse">Main Warehouse</option>
                <option value="Cold Storage">Cold Storage</option>
                <option value="Damage Store">Damage Store</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Transfer Quantity ({product?.unit || 'PCS'}) *</label>
            <input
              type="number"
              className="input-field tabular-nums"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              placeholder="Enter transfer quantity..."
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Transfer Remarks / Dispatch Notes</label>
            <input
              type="text"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason or dispatch notes..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Dispatching...' : 'Dispatch Transfer Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
