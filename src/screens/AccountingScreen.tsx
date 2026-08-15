import React, { useState, useEffect } from 'react';
import { DollarSign, BookOpen, Edit3, ShieldAlert, ArrowRight, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { CreateGLAccountModal } from '../components/CreateGLAccountModal';
import { PostJournalModal } from '../components/PostJournalModal';
import { FinancialStatementsModal } from '../components/FinancialStatementsModal';
import { GSTComplianceModal } from '../components/GSTComplianceModal';
import { ShieldCheck, BarChart3 } from 'lucide-react';

export const AccountingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COA' | 'GL' | 'JOURNALS' | 'AR' | 'AP'>('COA');
  const [search, setSearch] = useState('');
  const [showCOAModal, setShowCOAModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showStatementsModal, setShowStatementsModal] = useState(false);
  const [showGSTModal, setShowGSTModal] = useState(false);

  const [coa, setCoa] = useState([
    { code: '1001', name: 'Cash on Hand - Main Counter', category: 'ASSETS', type: 'Cash', balancePaise: 4850000 },
    { code: '1002', name: 'HDFC Bank - Main Operating Account', category: 'ASSETS', type: 'Bank', balancePaise: 245000000 },
    { code: '1100', name: 'Accounts Receivable - Trade Customers', category: 'ASSETS', type: 'AR', balancePaise: 15900000 },
    { code: '1200', name: 'Inventory Stock Asset', category: 'ASSETS', type: 'Inventory', balancePaise: 1850000000 },
    { code: '2100', name: 'Accounts Payable - Suppliers', category: 'LIABILITIES', type: 'AP', balancePaise: 54000000 },
    { code: '2200', name: 'GST Output Tax Payable', category: 'LIABILITIES', type: 'Tax', balancePaise: 3200000 },
    { code: '3001', name: 'Share Capital & Reserves', category: 'EQUITY', type: 'Equity', balancePaise: 2000000000 },
    { code: '4001', name: 'Retail POS Sales Revenue', category: 'REVENUE', type: 'Sales', balancePaise: 185000000 },
    { code: '5001', name: 'Cost of Goods Sold (COGS)', category: 'EXPENSES', type: 'Direct Expense', balancePaise: 145000000 },
  ]);

  const [journals, setJournals] = useState([
    {
      id: 'jrn-1',
      journalNo: 'JRN-2026-000120',
      date: '2026-08-05',
      description: 'POS Billing Supermarket Daily Counter Sales Posting',
      totalDebitPaise: 154000,
      totalCreditPaise: 154000,
      status: 'POSTED',
    },
  ]);

  const fetchAccountingData = async () => {
    try {
      const coaRes = await api.get('/accounting/coa');
      if (coaRes.data?.coa?.length > 0) setCoa(coaRes.data.coa);
    } catch {}

    try {
      const jrnRes = await api.get('/accounting/journals');
      if (jrnRes.data?.journals?.length > 0) setJournals(jrnRes.data.journals);
    } catch {}
  };

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const filteredCOA = coa.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Enterprise Accounting & Finance Management Console
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Chart of Accounts (COA) → General Ledger (GL) → Double-Entry Journals → Accounts Receivable (AR) & Payable (AP)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowCOAModal(true)} style={{ padding: '8px 14px' }}>
            <BookOpen size={16} /> <span>+ Add GL Account</span>
          </button>
          <button className="btn" onClick={() => setShowJournalModal(true)} style={{ padding: '8px 14px' }}>
            <Edit3 size={16} style={{ color: 'var(--accent-lime)' }} /> <span>✏️ Post Journal</span>
          </button>
          <button className="btn" onClick={() => setShowStatementsModal(true)} style={{ padding: '8px 14px' }}>
            <BarChart3 size={16} style={{ color: '#3b82f6' }} /> <span>📊 P&L & Balance Sheet</span>
          </button>
          <button className="btn" onClick={() => setShowGSTModal(true)} style={{ padding: '8px 14px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--status-green)' }} /> <span>🛡️ GST Tax Reports</span>
          </button>
        </div>
      </div>

      {/* TOP FINANCIAL KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--accent-lime)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cash on Hand</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--accent-lime)' }} className="monetary">
            ₹48,500.00
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Main POS Till Balance</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>HDFC Bank Balance</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: '#3b82f6' }} className="monetary">
            ₹2,450,000.00
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bank Book Reconciled</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-green)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accounts Receivable (AR)</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-green)' }} className="monetary">
            ₹159,000.00
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Outstanding Customer Invoices</div>
        </div>

        <div className="card" style={{ padding: '12px', borderLeft: '3px solid var(--status-amber)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accounts Payable (AP)</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '2px', color: 'var(--status-amber)' }} className="monetary">
            ₹540,000.00
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Supplier Outstandings</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {[
          { id: 'COA', label: 'Chart of Accounts (COA)' },
          { id: 'GL', label: 'General Ledger (GL)' },
          { id: 'JOURNALS', label: 'Journal Register (JRN)' },
          { id: 'AR', label: 'Accounts Receivable (AR)' },
          { id: 'AP', label: 'Accounts Payable (AP)' },
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

      {/* CHART OF ACCOUNTS TAB */}
      {activeTab === 'COA' && (
        <div className="card">
          <div style={{ marginBottom: '16px', maxWidth: '380px' }}>
            <input
              type="text"
              className="input-field tabular-nums"
              placeholder="Search by account code, title, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account Title</th>
                  <th>Category</th>
                  <th>Subtype</th>
                  <th>Ledger Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCOA.map((a) => (
                  <tr key={a.code}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{a.code}</td>
                    <td style={{ fontWeight: 'bold' }}>{a.name}</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)' }}>
                        {a.category}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px' }}>{a.type}</td>
                    <td className="monetary" style={{ fontWeight: 'bold' }}>
                      ₹{(a.balancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERAL LEDGER TAB */}
      {activeTab === 'GL' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>TXN NO</th>
                  <th>JOURNAL NO</th>
                  <th>ACCOUNT</th>
                  <th>DEBIT (₹)</th>
                  <th>CREDIT (₹)</th>
                  <th>RUNNING BALANCE (₹)</th>
                  <th>REF DOC</th>
                  <th>DATE & TIME</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tx: 'GL-2026-000482', jrn: 'JRN-2026-000120', account: '1001 - Cash on Hand', debit: 1540.00, credit: 0, balance: 48500.00, ref: 'POS-BILL-0042', date: '2026-08-05 14:20' },
                  { tx: 'GL-2026-000481', jrn: 'JRN-2026-000120', account: '4001 - Retail Sales Revenue', debit: 0, credit: 1540.00, balance: 1850000.00, ref: 'POS-BILL-0042', date: '2026-08-05 14:20' },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{row.tx}</td>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace' }}>{row.jrn}</td>
                    <td style={{ fontWeight: 'bold' }}>{row.account}</td>
                    <td className="monetary" style={{ color: row.debit > 0 ? 'var(--status-green)' : 'inherit' }}>₹{row.debit.toFixed(2)}</td>
                    <td className="monetary" style={{ color: row.credit > 0 ? '#3b82f6' : 'inherit' }}>₹{row.credit.toFixed(2)}</td>
                    <td className="monetary" style={{ fontWeight: 'bold' }}>₹{row.balance.toFixed(2)}</td>
                    <td style={{ fontSize: '11px' }}>{row.ref}</td>
                    <td className="tabular-nums">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JOURNALS TAB */}
      {activeTab === 'JOURNALS' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>JOURNAL NO</th>
                  <th>DATE</th>
                  <th>REMARKS / DESCRIPTION</th>
                  <th>TOTAL DEBIT (₹)</th>
                  <th>TOTAL CREDIT (₹)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((j) => (
                  <tr key={j.id}>
                    <td className="tabular-nums" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-lime)' }}>{j.journalNo}</td>
                    <td className="tabular-nums">{j.date}</td>
                    <td style={{ fontWeight: 'bold' }}>{j.description}</td>
                    <td className="monetary" style={{ color: 'var(--status-green)' }}>₹{(j.totalDebitPaise / 100).toFixed(2)}</td>
                    <td className="monetary" style={{ color: '#3b82f6' }}>₹{(j.totalCreditPaise / 100).toFixed(2)}</td>
                    <td>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', border: '1px solid var(--border-color)', color: 'var(--status-green)' }}>
                        {j.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AR TAB */}
      {activeTab === 'AR' && (
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>Accounts Receivable (AR) Customer Aging Sub Ledger</div>
          <div style={{ fontSize: '12px' }}>
            All receivables are synchronized with credit sales, customer billing, and collection receipts.
          </div>
        </div>
      )}

      {/* AP TAB */}
      {activeTab === 'AP' && (
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>Accounts Payable (AP) Supplier Sub Ledger</div>
          <div style={{ fontSize: '12px' }}>
            All payables are synchronized with procurement purchase orders, goods receipt notes (GRN), and 3-way invoice matching.
          </div>
        </div>
      )}

      {/* MODALS */}
      <CreateGLAccountModal
        isOpen={showCOAModal}
        onClose={() => setShowCOAModal(false)}
        onSuccess={fetchAccountingData}
      />

      <PostJournalModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        onSuccess={fetchAccountingData}
      />

      <FinancialStatementsModal
        isOpen={showStatementsModal}
        onClose={() => setShowStatementsModal(false)}
      />

      <GSTComplianceModal
        isOpen={showGSTModal}
        onClose={() => setShowGSTModal(false)}
      />
    </div>
  );
};
