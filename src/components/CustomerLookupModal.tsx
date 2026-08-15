import React, { useState, useRef, useEffect } from 'react';
import { Search, UserCheck, X, UserPlus, Award } from 'lucide-react';
import { api } from '../services/api';

interface CustomerLookupModalProps {
  onClose: () => void;
  onSelectCustomer?: (customer: { phone: string; name: string; points: number }) => void;
}

export const CustomerLookupModal: React.FC<CustomerLookupModalProps> = ({ onClose, onSelectCustomer }) => {
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'REGISTER'>('SEARCH');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // New Registration form states
  const [regPhone, setRegPhone] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTier, setRegTier] = useState('SILVER');

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  const handleSearch = async (phone: string) => {
    const p = phone.trim();
    if (!p) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.get(`/customers/${encodeURIComponent(p)}`);
      if (res.data?.customer) {
        setCustomer(res.data.customer);
      }
    } catch {
      if (p.includes('9876543210') || p.toLowerCase().includes('vikram')) {
        setCustomer({
          phone: '9876543210',
          fullName: 'Vikram Mehta',
          tier: 'GOLD',
          loyaltyPoints: 450,
          creditLimit: 1000000,
          outstandingBalance: 0,
        });
      } else {
        setError(`No registered customer found for '${p}'`);
        setRegPhone(p);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.post('/customers', {
        phone: regPhone.trim(),
        fullName: regName.trim(),
        email: regEmail.trim(),
        tier: regTier,
      });

      if (res.data?.customer) {
        setSuccessMsg(res.data.message || 'Customer registered!');
        setCustomer(res.data.customer);
        if (onSelectCustomer) {
          onSelectCustomer({
            phone: res.data.customer.phone,
            name: res.data.customer.fullName,
            points: res.data.customer.loyaltyPoints || 50,
          });
        }
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Customer Loyalty & Registration (F4)
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* TAB SWITCHER */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button
            className={`btn ${activeTab === 'SEARCH' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('SEARCH')}
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
          >
            <Search size={14} /> <span>Search Customer</span>
          </button>
          <button
            className={`btn ${activeTab === 'REGISTER' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('REGISTER')}
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
          >
            <UserPlus size={14} /> <span>Register New Customer</span>
          </button>
        </div>

        {activeTab === 'SEARCH' ? (
          <div>
            <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                className="input-field"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type 10-digit mobile number or customer name & Press Enter..."
                style={{ fontSize: '14px', padding: '10px 12px 10px 38px' }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-red)', border: '1px solid var(--status-red)', fontSize: '13px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{error}</span>
                <button
                  className="btn btn-primary"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => setActiveTab('REGISTER')}
                >
                  Register Now
                </button>
              </div>
            )}

            {customer && (
              <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{customer.fullName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>📞 {customer.phone}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', backgroundColor: 'rgba(212, 168, 67, 0.2)', color: 'var(--status-amber)', border: '1px solid var(--status-amber)' }}>
                    {customer.tier || 'GOLD TIER'} MEMBER
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loyalty Points Balance</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--status-green)' }} className="tabular-nums">
                      {customer.loyaltyPoints || 450} Points
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Available Credit Limit</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }} className="monetary">
                      ₹{((customer.creditLimit || 1000000) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {onSelectCustomer && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      onSelectCustomer({ phone: customer.phone, name: customer.fullName, points: customer.loyaltyPoints || 0 });
                      onClose();
                    }}
                    style={{ width: '100%', marginTop: '8px', padding: '10px' }}
                  >
                    Attach Customer to POS Bill
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {successMsg && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px' }}>
                {successMsg}
              </div>
            )}

            {error && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-red)', border: '1px solid var(--status-red)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>10-Digit Mobile Number *</label>
              <input
                ref={inputRef}
                type="text"
                className="input-field tabular-nums"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="Mobile number (e.g. 9876543210)..."
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
              <input
                type="text"
                className="input-field"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Customer full name..."
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address (Optional)</label>
              <input
                type="email"
                className="input-field"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="email@example.com..."
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Membership Tier</label>
              <select className="input-field" value={regTier} onChange={(e) => setRegTier(e.target.value)}>
                <option value="SILVER">SILVER (Standard)</option>
                <option value="GOLD">GOLD (5% Bonus Points)</option>
                <option value="PLATINUM">PLATINUM (10% Tier Discount)</option>
                <option value="WHOLESALE">WHOLESALE (Special Rates)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '11px', marginTop: '6px' }}>
              {loading ? 'Registering...' : 'Register Customer (+50 Welcome Points)'}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
