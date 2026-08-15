import React, { useState } from 'react';
import { PackagePlus, X, AlertTriangle, Check } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProduct: any) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Grocery & Staples');
  const [unit, setUnit] = useState('PCS');
  const [mrpRupees, setMrpRupees] = useState('');
  const [saleRateRupees, setSaleRateRupees] = useState('');
  const [costPriceRupees, setCostPriceRupees] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [initialStock, setInitialStock] = useState('50');
  const [warehouse, setWarehouse] = useState('Main Warehouse');
  const [rack, setRack] = useState('A-01');
  const [bin, setBin] = useState('BIN-12');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!barcode || !name || !mrpRupees || !saleRateRupees) {
      setError('Barcode, Product Name, MRP, and Selling Price are required.');
      return;
    }

    setLoading(true);

    const mrpPaise = Math.round(parseFloat(mrpRupees) * 100);
    const saleRatePaise = Math.round(parseFloat(saleRateRupees) * 100);
    const costPricePaise = costPriceRupees ? Math.round(parseFloat(costPriceRupees) * 100) : Math.round(saleRatePaise * 0.8);

    const payload = {
      barcode: barcode.trim(),
      name: name.trim(),
      category,
      unit,
      mrp: mrpPaise,
      saleRate: saleRatePaise,
      costPrice: costPricePaise,
      minStockLevel: parseInt(minStockLevel) || 10,
      initialStock: parseInt(initialStock) || 0,
      warehouse,
      rack,
      bin,
    };

    try {
      const res = await api.post('/inventory/products', payload);
      if (res.data?.product) {
        onSuccess(res.data.product);
        onClose();
      } else {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to add product to catalog'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="modal-content" style={{ maxWidth: '640px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackagePlus size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Create Product Master Record
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Barcode / EAN-13 *</label>
              <input
                type="text"
                className="input-field tabular-nums"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type barcode (e.g. 890103000005)..."
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Product Name *</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full product title..."
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Department / Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Grocery & Staples">Grocery & Staples</option>
                <option value="Snacks & Beverages">Snacks & Beverages</option>
                <option value="Personal Care & Cosmetics">Personal Care & Cosmetics</option>
                <option value="Dairy & Frozen Foods">Dairy & Frozen Foods</option>
                <option value="Home & Kitchenware">Home & Kitchenware</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Unit of Measure (UOM)</label>
              <select className="input-field" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="PCS">PCS (Pieces)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="LTR">LTR (Litres)</option>
                <option value="PACK">PACK (Bundled Pack)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>MRP (Maximum Retail ₹) *</label>
              <input
                type="number"
                step="0.01"
                className="input-field monetary"
                value={mrpRupees}
                onChange={(e) => setMrpRupees(e.target.value)}
                placeholder="e.g. 250.00"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Effective Selling Rate (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="input-field monetary"
                value={saleRateRupees}
                onChange={(e) => setSaleRateRupees(e.target.value)}
                placeholder="e.g. 225.00"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Purchase Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input-field monetary"
                value={costPriceRupees}
                onChange={(e) => setCostPriceRupees(e.target.value)}
                placeholder="e.g. 180.00"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Initial Stock</label>
              <input
                type="number"
                className="input-field tabular-nums"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Min Alert Stock</label>
              <input
                type="number"
                className="input-field tabular-nums"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rack Number</label>
              <input
                type="text"
                className="input-field"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bin Code</label>
              <input
                type="text"
                className="input-field"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Creating...' : 'Save Product Master'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
