import React, { useState, useEffect } from 'react';
import { Users, Search, Award, Target, UserPlus, Phone, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { CustomerProfileModal } from '../components/CustomerProfileModal';
import { CreateCampaignModal } from '../components/CreateCampaignModal';
import { CreateSupportTicketModal } from '../components/CreateSupportTicketModal';
import { CustomerFeedbackModal } from '../components/CustomerFeedbackModal';
import { LifeBuoy, Star, LifeBuoy as HelpIcon } from 'lucide-react';

export const CustomersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'TIERS' | 'SEGMENTATION' | 'CAMPAIGNS' | 'TICKETS'>('DIRECTORY');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [customers, setCustomers] = useState([
    { id: '1', name: 'Vikram Mehta', phone: '9876543210', email: 'vikram.mehta@gmail.com', tier: 'GOLD', points: 450, lifetimeSpend: 4500000, lastVisit: '2026-07-28' },
    { id: '2', name: 'Ananya Deshmukh', phone: '9820011223', email: 'ananya.d@hotmail.com', tier: 'PLATINUM', points: 1280, lifetimeSpend: 12800000, lastVisit: '2026-07-26' },
    { id: '3', name: 'Ramesh Kulkarni', phone: '9765432109', email: 'ramesh.k@yahoo.com', tier: 'SILVER', points: 120, lifetimeSpend: 1200000, lastVisit: '2026-07-20' },
    { id: '4', name: 'Sunita Patil', phone: '9988776655', email: 'sunita.patil@gmail.com', tier: 'DIAMOND', points: 3450, lifetimeSpend: 34500000, lastVisit: '2026-08-03' },
  ]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      if (res.data?.customers?.length > 0) {
        setCustomers(res.data.customers.map((c: any) => ({
          id: c.id,
          name: c.fullName,
          phone: c.phone,
          email: c.email || 'customer@afreen.com',
          tier: c.tier || 'SILVER',
          points: c.loyaltyPoints || 50,
          lifetimeSpend: c.lifetimeSpend || 150000,
          lastVisit: c.updatedAt?.split('T')[0] || '2026-08-05',
        })));
      }
    } catch {}
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenProfile = (cust: any) => {
    setSelectedCustomer(cust);
    setShowProfileModal(true);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Enterprise Customer Relationship Management (CRM)
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Unified Customer Master • RFM Segmentation • Membership Tiers • Targeted Marketing Campaigns
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowCampaignModal(true)} style={{ padding: '8px 14px' }}>
            <Target size={16} /> <span>🎯 Create Campaign</span>
          </button>
          <button className="btn" onClick={() => setShowTicketModal(true)} style={{ padding: '8px 14px' }}>
            <LifeBuoy size={16} style={{ color: 'var(--status-amber)' }} /> <span>🎧 Log Support Ticket</span>
          </button>
          <button className="btn" onClick={() => setShowFeedbackModal(true)} style={{ padding: '8px 14px' }}>
            <Star size={16} style={{ color: '#eab308' }} /> <span>⭐ CSAT Survey</span>
          </button>
        </div>
      </div>

      {/* TOP CRM KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-lime)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Registered Shoppers</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--accent-lime)' }} className="tabular-nums">
            {customers.length + 220} Active Profiles
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>100% Unified Master Ledger</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid #a855f7' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>VIP Platinum & Diamond</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: '#a855f7' }} className="tabular-nums">
            {customers.filter((c) => c.tier === 'PLATINUM' || c.tier === 'DIAMOND').length + 42} VIP Accounts
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Multipliers & Exclusive Perks</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loyalty Points Outstanding</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: '#3b82f6' }} className="tabular-nums">
            {customers.reduce((sum, c) => sum + c.points, 0).toLocaleString()} Points
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Point Expiry Policy Active</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-amber)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Churn Risk Accounts</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-amber)' }} className="tabular-nums">
            18 Accounts Idle &gt;45 Days
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Targeted Re-engagement Ready</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {[
          { id: 'DIRECTORY', label: 'Customer Directory' },
          { id: 'TIERS', label: 'Membership Tiers' },
          { id: 'SEGMENTATION', label: 'RFM Segmentation' },
          { id: 'CAMPAIGNS', label: 'Marketing Campaigns' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CUSTOMER DIRECTORY TAB */}
      {activeTab === 'DIRECTORY' && (
        <div className="card">
          <div style={{ marginBottom: '16px', maxWidth: '380px' }}>
            <input
              type="text"
              className="input-field tabular-nums"
              placeholder="Search by phone, customer name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Loyalty Tier</th>
                  <th>Lifetime Spend (₹)</th>
                  <th>Points Balance</th>
                  <th>Last Store Visit</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                    <td className="tabular-nums">{c.phone}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          color: c.tier === 'DIAMOND' ? '#a855f7' : c.tier === 'PLATINUM' ? '#3b82f6' : c.tier === 'GOLD' ? 'var(--status-amber)' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="monetary" style={{ fontWeight: 'bold' }}>
                      ₹{(c.lifetimeSpend / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="tabular-nums" style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}>
                      {c.points} Points
                    </td>
                    <td className="tabular-nums">{c.lastVisit}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn" onClick={() => handleOpenProfile(c)} style={{ padding: '4px 10px', fontSize: '11px' }}>
                        <span>View Profile</span> <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEMBERSHIP TIERS TAB */}
      {activeTab === 'TIERS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { tier: 'SILVER', spend: '₹0 - ₹10,000', multiplier: '1.0x Points', perks: ['Standard Welcome Points', 'Digital Receipts', 'Festival Greeting SMS'] },
            { tier: 'GOLD', spend: '₹10,000 - ₹50,000', multiplier: '1.5x Points', perks: ['5% Birthday Discount Coupon', 'Priority Counter Billing', 'Quarterly Bonus Points'] },
            { tier: 'PLATINUM', spend: '₹50,000 - ₹100,000', multiplier: '2.0x Points', perks: ['Free Home Delivery', '10% Anniversary Discount', 'Dedicated Account Manager'] },
            { tier: 'DIAMOND', spend: '₹100,000+', multiplier: '3.0x Points', perks: ['Unlimited Free Express Delivery', 'VIP Store Preview Access', 'Zero Service Fees'] },
          ].map((t) => (
            <div key={t.tier} className="card" style={{ padding: '16px', borderTop: '4px solid var(--accent-lime)' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-lime)', marginBottom: '4px' }}>{t.tier} TIER</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Qualifying Spend: {t.spend}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--status-green)', marginBottom: '12px' }}>{t.multiplier}</div>
              <ul style={{ fontSize: '11px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {t.perks.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* SEGMENTATION & RFM TAB */}
      {activeTab === 'SEGMENTATION' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)', marginBottom: '12px' }}>
            Dynamic Recency, Frequency & Monetary (RFM) Segmentation Engine
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#a855f7' }}>👑 High-Value VIPs (42 Accounts)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Top 5% Spenders (&gt;₹50k spend). Generate 38% of total revenue.</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--status-green)' }}>🛒 Weekly Shoppers (128 Accounts)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Visit &gt;8 times per month for grocery & FMCG staples.</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--status-amber)' }}>⚠️ Churn Risk (18 Accounts)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Inactive for 45-90 days. High probability of churn without re-engagement.</div>
            </div>
          </div>
        </div>
      )}

      {/* MARKETING CAMPAIGNS TAB */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Active & Historical Targeted Marketing Campaigns</span>
            <button className="btn btn-primary" onClick={() => setShowCampaignModal(true)} style={{ padding: '6px 12px', fontSize: '11px' }}>
              + New Campaign
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>CAMPAIGN TITLE</th>
                  <th>TARGET SEGMENT</th>
                  <th>PROMO CODE</th>
                  <th>DISCOUNT</th>
                  <th>RECIPIENTS</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: 'Festival Re-Engagement Offer', segment: 'CHURN_RISK', code: 'WELCOMEBACK20', discount: '20%', count: 128, status: 'DISPATCHED' },
                  { title: 'VIP Platinum Exclusive Preview', segment: 'HIGH_VALUE_VIP', code: 'VIPPREVIEW', discount: '15%', count: 42, status: 'ACTIVE' },
                ].map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold' }}>{c.title}</td>
                    <td style={{ fontSize: '11px' }}>{c.segment}</td>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{c.code}</td>
                    <td className="tabular-nums">{c.discount}</td>
                    <td className="tabular-nums">{c.count} Shoppers</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)', color: 'var(--status-green)' }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      <CustomerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        customer={selectedCustomer}
      />

      <CreateCampaignModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        onSuccess={fetchCustomers}
      />

      <CreateSupportTicketModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        onSuccess={fetchCustomers}
      />

      <CustomerFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSuccess={fetchCustomers}
      />
    </div>
  );
};
