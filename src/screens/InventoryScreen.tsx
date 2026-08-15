import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, AlertCircle, Edit3, Tag, Building2, Warehouse, RefreshCw, Truck, PackageCheck, FileText } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { ShelfTagGauge } from '../components/ShelfTagGauge';
import { AddProductModal } from '../components/AddProductModal';
import { BarcodeLabelModal } from '../components/BarcodeLabelModal';
import { StockTransferModal } from '../components/StockTransferModal';
import { RepackingModal } from '../components/RepackingModal';
import { StockLedgerModal } from '../components/StockLedgerModal';
import { ReorderSuggestionsModal } from '../components/ReorderSuggestionsModal';
import { InventoryAnalyticsModal } from '../components/InventoryAnalyticsModal';
import { ShoppingBag, BarChart3 } from 'lucide-react';

export const InventoryScreen: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeWarehouse, setActiveWarehouse] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRepackModal, setShowRepackModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newStock, setNewStock] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([
    { id: '1', barcode: '890103000001', name: 'Afreen Premium Basmati Rice 5kg', category: 'Grocery & Staples', currentStock: 80, minStockLevel: 25, mrp: 65000, saleRate: 59000, unit: 'KG', warehouse: 'Main Warehouse', rack: 'RACK-A1', bin: 'BIN-01' },
    { id: '2', barcode: '890103000002', name: 'Britannia Good Day Biscuits 200g', category: 'Snacks & Beverages', currentStock: 12, minStockLevel: 50, mrp: 4000, saleRate: 3600, unit: 'PCS', warehouse: 'Store Floor', rack: 'RACK-B2', bin: 'BIN-14' },
    { id: '3', barcode: '890103000003', name: 'Coca Cola Soft Drink 1.25L', category: 'Snacks & Beverages', currentStock: 45, minStockLevel: 30, mrp: 6500, saleRate: 6000, unit: 'PCS', warehouse: 'Store Floor', rack: 'RACK-C1', bin: 'BIN-08' },
    { id: '4', barcode: '890103000004', name: 'Amul Butter 500g', category: 'Grocery & Staples', currentStock: 5, minStockLevel: 20, mrp: 27500, saleRate: 26000, unit: 'PCS', warehouse: 'Cold Storage', rack: 'COLD-01', bin: 'BIN-02' },
  ]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory');
      if (res.data?.inventory?.length > 0) setProducts(res.data.inventory);
    } catch {
      // Retain fallback catalogue
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q) || (p.rack && p.rack.toLowerCase().includes(q));
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesWh = activeWarehouse === 'ALL' || (p.warehouse || 'Main Warehouse') === activeWarehouse;
    return matchesSearch && matchesCat && matchesWh;
  });

  const handleProductCreated = (newProd: any) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleAdjustStock = async () => {
    if (!newStock || !adjustReason) {
      alert('New stock level and mandatory adjustment reason are required.');
      return;
    }

    try {
      await api.post('/inventory/adjust', {
        inventoryId: selectedProduct.id,
        newStock: parseInt(newStock),
        reason: adjustReason,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, currentStock: parseInt(newStock) } : p))
      );
      alert(`Stock for ${selectedProduct.name} updated to ${newStock}. Audit log recorded.`);
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to adjust stock level'));
    } finally {
      setShowAdjustModal(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Global Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Inventory Command Center & Warehouse Master
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Product catalogue master, multi-warehouse location tracking, shelf-tag stock gauges & barcode label generator
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '8px 14px' }}>
            <Plus size={16} /> <span>+ Create Product</span>
          </button>
          <button className="btn" onClick={() => setShowReorderModal(true)} style={{ padding: '8px 14px' }}>
            <ShoppingBag size={16} style={{ color: 'var(--status-amber)' }} /> <span>⚡ Auto Reorder</span>
          </button>
          <button className="btn" onClick={() => setShowAnalyticsModal(true)} style={{ padding: '8px 14px' }}>
            <BarChart3 size={16} style={{ color: '#3b82f6' }} /> <span>📊 ABC Analytics</span>
          </button>
          <button className="btn" onClick={() => setShowTransferModal(true)} style={{ padding: '8px 14px' }}>
            <Truck size={16} style={{ color: '#3b82f6' }} /> <span>🚚 Transfer Stock</span>
          </button>
          <button className="btn" onClick={() => setShowRepackModal(true)} style={{ padding: '8px 14px' }}>
            <PackageCheck size={16} style={{ color: 'var(--status-amber)' }} /> <span>🔄 Bulk Repacking</span>
          </button>
          <button className="btn" onClick={() => setShowLedgerModal(true)} style={{ padding: '8px 14px' }}>
            <FileText size={16} style={{ color: 'var(--accent-lime)' }} /> <span>📋 Stock Ledger</span>
          </button>
          <button className="btn" onClick={() => setShowBarcodeModal(true)} style={{ padding: '8px 14px' }}>
            <Tag size={16} style={{ color: 'var(--text-muted)' }} /> <span>🏷️ Barcode Labels</span>
          </button>
        </div>
      </div>

      {/* MULTI-WAREHOUSE LOCATION TABS */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {[
          { id: 'ALL', label: 'All Warehouses & Locations' },
          { id: 'Main Warehouse', label: 'Main Warehouse' },
          { id: 'Store Floor', label: 'Store Floor' },
          { id: 'Cold Storage', label: 'Cold Storage' },
          { id: 'Damage Store', label: 'Damage Store' },
        ].map((w) => (
          <button
            key={w.id}
            className={`btn ${activeWarehouse === w.id ? 'btn-primary' : ''}`}
            onClick={() => setActiveWarehouse(w.id)}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by Barcode, Product Name, SKU, or Rack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field"
          style={{ width: '220px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          <option value="Grocery & Staples">Grocery & Staples</option>
          <option value="Snacks & Beverages">Snacks & Beverages</option>
          <option value="Dairy & Frozen Foods">Dairy & Frozen Foods</option>
          <option value="Personal Care & Cosmetics">Personal Care & Cosmetics</option>
        </select>

        <button className="btn" onClick={fetchInventory} disabled={loading} style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Products Directory Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product Master Name</th>
                <th>Category</th>
                <th>Warehouse / Location</th>
                <th>MRP (₹)</th>
                <th>Selling Price (₹)</th>
                <th>Shelf Stock Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No products found matching "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{item.barcode}</td>
                    <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.category}</td>
                    <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      <strong>{item.warehouse || 'Main Warehouse'}</strong> · {item.rack || 'A-01'}
                    </td>
                    <td className="monetary">₹{(item.mrp / 100).toFixed(2)}</td>
                    <td className="monetary" style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}>
                      ₹{(item.saleRate / 100).toFixed(2)}
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <ShelfTagGauge currentStock={item.currentStock} minStockLevel={item.minStockLevel} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => {
                          setSelectedProduct(item);
                          setNewStock(String(item.currentStock));
                          setShowAdjustModal(true);
                        }}
                      >
                        <Edit3 size={12} /> <span>Adjust Stock</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleProductCreated}
      />

      <BarcodeLabelModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        products={products}
      />

      <StockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        products={products}
        onSuccess={fetchInventory}
      />

      <RepackingModal
        isOpen={showRepackModal}
        onClose={() => setShowRepackModal(false)}
        products={products}
        onSuccess={fetchInventory}
      />

      <StockLedgerModal
        isOpen={showLedgerModal}
        onClose={() => setShowLedgerModal(false)}
      />

      <ReorderSuggestionsModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
      />

      <InventoryAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
      />

      {/* STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay" style={{ zIndex: 1400 }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', textTransform: 'uppercase' }}>
              Stock Adjustment — {selectedProduct.name}
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Current Inventory Count</label>
              <input type="text" className="input-field tabular-nums" value={`${selectedProduct.currentStock} ${selectedProduct.unit || 'PCS'}`} disabled />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>New Physical Stock Level *</label>
              <input
                type="number"
                className="input-field tabular-nums"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Enter physical count..."
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mandatory Audit Reason *</label>
              <select className="input-field" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                <option value="">Select reason...</option>
                <option value="Physical Stock Take Correction">Physical Stock Take Correction</option>
                <option value="Damaged / Expired Item Write-off">Damaged / Expired Item Write-off</option>
                <option value="Supplier Shipment Variance">Supplier Shipment Variance</option>
                <option value="Sample / Internal Consumption">Sample / Internal Consumption</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn" onClick={() => setShowAdjustModal(false)} style={{ padding: '6px 14px' }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAdjustStock} style={{ padding: '6px 16px' }}>
                Save Adjustment & Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
