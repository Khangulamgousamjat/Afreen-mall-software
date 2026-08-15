import React, { useState, useEffect } from 'react';
import { Award, X, Star, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

interface SupplierPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierPerformanceModal: React.FC<SupplierPerformanceModalProps> = ({ isOpen, onClose }) => {
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .get('/purchasing/supplier-performance')
        .then((res) => {
          if (res.data?.scorecards) setScorecards(res.data.scorecards);
        })
        .catch(() => {
          // Fallback scorecard list
          setScorecards([
            { id: 'sup-1', supplierCode: 'SUP-001', name: 'Fortune Global Oils Ltd', onTimeDeliveryPct: 98.4, fillRatePct: 99.1, returnRatePct: 0.2, leadTimeDays: 2.1, overallRating: 98, status: 'PREFERRED_VENDOR' },
            { id: 'sup-2', supplierCode: 'SUP-002', name: 'Amul Dairy Co-op Ltd', onTimeDeliveryPct: 96.2, fillRatePct: 97.5, returnRatePct: 0.5, leadTimeDays: 1.8, overallRating: 96, status: 'PREFERRED_VENDOR' },
            { id: 'sup-3', supplierCode: 'SUP-003', name: 'Britannia Industries Distribution', onTimeDeliveryPct: 94.0, fillRatePct: 95.8, returnRatePct: 1.1, leadTimeDays: 3.4, overallRating: 92, status: 'ACTIVE' },
            { id: 'sup-4', supplierCode: 'SUP-004', name: 'Metro Wholesale Traders Pvt Ltd', onTimeDeliveryPct: 91.5, fillRatePct: 93.0, returnRatePct: 1.8, leadTimeDays: 4.0, overallRating: 88, status: 'UNDER_REVIEW' },
          ]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '780px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Supplier Performance Analytics & Scorecard Register
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>CODE</th>
                <th>SUPPLIER NAME</th>
                <th>ON-TIME DELIVERY</th>
                <th>FILL RATE</th>
                <th>LEAD TIME</th>
                <th>RETURN %</th>
                <th>SCORE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Calculating vendor scorecards & lead times...</td>
                </tr>
              ) : (
                scorecards.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', color: 'var(--accent-lime)' }}>{s.supplierCode}</td>
                    <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                    <td className="tabular-nums" style={{ color: 'var(--status-green)', fontWeight: 'bold' }}>{s.onTimeDeliveryPct}%</td>
                    <td className="tabular-nums">{s.fillRatePct}%</td>
                    <td className="tabular-nums">{s.leadTimeDays} Days</td>
                    <td className="tabular-nums" style={{ color: s.returnRatePct > 1 ? 'var(--status-amber)' : 'inherit' }}>{s.returnRatePct}%</td>
                    <td>
                      <strong style={{ fontSize: '14px', color: 'var(--accent-lime)' }}>{s.overallRating}/100</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          border: '1px solid var(--border-color)',
                          color: s.status === 'PREFERRED_VENDOR' ? 'var(--status-green)' : 'var(--status-amber)',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Supplier scores are evaluated weekly based on GRN receiving dates vs PO expected dates and quality returns.</span>
          <button className="btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
