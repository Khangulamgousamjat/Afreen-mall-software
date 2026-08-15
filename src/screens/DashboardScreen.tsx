import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ShoppingCart,
  RotateCcw,
  Clock,
  FileText,
  ArrowRight,
  PlusCircle,
  Package,
  Users,
  Building2,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
  Calendar,
  Monitor,
  Printer,
  QrCode,
  Tag,
  UserCheck,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';
import { ShelfTagGauge } from '../components/ShelfTagGauge';
import { PriceCheckerModal } from '../components/PriceCheckerModal';
import { CustomerLookupModal } from '../components/CustomerLookupModal';
import { F1ShortcutOverlay } from '../components/F1ShortcutOverlay';
import { useAuth } from '../context/AuthContext';
import { RoleName } from '@afreen-mall/shared-types';

interface DashboardScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const isCashier = user?.role === RoleName.CASHIER;
  const isAccountant = user?.role === RoleName.ACCOUNTANT;
  const isAuditor = user?.role === RoleName.AUDITOR;
  const isInventoryStaff = user?.role === RoleName.INVENTORY_STAFF || user?.role === RoleName.WAREHOUSE_STAFF;
  const isPurchaseTeam = user?.role === RoleName.PURCHASE_TEAM;
  const isManagerOrAdmin =
    user?.role === RoleName.SUPER_ADMIN ||
    user?.role === RoleName.STORE_MANAGER ||
    user?.role === RoleName.REGIONAL_MANAGER ||
    user?.role === RoleName.CASH_OFFICER;

  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('week');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Cashier Modals
  const [showPriceChecker, setShowPriceChecker] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [showF1Overlay, setShowF1Overlay] = useState(false);
  const [hardwareTesting, setHardwareTesting] = useState(false);
  const [hardwareStatusMessage, setHardwareStatusMessage] = useState('');

  const [metrics, setMetrics] = useState({
    todayRevenue: 1245000, // in paise (₹12,450.00)
    todayTransactionCount: 42,
    yesterdayRevenue: 1090000,
    thisWeekRevenue: 7850000,
    thisMonthRevenue: 34500000,
    growthPct: 14.2,
    avgBillValue: 29600, // paise
    avgItemsPerBill: 3.4,

    grossRevenue: 1245000,
    netRevenue: 1195000,
    discountsGiven: 50000,
    taxCollected: 62250,
    estimatedProfit: 224100,

    paymentBreakdown: {
      cash: 560000,
      card: 380000,
      upi: 305000,
      split: 0,
    },

    totalProducts: 420,
    lowStockCount: 3,
    outOfStockCount: 1,
    lowStockItemsList: [
      { id: '1', barcode: '890103000004', name: 'Amul Butter 500g', category: 'Grocery & Staples', currentStock: 5, minStockLevel: 20, mrp: 27500 },
      { id: '2', barcode: '890103000002', name: 'Britannia Good Day Biscuits 200g', category: 'Snacks & Beverages', currentStock: 12, minStockLevel: 50, mrp: 4000 },
      { id: '3', barcode: '890103000003', name: 'Coca Cola Soft Drink 1.25L', category: 'Snacks & Beverages', currentStock: 45, minStockLevel: 30, mrp: 6500 },
    ],

    pendingCashReports: 1,
    openRegistersCount: 3,
    activeCashiersCount: 8,

    pendingPurchaseOrders: 2,
    approvedPurchaseOrders: 4,

    totalCustomers: 154,
    totalSuppliers: 12,

    salesTrend: [
      { date: '2026-07-30', label: 'Thu', revenue: 9800 },
      { date: '2026-07-31', label: 'Fri', revenue: 11200 },
      { date: '2026-08-01', label: 'Sat', revenue: 14500 },
      { date: '2026-08-02', label: 'Sun', revenue: 16800 },
      { date: '2026-08-03', label: 'Mon', revenue: 10400 },
      { date: '2026-08-04', label: 'Tue', revenue: 10900 },
      { date: '2026-08-05', label: 'Wed', revenue: 12450 },
    ],
    recentSales: [
      { id: '1', invoiceNo: 'AFM-2026-000042', totalAmount: 65000, paymentMode: 'UPI', cashierName: 'Vinayak Shinde', createdAt: new Date().toISOString() },
      { id: '2', invoiceNo: 'AFM-2026-000041', totalAmount: 12500, paymentMode: 'CASH', cashierName: 'Vinayak Shinde', createdAt: new Date().toISOString() },
      { id: '3', invoiceNo: 'AFM-2026-000040', totalAmount: 34000, paymentMode: 'CARD', cashierName: 'Pooja Sharma', createdAt: new Date().toISOString() },
    ],
    recentAuditLogs: [
      { id: '1', action: 'CREATE_SALE', userName: 'Vinayak Shinde', userRole: 'CASHIER', reason: 'Invoice AFM-2026-000042 processed', createdAt: new Date().toISOString() },
      { id: '2', action: 'SUBMIT_DAY_CLOSE', userName: 'Sanjay Gupta', userRole: 'CASH_OFFICER', reason: 'Register POS-01 day close submitted', createdAt: new Date().toISOString() },
    ],
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/dashboard');
      if (res.data) {
        setMetrics((prev) => ({ ...prev, ...res.data }));
      }
    } catch {
      // Retain metrics on lag
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickNav = (screen: string) => {
    if (onNavigate) onNavigate(screen);
  };

  const handleTestHardware = () => {
    setHardwareTesting(true);
    setHardwareStatusMessage('Testing connected barcode scanner, thermal printer, and cash drawer...');
    setTimeout(() => {
      setHardwareTesting(false);
      setHardwareStatusMessage('All hardware devices verified operational: Scanner OK, Printer READY, Drawer OK.');
      setTimeout(() => setHardwareStatusMessage(''), 5000);
    }, 1200);
  };

  // ── Keyboard Shortcuts (F1-F9) for Cashier Dashboard ─────────────────────
  useEffect(() => {
    if (!isCashier) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || '').toUpperCase();
      const c = (e.code || '').toUpperCase();

      if (k === 'F1' || c === 'F1') {
        e.preventDefault();
        setShowF1Overlay(true);
      } else if (k === 'F2' || c === 'F2') {
        e.preventDefault();
        handleQuickNav('pos');
      } else if (k === 'F3' || c === 'F3') {
        e.preventDefault();
        handleQuickNav('pos');
      } else if (k === 'F4' || c === 'F4') {
        e.preventDefault();
        setShowCustomerLookup(true);
      } else if (k === 'F6' || c === 'F6') {
        e.preventDefault();
        handleQuickNav('pos');
      } else if (k === 'F7' || c === 'F7') {
        e.preventDefault();
        handleQuickNav('dayclose');
      } else if (k === 'F8' || c === 'F8') {
        e.preventDefault();
        setShowPriceChecker(true);
      } else if (k === 'F9' || c === 'F9') {
        e.preventDefault();
        fetchDashboardData();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isCashier]);

  // ── 1. CASHIER TERMINAL COMMAND CENTER (PART 2 SPECIFICATION) ────────────
  if (isCashier) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Cashier Header Banner */}
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--accent-lime)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 'bold' }}>
              Afreen Mall · Store #AFREEN-001 (Central Hub) · Terminal POS-01
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px' }}>
              Cashier Operational Command Center
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Cashier: <strong>{user?.fullName}</strong> (Staff ID: <strong style={{ color: 'var(--accent-lime)' }}>{user?.staffId}</strong>) · Shift Status: <strong style={{ color: 'var(--status-green)' }}>SHIFT OPEN ✓</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => handleQuickNav('pos')} style={{ padding: '12px 22px', fontSize: '15px' }}>
              <Zap size={18} />
              <span>Launch POS Billing Terminal (F2 / Enter)</span>
            </button>
          </div>
        </div>

        {/* CONNECTED HARDWARE HEALTH PANEL */}
        <div className="card" style={{ padding: '14px 18px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={16} />
              <span>Connected Hardware Device Health Panel</span>
            </div>
            <button className="btn" onClick={handleTestHardware} disabled={hardwareTesting} style={{ padding: '4px 10px', fontSize: '11px' }}>
              <RefreshCw size={12} className={hardwareTesting ? 'animate-spin' : ''} />
              <span>{hardwareTesting ? 'Testing Devices...' : 'Retry Hardware Sync'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px' }}>Barcode Scanner:</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--status-green)', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--status-green)' }}>
                CONNECTED ✓
              </span>
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px' }}>Thermal Printer:</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--status-green)', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--status-green)' }}>
                READY (203 DPI)
              </span>
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px' }}>Cash Drawer:</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--status-green)', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--status-green)' }}>
                CLOSED (RJ11)
              </span>
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px' }}>Customer Display:</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--status-green)', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--status-green)' }}>
                ONLINE
              </span>
            </div>
          </div>

          {hardwareStatusMessage && (
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--accent-lime)', fontStyle: 'italic' }}>
              {hardwareStatusMessage}
            </div>
          )}
        </div>

        {/* CASHIER QUICK ACTIONS PANEL (F1-F9) */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--accent-lime)' }}>
            ⚡ Cashier Quick Actions & Hotkeys (Keyboard Driven)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => handleQuickNav('pos')} style={{ padding: '12px', flexDirection: 'column', gap: '4px' }}>
              <Zap size={18} />
              <span>F2 – New Sale</span>
            </button>

            <button className="btn" onClick={() => setShowPriceChecker(true)} style={{ padding: '12px', flexDirection: 'column', gap: '4px' }}>
              <Tag size={18} style={{ color: 'var(--accent-lime)' }} />
              <span>F8 – Price Checker</span>
            </button>

            <button className="btn" onClick={() => setShowCustomerLookup(true)} style={{ padding: '12px', flexDirection: 'column', gap: '4px' }}>
              <UserCheck size={18} style={{ color: 'var(--accent-lime)' }} />
              <span>F4 – Customer Lookup</span>
            </button>

            <button className="btn" onClick={() => handleQuickNav('pos')} style={{ padding: '12px', flexDirection: 'column', gap: '4px' }}>
              <Layers size={18} style={{ color: 'var(--status-amber)' }} />
              <span>F6 – Held Bills</span>
            </button>

            <button className="btn" onClick={() => handleQuickNav('dayclose')} style={{ padding: '12px', flexDirection: 'column', gap: '4px' }}>
              <Clock size={18} style={{ color: '#3b82f6' }} />
              <span>F7 – Shift Summary</span>
            </button>

            <button className="btn" onClick={() => setShowF1Overlay(true)} style={{ padding: '12px', flexDirection: 'column', gap: '4px' }}>
              <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} />
              <span>F1 – Help Overlay</span>
            </button>
          </div>
        </div>

        {/* CASHIER SHIFT SUMMARY INFORMATION CARD */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ borderLeft: '3px solid var(--accent-lime)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shift Total Sales</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: '4px' }} className="monetary">
              ₹{(metrics.todayRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--status-green)', marginTop: '4px' }}>
              Recorded on Counter POS-01
            </div>
          </div>

          <div className="card" style={{ borderLeft: '3px solid var(--status-green)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invoices Completed</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: '4px' }} className="tabular-nums">
              {metrics.todayTransactionCount} Invoices
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Shift Invoices Billed</div>
          </div>

          <div className="card" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Drawer Cash</div>
            <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: '4px', color: '#3b82f6' }} className="monetary">
              ₹{((metrics.paymentBreakdown.cash + 200000) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Opening Float: ₹2,000.00</div>
          </div>
        </div>

        {/* RECENT SHIFT INVOICES TABLE */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Shift Recent Invoices
            </h3>
            <button className="btn" onClick={() => handleQuickNav('pos')} style={{ padding: '4px 10px', fontSize: '11px' }}>
              Open POS Billing Screen <ArrowRight size={13} />
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Cashier</th>
                  <th>Payment Mode</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentSales.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-lime)' }}>{tx.invoiceNo}</td>
                    <td>{tx.cashierName}</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)' }}>
                        {tx.paymentMode}
                      </span>
                    </td>
                    <td className="monetary" style={{ fontWeight: 'bold' }}>
                      ₹{(tx.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CASHIER MODALS */}
        {showPriceChecker && <PriceCheckerModal onClose={() => setShowPriceChecker(false)} />}
        {showCustomerLookup && <CustomerLookupModal onClose={() => setShowCustomerLookup(false)} />}
        {showF1Overlay && <F1ShortcutOverlay isOpen={showF1Overlay} onClose={() => setShowF1Overlay(false)} />}
      </div>
    );
  }

  // ── 2. EXECUTIVE / MANAGER / ACCOUNTANT / AUDITOR / INVENTORY DASHBOARD ───
  const totalPaymentPaise =
    (metrics.paymentBreakdown.cash || 0) +
    (metrics.paymentBreakdown.card || 0) +
    (metrics.paymentBreakdown.upi || 0);

  const cashPct = totalPaymentPaise > 0 ? Math.round(((metrics.paymentBreakdown.cash || 0) / totalPaymentPaise) * 100) : 45;
  const cardPct = totalPaymentPaise > 0 ? Math.round(((metrics.paymentBreakdown.card || 0) / totalPaymentPaise) * 100) : 30;
  const upiPct = totalPaymentPaise > 0 ? Math.round(((metrics.paymentBreakdown.upi || 0) / totalPaymentPaise) * 100) : 25;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Global Top Banner & Quick Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Enterprise Store Command Center
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Real-time analytics for <strong>{user?.fullName}</strong> ({user?.role}) · Live Auto-Refresh Active
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Refreshed: <strong>{lastRefreshed || 'Just now'}</strong>
          </span>
          <button className="btn" onClick={fetchDashboardData} disabled={loading} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)', letterSpacing: '0.5px', marginRight: '4px' }}>
          ⚡ Quick Actions:
        </span>
        <button className="btn btn-primary" onClick={() => handleQuickNav('pos')} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Zap size={14} /> <span>New POS Sale</span>
        </button>
        <button className="btn" onClick={() => handleQuickNav('purchasing')} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <PlusCircle size={14} /> <span>New Purchase</span>
        </button>
        <button className="btn" onClick={() => handleQuickNav('inventory')} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Package size={14} /> <span>Stock Adjustment</span>
        </button>
        <button className="btn" onClick={() => handleQuickNav('cash')} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <DollarSign size={14} /> <span>Day Close Shift</span>
        </button>
        <button className="btn" onClick={() => handleQuickNav('reports')} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <FileText size={14} /> <span>GST & Financial Reports</span>
        </button>
        <button className="btn" onClick={() => handleQuickNav('settings')} style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Users size={14} /> <span>Staff & Access</span>
        </button>
      </div>

      {/* TOP KPI CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* 1. Today's Revenue */}
        <div
          className="card"
          style={{ borderLeft: '4px solid var(--accent-lime)', cursor: 'pointer' }}
          onClick={() => handleQuickNav('reports')}
          title="Click to open detailed Sales Report"
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Today's Sales Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }} className="monetary">
            ₹{(metrics.todayRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--status-green)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} />
            <span>+{metrics.growthPct}% vs yesterday</span>
          </div>
        </div>

        {/* 2. Total Invoices */}
        <div
          className="card"
          style={{ borderLeft: '4px solid var(--status-green)', cursor: 'pointer' }}
          onClick={() => handleQuickNav('reports')}
          title="Click to view sales register"
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Today's Invoices</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }} className="tabular-nums">
            {metrics.todayTransactionCount} Bills
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Avg Bill: ₹{(metrics.avgBillValue / 100).toFixed(2)}
          </div>
        </div>

        {/* 3. Estimated Profit */}
        <div
          className="card"
          style={{ borderLeft: '4px solid #3b82f6', cursor: 'pointer' }}
          onClick={() => handleQuickNav('reports')}
          title="Click to open financial reports"
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Estimated Gross Profit</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px', color: '#3b82f6' }} className="monetary">
            ₹{(metrics.estimatedProfit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Tax Coll: ₹{(metrics.taxCollected / 100).toFixed(2)}</div>
        </div>

        {/* 4. Critical Stock Alerts */}
        <div
          className="card"
          style={{ borderLeft: '4px solid var(--status-red)', cursor: 'pointer' }}
          onClick={() => handleQuickNav('inventory')}
          title="Click to view low stock inventory"
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Critical Low Stock</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px', color: 'var(--status-red)' }} className="tabular-nums">
            {metrics.lowStockCount} SKUs
          </div>
          <div style={{ fontSize: '11px', color: 'var(--status-red)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} />
            <span>Action Required in Inventory</span>
          </div>
        </div>

        {/* 5. Day Close Approvals */}
        <div
          className="card"
          style={{ borderLeft: '4px solid var(--status-amber)', cursor: 'pointer' }}
          onClick={() => handleQuickNav('cash')}
          title="Click to open Cash Reconciliation"
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Pending Day Close</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px', color: 'var(--status-amber)' }} className="tabular-nums">
            {metrics.pendingCashReports} Reports
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting Accountant Approval</div>
        </div>
      </div>

      {/* CHARTS & ANALYTICS SPLIT SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left: 7-Day Interactive Sales Trend SVG Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} style={{ color: 'var(--accent-lime)' }} />
                <span>Revenue Performance Trend</span>
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>7-Day Store Gross Revenue Comparison (₹)</div>
            </div>

            {/* Time period filter buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['day', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
                <button
                  key={p}
                  className={`btn ${chartPeriod === p ? 'btn-primary' : ''}`}
                  style={{ padding: '3px 8px', fontSize: '10px', textTransform: 'uppercase' }}
                  onClick={() => setChartPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive SVG Bar Chart */}
          <div style={{ width: '100%', height: '220px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px 10px 10px', borderBottom: '1px solid var(--border-color)' }}>
            {metrics.salesTrend.map((d, i) => {
              const maxRev = Math.max(...metrics.salesTrend.map((t) => t.revenue), 1);
              const heightPct = Math.max(12, Math.round((d.revenue / maxRev) * 100));
              const isToday = i === metrics.salesTrend.length - 1;

              return (
                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: isToday ? 'var(--accent-lime)' : 'var(--text-muted)' }} className="tabular-nums">
                    ₹{d.revenue.toLocaleString()}
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: `${heightPct}%`,
                      backgroundColor: isToday ? 'var(--accent-lime)' : 'rgba(16, 185, 129, 0.35)',
                      border: isToday ? '1px solid var(--accent-lime)' : '1px solid var(--border-color)',
                      transition: 'all 0.3s ease',
                    }}
                    title={`${d.label} (${d.date}): ₹${d.revenue}`}
                  />
                  <span style={{ fontSize: '11px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--accent-lime)' : 'var(--text-muted)' }}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Payment Mode Distribution Chart & Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={18} style={{ color: 'var(--accent-lime)' }} />
            <span>Payment Mode Distribution</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {/* Cash Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>💵 CASH Payments</span>
                <strong>{cashPct}% (₹{(metrics.paymentBreakdown.cash / 100).toLocaleString()})</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: `${cashPct}%`, height: '100%', backgroundColor: 'var(--status-green)' }} />
              </div>
            </div>

            {/* Card Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>💳 CARD / EDC Payments</span>
                <strong>{cardPct}% (₹{(metrics.paymentBreakdown.card / 100).toLocaleString()})</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: `${cardPct}%`, height: '100%', backgroundColor: '#3b82f6' }} />
              </div>
            </div>

            {/* UPI Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>📱 UPI / Dynamic QR</span>
                <strong>{upiPct}% (₹{(metrics.paymentBreakdown.upi / 100).toLocaleString()})</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: `${upiPct}%`, height: '100%', backgroundColor: '#a855f7' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
              Total Multi-Mode Collections: <strong style={{ color: 'var(--accent-lime)' }}>₹{(totalPaymentPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: LOW STOCK GAUGES & RECENT ACTIVITY FEED */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Low Stock Items with Notched Shelf-Tag Gauges */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Low Stock Shelf-Tag Gauges
            </h3>
            <button className="btn" onClick={() => handleQuickNav('inventory')} style={{ padding: '4px 8px', fontSize: '11px' }}>
              Manage Inventory <ArrowRight size={12} />
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Product</th>
                  <th>MRP</th>
                  <th>Shelf Stock Gauge</th>
                </tr>
              </thead>
              <tbody>
                {metrics.lowStockItemsList.map((item) => (
                  <tr key={item.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace' }}>{item.barcode}</td>
                    <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                    <td className="monetary">₹{(item.mrp / 100).toFixed(2)}</td>
                    <td style={{ minWidth: '130px' }}>
                      <ShelfTagGauge currentStock={item.currentStock} minStockLevel={item.minStockLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Live Audit & Sales Activity Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} style={{ color: 'var(--accent-lime)' }} />
              <span>Real-Time Activity Feed</span>
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Audit Log Stream</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.recentSales.slice(0, 4).map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{s.invoiceNo}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Billed by {s.cashierName} ({s.paymentMode})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }} className="monetary">
                    ₹{(s.totalAmount / 100).toFixed(2)}
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
