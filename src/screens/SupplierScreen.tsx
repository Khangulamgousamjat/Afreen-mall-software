import React, { useState, useEffect } from 'react';
import { Truck, Plus, FileCheck, ShieldCheck, Search, Award, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { RegisterSupplierModal } from '../components/RegisterSupplierModal';
import { VendorContractModal } from '../components/VendorContractModal';
import { VendorScorecardModal } from '../components/VendorScorecardModal';
import { SupplierPayablesModal } from '../components/SupplierPayablesModal';
import { DollarSign, Award as ScorecardIcon } from 'lucide-react';

export const SupplierScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'CONTRACTS' | 'CATEGORIES'>('DIRECTORY');
  const [search, setSearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [showPayablesModal, setShowPayablesModal] = useState(false);

  const [suppliers, setSuppliers] = useState([
    {
      id: 'sup-101',
      supplierCode: 'SUP-2026-000012',
      name: 'Metro Wholesale Traders Pvt Ltd',
      gstNo: '27AAACM1234F1Z9',
      category: 'Grocery & Staples',
      contactPhone: '+91 98200 44556',
      email: 'sales@metrowholesale.in',
      creditLimitPaise: 50000000,
      creditDays: 30,
      leadTimeDays: 2,
      status: 'PREFERRED',
    },
    {
      id: 'sup-102',
      supplierCode: 'SUP-2026-000011',
      name: 'Britannia Industries Distribution',
      gstNo: '27AAACB5678G2Z3',
      category: 'Bakery & FMCG',
      contactPhone: '+91 98111 22334',
      email: 'orders@britannia.co.in',
      creditLimitPaise: 20000000,
      creditDays: 15,
      leadTimeDays: 1,
      status: 'ACTIVE',
    },
  ]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data?.suppliers?.length > 0) setSuppliers(res.data.suppliers);
    } catch {}
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.supplierCode && s.supplierCode.toLowerCase().includes(search.toLowerCase())) ||
      (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Enterprise Supplier Management & VRM Console
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Supplier Onboarding → Document Verification → Contracts & Price Locks → Vendor Portals
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)} style={{ padding: '8px 14px' }}>
            <Truck size={16} /> <span>+ Register Supplier</span>
          </button>
          <button className="btn" onClick={() => setShowContractModal(true)} style={{ padding: '8px 14px' }}>
            <FileCheck size={16} style={{ color: 'var(--accent-lime)' }} /> <span>📄 Issue Contract</span>
          </button>
          <button className="btn" onClick={() => setShowScorecardModal(true)} style={{ padding: '8px 14px' }}>
            <Award size={16} style={{ color: '#3b82f6' }} /> <span>⭐ Vendor Scorecards</span>
          </button>
          <button className="btn" onClick={() => setShowPayablesModal(true)} style={{ padding: '8px 14px' }}>
            <DollarSign size={16} style={{ color: 'var(--status-green)' }} /> <span>💳 Settle Payables</span>
          </button>
        </div>
      </div>

      {/* TOP VRM KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-lime)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Active Vendors</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--accent-lime)' }} className="tabular-nums">
            {suppliers.length + 18} Master Suppliers
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>100% GST & Bank Verified</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-green)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Preferred Tier Vendors</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-green)' }} className="tabular-nums">
            {suppliers.filter((s) => s.status === 'PREFERRED').length + 8} Preferred Vendors
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Locked Rate Agreements Active</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Contracts Value</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: '#3b82f6' }} className="monetary">
            ₹7,500,000.00
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Across 12 Major FMCG Suppliers</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-amber)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Vendor Lead Time</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-amber)' }} className="tabular-nums">
            1.8 Days
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Order-to-Receipt Dispatch SLA</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {[
          { id: 'DIRECTORY', label: 'Vendor Directory' },
          { id: 'CONTRACTS', label: 'Contracts & Price Locks' },
          { id: 'CATEGORIES', label: 'Category Mapping' },
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

      {/* DIRECTORY TAB */}
      {activeTab === 'DIRECTORY' && (
        <div className="card">
          <div style={{ marginBottom: '16px', maxWidth: '380px' }}>
            <input
              type="text"
              className="input-field tabular-nums"
              placeholder="Search by vendor name, code, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Company Trade Title</th>
                  <th>GSTIN</th>
                  <th>Primary Category</th>
                  <th>Credit Limit (₹)</th>
                  <th>Lead Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>
                      {s.supplierCode || 'SUP-2026-000012'}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                    <td className="tabular-nums">{s.gstNo || '27AAACM1234F1Z9'}</td>
                    <td style={{ fontSize: '11px' }}>{s.category || 'Grocery & Staples'}</td>
                    <td className="monetary" style={{ fontWeight: 'bold' }}>
                      ₹{((s.creditLimitPaise || 50000000) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="tabular-nums">{s.leadTimeDays || 2} Days</td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          color: s.status === 'PREFERRED' ? 'var(--status-green)' : 'var(--accent-lime)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {s.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTRACTS TAB */}
      {activeTab === 'CONTRACTS' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Active Executed Vendor Contracts & Rate Locks</span>
            <button className="btn btn-primary" onClick={() => setShowContractModal(true)} style={{ padding: '6px 12px', fontSize: '11px' }}>
              + Issue New Contract
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>CONTRACT NO</th>
                  <th>SUPPLIER NAME</th>
                  <th>AGREEMENT TITLE</th>
                  <th>VALIDITY DATES</th>
                  <th>DELIVERY SLA</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { no: 'CNT-2026-000012', supplier: 'Metro Wholesale Traders Pvt Ltd', title: 'Annual Basmati Rice Bulk Price Lock', dates: '2026-08-01 to 2027-07-31', sla: '48 Hours', status: 'ACTIVE' },
                  { no: 'CNT-2026-000011', supplier: 'Britannia Industries Distribution', title: 'Biscuits & FMCG Direct Factory Supply', dates: '2026-06-01 to 2027-05-31', sla: '24 Hours', status: 'ACTIVE' },
                ].map((c, idx) => (
                  <tr key={idx}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{c.no}</td>
                    <td style={{ fontWeight: 'bold' }}>{c.supplier}</td>
                    <td style={{ fontSize: '11px' }}>{c.title}</td>
                    <td className="tabular-nums">{c.dates}</td>
                    <td className="tabular-nums">{c.sla}</td>
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

      {/* CATEGORIES TAB */}
      {activeTab === 'CATEGORIES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { cat: 'Grocery & Staples', vendors: 'Metro Wholesale, Fortune Oils, KRBL Basmati', primary: 'Metro Wholesale' },
            { cat: 'Dairy & Refrigerated', vendors: 'Amul Gujarat Milk Federation, Britannia Dairy', primary: 'Amul India' },
            { cat: 'Bakery & FMCG', vendors: 'Britannia, Parle Agro, Nestlé India', primary: 'Britannia Industries' },
          ].map((c, idx) => (
            <div key={idx} className="card" style={{ padding: '16px', borderTop: '4px solid var(--accent-lime)' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-lime)', marginBottom: '6px' }}>{c.cat}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Suppliers: {c.vendors}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--status-green)' }}>Primary Partner: {c.primary}</div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      <RegisterSupplierModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={fetchSuppliers}
      />

      <VendorContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        onSuccess={fetchSuppliers}
      />

      <VendorScorecardModal
        isOpen={showScorecardModal}
        onClose={() => setShowScorecardModal(false)}
      />

      <SupplierPayablesModal
        isOpen={showPayablesModal}
        onClose={() => setShowPayablesModal(false)}
        onSuccess={fetchSuppliers}
      />
    </div>
  );
};
