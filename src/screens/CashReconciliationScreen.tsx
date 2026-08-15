import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, AlertTriangle, ShieldCheck, Edit3, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { RoleName } from '@afreen-mall/shared-types';

export const CashReconciliationScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'OFFICER' | 'MANAGER'>('OFFICER');

  // Cash Officer Handover Rows
  const [handovers] = useState([
    { pos: 'POS-01', cashier: 'Amit Verma (300003)', systemCash: 4500000, countedCash: 2500000, bnaDeposit: 2000000, bnaSlip: 'BNA-9921', totalCash: 4500000, variance: 0, status: 'MATCHED' },
    { pos: 'POS-02', cashier: 'Pooja Sharma (300007)', systemCash: 3200000, countedCash: 1150000, bnaDeposit: 2000000, bnaSlip: 'BNA-9922', totalCash: 3150000, variance: -50000, status: 'SHORT' },
    { pos: 'POS-03', cashier: 'Rohan Gupta (300008)', systemCash: 5100000, countedCash: 2120000, bnaDeposit: 3000000, bnaSlip: 'BNA-9923', totalCash: 5120000, variance: 20000, status: 'EXCESS' },
  ]);

  // Manager Reconciliation Form State
  const [posNumber, setPosNumber] = useState('POS-01');
  const [cashOfficerName, setCashOfficerName] = useState('Sanjay Gupta (300004)');
  const [bnaDeposit, setBnaDeposit] = useState('45000'); // ₹45,000.00
  const [upiTotal, setUpiTotal] = useState('18000');    // ₹18,000.00
  const [cardTotal, setCardTotal] = useState('22000');   // ₹22,000.00
  const [systemTotalSales] = useState(8500000);         // ₹85,000.00

  // Accountant Approval Banner State
  const [accountantApproved, setAccountantApproved] = useState(false);

  // Manager Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [newBnaValue, setNewBnaValue] = useState('');

  const isManagerOrAccountant =
    user?.role === RoleName.STORE_MANAGER ||
    user?.role === RoleName.ACCOUNTANT ||
    user?.role === RoleName.SUPER_ADMIN;

  const [activeReport, setActiveReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchReports = async () => {
    try {
      setReportLoading(true);
      const res = await api.get('/cash/reports');
      if (res.data?.reports && Array.isArray(res.data.reports) && res.data.reports.length > 0) {
        const latest = res.data.reports[0];
        setActiveReport(latest);
        setAccountantApproved(latest.accountantApproved || false);
        if (latest.bnaReportedAmount) setBnaDeposit((latest.bnaReportedAmount / 100).toString());
        if (latest.cardTotal) setCardTotal((latest.cardTotal / 100).toString());
        if (latest.upiTotal) setUpiTotal((latest.upiTotal / 100).toString());
      }
    } catch {
      // Fallback
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const isAccountantRole =
    user?.role === RoleName.ACCOUNTANT || user?.role === RoleName.SUPER_ADMIN;

  const calculatedBnaPaise = Math.round((parseFloat(bnaDeposit) || 0) * 100);
  const calculatedUpiPaise = Math.round((parseFloat(upiTotal) || 0) * 100);
  const calculatedCardPaise = Math.round((parseFloat(cardTotal) || 0) * 100);
  const finalVariance = calculatedBnaPaise + calculatedUpiPaise + calculatedCardPaise - systemTotalSales;

  const handleAccountantApprove = async () => {
    if (!activeReport?.id) {
      alert('Please save a Manager Cash Report before approving consolidated close.');
      return;
    }
    setActionError('');
    try {
      await api.post(`/cash/manager-report/${activeReport.id}/approve`);
      setAccountantApproved(true);
      await fetchReports();
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Failed to approve consolidated day close report'));
    }
  };

  const handleSaveReport = async () => {
    setActionError('');
    try {
      const res = await api.post('/cash/manager-report', {
        posNumber,
        cashOfficerName,
        bnaReportedAmount: calculatedBnaPaise,
        cashTotal: calculatedBnaPaise,
        upiTotal: calculatedUpiPaise,
        cardTotal: calculatedCardPaise,
        systemTotalSales,
      });
      if (res.data?.report) {
        setActiveReport(res.data.report);
      }
      alert('Manager Cash Reconciliation Report submitted successfully!');
      await fetchReports();
    } catch (err: any) {
      setActionError(getApiErrorMessage(err, 'Failed to save Manager Cash Report'));
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideReason.trim()) {
      alert('A mandatory reason is required for modifying closing report values.');
      return;
    }
    if (!activeReport?.id) {
      alert('No saved report found to override. Please save a report first.');
      return;
    }
    setActionError('');
    try {
      const res = await api.patch(`/cash/report/${activeReport.id}/override`, {
        bnaReportedAmount: Math.round((parseFloat(newBnaValue) || 0) * 100),
        reason: overrideReason,
      });
      if (res.data?.report) {
        setActiveReport(res.data.report);
      }
      alert(`Closing report updated to ₹${newBnaValue}. Immutably logged to Audit Trail.`);
      setShowOverrideModal(false);
      setOverrideReason('');
      await fetchReports();
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to edit closing report'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Multi-Tier Cash Reconciliation & BNA Handover
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          POS sales vs cash officer collections vs Bank Note Acceptor (BNA) machine deposit reports
        </div>
      </div>

      {/* Accountant Day Close Approval Banner */}
      <div
        className="card"
        style={{
          borderLeft: `4px solid ${accountantApproved ? 'var(--status-green)' : 'var(--status-amber)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ShieldCheck size={28} style={{ color: accountantApproved ? 'var(--status-green)' : 'var(--status-amber)' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
              Day-End Sales & Cash Consolidated Approval (Accountant Role Action)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {accountantApproved
                ? `Approved by ${user?.fullName} · Day is officially closed.`
                : 'Consolidated report ready for Accountant review and official sign-off.'}
            </div>
          </div>
        </div>
        {isAccountantRole && !accountantApproved && (
          <button className="btn btn-primary" onClick={handleAccountantApprove}>
            Approve Consolidated Close
          </button>
        )}
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          className={`btn ${activeTab === 'OFFICER' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('OFFICER')}
        >
          1. CASH OFFICER HANDOVER VIEW
        </button>
        <button
          className={`btn ${activeTab === 'MANAGER' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('MANAGER')}
        >
          2. MANAGER CASH COLLECTION & BNA REPORT
        </button>
      </div>

      {/* Tab 1: Cash Officer Handover View */}
      {activeTab === 'OFFICER' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Registers Handover Summary (Today)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>3 Registers Active</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>POS Register</th>
                  <th>Cashier</th>
                  <th>System Cash (₹)</th>
                  <th>Counter Cash (₹)</th>
                  <th>BNA Machine Cash (₹)</th>
                  <th>BNA Slip #</th>
                  <th>Total Cash Sales (₹)</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map((h, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{h.pos}</td>
                    <td>{h.cashier}</td>
                    <td className="monetary">₹{(h.systemCash / 100).toFixed(2)}</td>
                    <td className="monetary">₹{(h.countedCash / 100).toFixed(2)}</td>
                    <td className="monetary" style={{ color: '#10b981', fontWeight: 'bold' }}>₹{(h.bnaDeposit / 100).toFixed(2)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{h.bnaSlip}</td>
                    <td className="monetary" style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}>₹{(h.totalCash / 100).toFixed(2)}</td>
                    <td className="monetary" style={{ color: h.variance < 0 ? 'var(--status-red)' : h.variance > 0 ? 'var(--status-amber)' : 'var(--status-green)' }}>
                      ₹{(h.variance / 100).toFixed(2)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: h.status === 'MATCHED' ? 'rgba(74,222,128,0.1)' : h.status === 'SHORT' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                          color: h.status === 'MATCHED' ? 'var(--status-green)' : h.status === 'SHORT' ? 'var(--status-red)' : 'var(--status-amber)',
                        }}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Manager Cash Collection & BNA Report */}
      {activeTab === 'MANAGER' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Manager Daily Cash & BNA Machine Entry Form
              </h3>

              {/* Correcting Mistakes Override Button (Manager / Accountant / Super Admin Only) */}
              {isManagerOrAccountant ? (
                <button className="btn" onClick={() => setShowOverrideModal(true)} style={{ fontSize: '12px', padding: '4px 10px' }}>
                  <Edit3 size={14} />
                  <span>Correct Mistake (Override)</span>
                </button>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} />
                  <span>Edits Restricted to Manager / Accountant</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Select POS Register
                </label>
                <select className="input-field" value={posNumber} onChange={(e) => setPosNumber(e.target.value)}>
                  <option value="POS-01">POS-01 (Main Counter)</option>
                  <option value="POS-02">POS-02 (Express Counter)</option>
                  <option value="POS-03">POS-03 (Bulk Counter)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Cash Officer Name
                </label>
                <input type="text" className="input-field" value={cashOfficerName} readOnly />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  BNA Machine Deposit Amount (₹)
                </label>
                <input
                  type="number"
                  className="input-field tabular-nums"
                  value={bnaDeposit}
                  onChange={(e) => setBnaDeposit(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Card Terminal Total (₹)
                </label>
                <input
                  type="number"
                  className="input-field tabular-nums"
                  value={cardTotal}
                  onChange={(e) => setCardTotal(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  UPI Total (₹)
                </label>
                <input
                  type="number"
                  className="input-field tabular-nums"
                  value={upiTotal}
                  onChange={(e) => setUpiTotal(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={handleSaveReport}>
                Save Authoritative Cash Report
              </button>
            </div>
          </div>

          {/* Manager Final Short/Excess Calculation Panel */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px' }}>
              Final Short / Excess Calculation
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>POS Recorded Total Sales:</span>
                <strong className="monetary">₹{(systemTotalSales / 100).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>BNA Deposit Amount:</span>
                <strong className="monetary">₹{parseFloat(bnaDeposit || '0').toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Card Terminal Total:</span>
                <strong className="monetary">₹{parseFloat(cardTotal || '0').toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>UPI Total:</span>
                <strong className="monetary">₹{parseFloat(upiTotal || '0').toFixed(2)}</strong>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: finalVariance === 0 ? 'rgba(74,222,128,0.1)' : finalVariance < 0 ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                  border: `1px solid ${finalVariance === 0 ? 'var(--status-green)' : finalVariance < 0 ? 'var(--status-red)' : 'var(--status-amber)'}`,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', textTransform: 'uppercase' }}>Authoritative Final Variance</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }} className="monetary">
                  {finalVariance === 0
                    ? 'EXACT MATCH (₹0.00)'
                    : finalVariance < 0
                    ? `SHORT (-₹${(Math.abs(finalVariance) / 100).toFixed(2)})`
                    : `EXCESS (+₹${(finalVariance / 100).toFixed(2)})`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Correcting Mistakes Modal with Mandatory Audit Reason */}
      {showOverrideModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              Override / Edit Submitted Closing Report
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Restricted Action (Store Manager / Accountant / Super Admin). Every edit is immutably logged to AuditLogs with full before/after snapshots and required reason.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Corrected BNA Deposit Amount (₹)
                </label>
                <input
                  type="number"
                  className="input-field tabular-nums"
                  value={newBnaValue}
                  onChange={(e) => setNewBnaValue(e.target.value)}
                  placeholder="Enter corrected amount"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Mandatory Override Reason *
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State precise operational reason for correcting closing report..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" onClick={handleSaveOverride} style={{ flex: 1 }}>
                  Save & Log to Audit Trail
                </button>
                <button className="btn" onClick={() => setShowOverrideModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
