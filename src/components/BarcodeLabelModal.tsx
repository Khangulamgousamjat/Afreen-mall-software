import React, { useState } from 'react';
import { Tag, Printer, X, Check } from 'lucide-react';
import { api } from '../services/api';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ isOpen, onClose, products }) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [labelQuantity, setLabelQuantity] = useState<number>(10);
  const [labelFormat, setLabelFormat] = useState<'THERMAL_80MM' | 'THERMAL_58MM' | 'A4_STICKERS'>('THERMAL_80MM');

  if (!isOpen) return null;

  const product = products.find((p) => p.id === selectedProductId) || products[0] || {
    barcode: '890103000001',
    name: 'Afreen Premium Basmati Rice 5kg',
    mrp: 65000,
    saleRate: 59000,
    category: 'Grocery',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="modal-content" style={{ maxWidth: '600px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Retail Shelf-Tag Barcode Label Generator
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Select Product Target
            </label>
            <select
              className="input-field"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.barcode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Label Print Format
            </label>
            <select
              className="input-field"
              value={labelFormat}
              onChange={(e) => setLabelFormat(e.target.value as any)}
            >
              <option value="THERMAL_80MM">Thermal Roll (80mm Shelf-Tag)</option>
              <option value="THERMAL_58MM">Thermal Roll (58mm Compact)</option>
              <option value="A4_STICKERS">A4 Sticker Sheet (24 Labels/Page)</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Quantity of Labels to Print
          </label>
          <input
            type="number"
            className="input-field tabular-nums"
            value={labelQuantity}
            onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: '140px' }}
          />
        </div>

        {/* LABEL PRINT PREVIEW CARD */}
        <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)', marginBottom: '10px' }}>
            Live Shelf-Tag Preview (Single Label)
          </div>

          <div
            style={{
              width: labelFormat === 'THERMAL_58MM' ? '220px' : '280px',
              padding: '12px',
              backgroundColor: '#ffffff',
              color: '#000000',
              border: '2px dashed #000000',
              borderRadius: '4px',
              margin: '0 auto',
              textAlign: 'center',
              fontFamily: 'sans-serif',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
              AFREEN MALL
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', lineHeight: 1.2, margin: '4px 0' }}>
              {product.name}
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>
              CAT: {product.category || 'GROCERY'}
            </div>

            {/* Simulated Barcode Lines */}
            <div style={{ margin: '8px 0', padding: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '18px', letterSpacing: '3px', fontWeight: 'bold' }}>
                |||| || ||| |||| | |||
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>
                *{product.barcode}*
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'baseline', marginTop: '6px', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>MRP: </span>
                <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#666' }}>₹{(product.mrp / 100).toFixed(2)}</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#000' }}>OUR PRICE: </span>
                <strong style={{ fontSize: '15px', fontWeight: 'bold' }}>₹{(product.saleRate / 100).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={async () => {
              try {
                const res = await api.post(
                  '/catalog/barcodes/pdf',
                  { productId: product.id, quantity: labelQuantity, labelFormat },
                  { responseType: 'blob', timeout: 3000 }
                );
                if (res.data) {
                  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `barcode_labels_${product.barcode || 'sheet'}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  return;
                }
              } catch {}

              const { downloadPDFReport } = require('../services/exportHelper');
              const rows: string[][] = [];
              for (let i = 1; i <= labelQuantity; i++) {
                rows.push([`Label #${i}`, product.name, product.barcode || '890103000001', `MRP: ₹${((product.mrp || 65000) / 100).toFixed(2)}`, `SALE: ₹${((product.saleRate || 59000) / 100).toFixed(2)}`]);
              }
              downloadPDFReport({
                title: `Barcode Sticker Sheet (${product.name})`,
                subtitle: `Total Labels: ${labelQuantity} | Format: ${labelFormat}`,
                filename: `barcode_labels_${product.barcode || 'sheet'}`,
                headers: ['Sticker Index', 'Product Description', 'EAN-13 Barcode', 'MRP (₹)', 'Offer Price (₹)'],
                rows,
              });
            }}
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--accent-lime)' }}
          >
            <span>Download PDF Sheet (A4)</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={16} />
            <span>Print {labelQuantity} Labels</span>
          </button>
        </div>
      </div>
    </div>
  );
};
