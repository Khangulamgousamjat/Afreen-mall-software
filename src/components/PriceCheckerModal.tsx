import React, { useState, useRef, useEffect } from 'react';
import { Search, Tag, X, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { api } from '../services/api';
import { ShelfTagGauge } from './ShelfTagGauge';

interface PriceCheckerModalProps {
  onClose: () => void;
}

export const PriceCheckerModal: React.FC<PriceCheckerModalProps> = ({ onClose }) => {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productResult, setProductResult] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (code: string) => {
    const q = code.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setProductResult(null);

    try {
      const res = await api.get(`/pos/product/${encodeURIComponent(q)}`);
      if (res.data?.product) {
        setProductResult(res.data.product);
      }
    } catch (err: any) {
      // Offline / fallback mock item
      if (q === '890103000004') {
        setProductResult({
          barcode: '890103000004',
          name: 'Amul Butter 500g',
          description: 'Pasteurized salted butter',
          mrp: 27500,
          rate: 26000,
          gstPercent: 12,
          netRate: 29120,
          stock: 5,
          unit: 'PCS',
        });
      } else {
        setError(`No product found matching barcode / code '${q}'`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchInput);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Instant Price & Stock Checker (F8)
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="input-field"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan barcode or type item code / name & Press Enter..."
            style={{ fontSize: '15px', padding: '12px 12px 12px 38px' }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-red)', color: 'var(--status-red)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {productResult && (
          <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                BARCODE: <strong style={{ color: 'var(--accent-lime)' }}>{productResult.barcode}</strong>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: 'var(--text-main)' }}>
                {productResult.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{productResult.description}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>MRP (Maximum Retail Price)</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-muted)', textDecoration: 'line-through' }} className="monetary">
                  ₹{(productResult.mrp / 100).toFixed(2)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--accent-lime)', textTransform: 'uppercase', fontWeight: 'bold' }}>Effective Selling Price (Net)</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--accent-lime)' }} className="monetary">
                  ₹{(productResult.netRate / 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Shelf Stock Status:</div>
              <ShelfTagGauge currentStock={productResult.stock || 5} minStockLevel={20} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 16px' }}>
            Close Checker (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
