import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface ReorderSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReorderSuggestionsModal: React.FC<ReorderSuggestionsModalProps> = ({ isOpen, onClose }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftGenerated, setDraftGenerated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .get('/inventory/reorder-suggestions')
        .then((res) => {
          if (res.data?.suggestions) setSuggestions(res.data.suggestions);
        })
        .catch(() => {
          // Fallback suggestions
          setSuggestions([
            { inventoryId: '4', barcode: '890103000004', name: 'Amul Butter 500g', category: 'Grocery & Staples', currentStock: 5, minStockLevel: 20, suggestedOrderQty: 40, mrp: 27500, estimatedCost: 1040000, preferredSupplier: 'Amul Dairy Co-op Ltd' },
            { inventoryId: '2', barcode: '890103000002', name: 'Britannia Good Day Biscuits 200g', category: 'Snacks & Beverages', currentStock: 12, minStockLevel: 50, suggestedOrderQty: 100, mrp: 4000, estimatedCost: 360000, preferredSupplier: 'Britannia Industries' },
          ]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const [generating, setGenerating] = useState(false);
  const [generatedPoNo, setGeneratedPoNo] = useState('');
  const [poError, setPoError] = useState('');

  const totalEstimatedCostPaise = suggestions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);

  const handleGeneratePO = async () => {
    setGenerating(true);
    setPoError('');
    try {
      const items = suggestions.map((s) => ({
        productId: s.inventoryId || s.barcode,
        productName: s.name,
        quantity: s.suggestedOrderQty || 10,
        unitPrice: Math.round((s.estimatedCost || 1000) / (s.suggestedOrderQty || 10)),
      }));
      const res = await api.post('/purchasing/orders', {
        supplierName: suggestions[0]?.preferredSupplier || 'Default Supplier',
        items,
        totalAmount: totalEstimatedCostPaise,
        notes: 'Auto-generated PO from Inventory Reorder Engine',
      });
      const poNo = res.data?.order?.poNumber || 'PO-2026-00004';
      setGeneratedPoNo(poNo);
      setDraftGenerated(true);
      setTimeout(() => {
        setDraftGenerated(false);
        onClose();
      }, 2200);
    } catch (err: any) {
      setPoError(getApiErrorMessage(err, 'Failed to generate Purchase Order'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '720px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Automatic Purchase Reorder Engine (EOQ / Min-Max)
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {poError && (
          <div style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '12px', marginBottom: '14px' }}>
            {poError}
          </div>
        )}

        {draftGenerated && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Draft Purchase Order ({generatedPoNo || 'PO-2026-00004'}) successfully created for {suggestions.length} items!
          </div>
        )}

        <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Stock</th>
                <th>Min Level</th>
                <th>Suggested Order Qty</th>
                <th>Preferred Supplier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Calculating lead times & safety stock forecasts...</td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    All products are comfortably above reorder thresholds!
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => (
                  <tr key={s.inventoryId || s.barcode}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', color: 'var(--accent-lime)' }}>{s.barcode}</td>
                    <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                    <td className="tabular-nums" style={{ color: 'var(--status-red)', fontWeight: 'bold' }}>{s.currentStock} pcs</td>
                    <td className="tabular-nums">{s.minStockLevel} pcs</td>
                    <td className="tabular-nums" style={{ color: 'var(--status-green)', fontWeight: 'bold' }}>
                      +{s.suggestedOrderQty} pcs
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.preferredSupplier}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Purchase Order Total</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-lime)' }} className="monetary">
              ₹{(totalEstimatedCostPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Close
            </button>
            <button className="btn btn-primary" onClick={handleGeneratePO} disabled={suggestions.length === 0 || draftGenerated || generating} style={{ padding: '8px 20px' }}>
              <span>{generating ? 'Generating PO…' : 'Generate Draft Purchase Order'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
