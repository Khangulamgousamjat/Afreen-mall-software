import React, { useState, useEffect } from 'react';
import { Layers, Search, X, Play, RefreshCw, Server } from 'lucide-react';
import { api } from '../services/api';

interface HeldBill {
  id: string;
  holdNo: string;
  registerId?: string;
  registerName?: string;
  customerPhone?: string;
  customerName?: string;
  items: any[];
  totalAmountPaise?: number;
  totalAmount?: number;
  cashierName: string;
  createdAt: string;
  notes?: string;
}

interface HeldBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecallBill: (heldBill: HeldBill) => void;
}

export const HeldBillsModal: React.FC<HeldBillsModalProps> = ({ isOpen, onClose, onRecallBill }) => {
  const [heldList, setHeldList] = useState<HeldBill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const fetchHeldBills = async () => {
    setLoading(true);
    setIsOfflineMode(false);
    try {
      const res = await api.get('/pos/held-bills');
      if (res.data?.heldBills && Array.isArray(res.data.heldBills)) {
        setHeldList(res.data.heldBills);
      }
    } catch {
      // Fallback to local storage if offline
      setIsOfflineMode(true);
      try {
        const saved = localStorage.getItem('afreen_held_bills');
        if (saved) setHeldList(JSON.parse(saved));
      } catch {
        setHeldList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHeldBills();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = heldList.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      h.holdNo.toLowerCase().includes(q) ||
      (h.registerName && h.registerName.toLowerCase().includes(q)) ||
      (h.customerName && h.customerName.toLowerCase().includes(q)) ||
      (h.customerPhone && h.customerPhone.includes(q)) ||
      (h.cashierName && h.cashierName.toLowerCase().includes(q))
    );
  });

  const handleRecall = async (bill: HeldBill) => {
    try {
      await api.delete(`/pos/held-bills/${bill.id}`);
    } catch {
      // Remove from local storage list fallback
      const updated = heldList.filter((b) => b.id !== bill.id);
      localStorage.setItem('afreen_held_bills', JSON.stringify(updated));
    }
    onRecallBill(bill);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1300 }}>
      <div className="modal-content" style={{ maxWidth: '740px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Store-Wide Held Bills Registry (F5)
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isOfflineMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
            border: `1px solid ${isOfflineMode ? '#ef4444' : 'var(--accent-lime)'}`,
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            color: isOfflineMode ? '#ef4444' : 'var(--accent-lime)',
            marginBottom: '14px',
          }}
        >
          <Server size={14} />
          <span>
            {isOfflineMode ? (
              <strong>⚠️ STANDALONE OFFLINE MODE:</strong>
            ) : (
              <strong>STORE-WIDE MULTI-TERMINAL SYNC ACTIVE:</strong>
            )}
            {' '}
            {isOfflineMode
              ? 'Network unreachable. Displaying bills held locally on this terminal. Central multi-terminal sync will resume automatically when online.'
              : 'Held bills are stored centrally on PostgreSQL and synced across all store POS registers in real time.'}
          </span>
        </div>

        <div style={{ position: 'relative', width: '100%', marginBottom: '14px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search held bill by Hold ID, Terminal, Customer Phone, Name, or Cashier..."
            style={{ fontSize: '14px', padding: '10px 12px 10px 38px' }}
            autoFocus
          />
        </div>

        <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>HOLD ID</th>
                <th>TERMINAL</th>
                <th>TIME</th>
                <th>CASHIER</th>
                <th>CUSTOMER</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={16} className="spin" style={{ display: 'inline', marginRight: '6px' }} /> Syncing store-wide held bills…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No active held bills matching "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const amountPaise = b.totalAmountPaise ?? b.totalAmount ?? 0;
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-lime)' }}>{b.holdNo}</td>
                      <td style={{ fontSize: '12px', fontWeight: '500', color: 'var(--accent-cyan)' }}>
                        {b.registerName || b.registerId || 'Till-01'}
                      </td>
                      <td style={{ fontSize: '12px' }}>{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ fontSize: '12px' }}>{b.cashierName}</td>
                      <td>{b.customerName || b.customerPhone || 'Walk-in'}</td>
                      <td className="tabular-nums">{b.items.length} items</td>
                      <td className="monetary" style={{ fontWeight: 'bold' }}>
                        ₹{(amountPaise / 100).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-primary" onClick={() => handleRecall(b)} style={{ padding: '3px 10px', fontSize: '11px' }}>
                          <Play size={12} /> <span>Recall Bill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Centralized PostgreSQL Store Sync</span>
          <button className="btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
