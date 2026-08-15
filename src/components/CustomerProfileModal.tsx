import React from 'react';
import { UserCheck, X, ShieldAlert, Award, Clock, DollarSign, Phone, Mail, MapPin } from 'lucide-react';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ isOpen, onClose, customer }) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '680px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              360-Degree Unified Customer Master Profile
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* HEADER CUSTOMER CARD */}
        <div style={{ padding: '14px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{customer.name || customer.fullName}</h2>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span><Phone size={12} /> {customer.phone}</span>
                <span><Mail size={12} /> {customer.email || 'customer@afreen.com'}</span>
              </div>
            </div>

            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '4px',
                fontWeight: 'bold',
                backgroundColor: customer.tier === 'PLATINUM' ? 'rgba(168,85,247,0.15)' : 'rgba(234,179,8,0.15)',
                color: customer.tier === 'PLATINUM' ? '#a855f7' : 'var(--status-amber)',
                border: '1px solid var(--border-color)',
              }}
            >
              👑 {customer.tier || 'SILVER'} MEMBER
            </span>
          </div>
        </div>

        {/* METRICS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div className="card" style={{ padding: '10px', borderLeft: '3px solid var(--accent-lime)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifetime Spend</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }} className="monetary">
              ₹{((customer.lifetimeSpend || 1280000) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="card" style={{ padding: '10px', borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loyalty Points Balance</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: '#3b82f6' }} className="tabular-nums">
              {customer.points || 450} Points
            </div>
          </div>

          <div className="card" style={{ padding: '10px', borderLeft: '3px solid var(--status-green)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credit Limit Available</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-green)' }} className="monetary">
              ₹50,000.00
            </div>
          </div>
        </div>

        {/* 360 INTERACTION TIMELINE */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)', marginBottom: '10px' }}>
            360-Degree Interaction & Purchase History Timeline
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {[
              { date: '2026-08-05 14:20', type: 'PURCHASE', desc: 'POS Supermarket Billing AFM-2026-000042 (₹1,420.00) · +14 Points Earned' },
              { date: '2026-08-01 11:15', type: 'CAMPAIGN', desc: 'Received SMS Campaign "FESTIVAL20" Coupon (10% Discount)' },
              { date: '2026-07-28 17:45', type: 'PURCHASE', desc: 'POS Supermarket Billing AFM-2026-000018 (₹3,250.00) · +32 Points Earned' },
              { date: '2026-07-15 09:30', type: 'TIER_UPGRADE', desc: 'Upgraded to PLATINUM Tier (Lifetime Spend exceeded ₹10,000)' },
            ].map((t, idx) => (
              <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ color: 'var(--accent-lime)', marginRight: '6px' }}>[{t.type}]</strong>
                  <span>{t.desc}</span>
                </div>
                <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>{t.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
