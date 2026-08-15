import React, { useState } from 'react';
import { DollarSign, CheckCircle2, AlertTriangle, Send, Cpu, Printer, Calculator, FileText, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { DenominationBreakdown, RoleName } from '@afreen-mall/shared-types';

export const DayCloseScreen: React.FC = () => {
  const { user } = useAuth();
  const isCashier = user?.role === RoleName.CASHIER;

  const [isCloseReturn, setIsCloseReturn] = useState(false);
  const [countMethod, setCountMethod] = useState<'MANUAL' | 'BNA'>('MANUAL');

  // System Sales Totals (in Paise)
  const [systemCash] = useState(4500000); // ₹45,000.00
  const [systemCard] = useState(2200000); // ₹22,000.00
  const [systemUPI] = useState(1800000);  // ₹18,000.00

  // BNA Machine Cash Input State
  const [bnaSlipNumber, setBnaSlipNumber] = useState('BNA-SLIP-20260728-8841');
  const [bnaAmountInput, setBnaAmountInput] = useState('0'); // ₹0 default

  // Physical Denomination Count (Manual Mode)
  const [denominations, setDenominations] = useState<DenominationBreakdown>({
    d2000: 5,  // ₹10,000
    d500: 60,  // ₹30,000
    d200: 20,  // ₹4,000
    d100: 8,   // ₹800
    d50: 3,    // ₹150
    d20: 2,    // ₹40
    d10: 1,    // ₹10
    d5: 0,
    d2: 0,
    d1: 0,
  });

  const [submitted, setSubmitted] = useState(false);

  // Compute Total Physical Cash & BNA Cash in Paise
  const manualCountedCash =
    denominations.d2000 * 200000 +
    denominations.d500 * 50000 +
    denominations.d200 * 20000 +
    denominations.d100 * 10000 +
    denominations.d50 * 5000 +
    denominations.d20 * 2000 +
    denominations.d10 * 1000 +
    denominations.d5 * 500 +
    denominations.d2 * 200 +
    denominations.d1 * 100;

  const bnaCountedCash = Math.round((parseFloat(bnaAmountInput) || 0) * 100);

  // Total Cash = Physical Notes Cash + BNA Machine Cash
  const totalShiftCashCount = manualCountedCash + bnaCountedCash;
  const countedCash = countMethod === 'BNA' ? bnaCountedCash : totalShiftCashCount;
  const variance = countedCash - systemCash; // paise
  const totalShiftSales = systemCash + systemCard + systemUPI;

  const handleDenominationChange = (key: keyof DenominationBreakdown, val: string) => {
    const num = parseInt(val, 10) || 0;
    setDenominations((prev) => ({ ...prev, [key]: num }));
  };

  const handleSimulateBNAScan = () => {
    setBnaAmountInput('45000');
    setBnaSlipNumber(`BNA-SLIP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSubmitClose = async () => {
    try {
      await api.post('/cash/day-close', {
        registerId: 'reg-01',
        systemCash,
        systemCard,
        systemUPI,
        countedCash,
        denominations,
        useBNACount: countMethod === 'BNA',
        bnaDepositAmount: bnaCountedCash,
        bnaSlipNumber: bnaSlipNumber,
        isCloseReturn,
      });
      setSubmitted(true);
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Failed to submit Day Close report'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Cashier End-of-Shift Day Close
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Physical note-by-note count or BNA Machine Auto-Count Slip deposit
        </div>
      </div>

      {/* Top Action Controls: Close Type & Count Method */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`btn ${!isCloseReturn ? 'btn-primary' : ''}`}
            onClick={() => setIsCloseReturn(false)}
          >
            CLOSE SALE
          </button>
          <button
            className={`btn ${isCloseReturn ? 'btn-primary' : ''}`}
            onClick={() => setIsCloseReturn(true)}
            style={{ backgroundColor: isCloseReturn ? 'var(--status-red)' : undefined }}
          >
            CLOSE SALE RETURN
          </button>
        </div>

        {/* Count Method Selector (Manual vs BNA Machine) */}
        <div style={{ display: 'flex', gap: '8px', border: '1px solid var(--border-color)', padding: '4px', backgroundColor: 'var(--surface-color)' }}>
          <button
            className={`btn ${countMethod === 'MANUAL' ? 'btn-primary' : ''}`}
            onClick={() => setCountMethod('MANUAL')}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <Calculator size={14} />
            <span>Manual Note Count</span>
          </button>
          <button
            className={`btn ${countMethod === 'BNA' ? 'btn-primary' : ''}`}
            onClick={() => setCountMethod('BNA')}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <Cpu size={14} />
            <span>BNA Machine Auto-Count & Slip</span>
          </button>
        </div>
      </div>

      {submitted ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center', border: '1px solid var(--accent-lime)' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--accent-lime)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 'bold' }}>
            Day Close Submitted via {countMethod === 'BNA' ? 'BNA Machine Deposit Slip' : 'Manual Note Count'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Counted cash of ₹{(countedCash / 100).toFixed(2)} {bnaCountedCash > 0 ? `(BNA Machine Cash: ₹${(bnaCountedCash / 100).toFixed(2)})` : ''} has been recorded and routed to Cash Officer for verification.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
          {/* Method 1: Manual Denomination Counter */}
          {countMethod === 'MANUAL' && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px' }}>
                Physical Note-by-Note Denomination & BNA Cash Count
              </h3>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Denomination Note / Machine</th>
                      <th>Count (Pcs / Input)</th>
                      <th>Subtotal Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'd2000', label: '₹2000 Note', multiplier: 2000 },
                      { key: 'd500', label: '₹500 Note', multiplier: 500 },
                      { key: 'd200', label: '₹200 Note', multiplier: 200 },
                      { key: 'd100', label: '₹100 Note', multiplier: 100 },
                      { key: 'd50', label: '₹50 Note', multiplier: 50 },
                      { key: 'd20', label: '₹20 Note / Coin', multiplier: 20 },
                      { key: 'd10', label: '₹10 Note / Coin', multiplier: 10 },
                      { key: 'd5', label: '₹5 Coin', multiplier: 5 },
                      { key: 'd2', label: '₹2 Coin', multiplier: 2 },
                      { key: 'd1', label: '₹1 Coin', multiplier: 1 },
                    ].map((row) => {
                      const count = denominations[row.key as keyof DenominationBreakdown];
                      const subtotal = count * row.multiplier;
                      return (
                        <tr key={row.key}>
                          <td style={{ fontWeight: 'bold' }}>{row.label}</td>
                          <td style={{ width: '140px' }}>
                            <input
                              type="number"
                              className="input-field tabular-nums"
                              value={count || ''}
                              onChange={(e) => handleDenominationChange(row.key as keyof DenominationBreakdown, e.target.value)}
                              min={0}
                            />
                          </td>
                          <td className="monetary" style={{ fontWeight: 'bold' }}>
                            ₹{subtotal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Integrated BNA Cash Amount Input Row */}
                    <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderTop: '2px solid var(--accent-lime)' }}>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}>
                        🏦 BNA Machine Deposited Cash Amount
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input-field tabular-nums"
                          style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}
                          value={bnaAmountInput}
                          onChange={(e) => setBnaAmountInput(e.target.value)}
                          placeholder="Amount in ₹"
                          min={0}
                        />
                      </td>
                      <td className="monetary" style={{ fontWeight: 'bold', color: 'var(--accent-lime)' }}>
                        ₹{(bnaCountedCash / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Method 2: BNA Machine Auto-Count & Slip Deposit */}
          {countMethod === 'BNA' && (
            <div className="card" style={{ border: '1px solid var(--accent-lime)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Cpu size={24} style={{ color: 'var(--accent-lime)' }} />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    BNA Machine Auto-Count & Printed Deposit Slip
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Insert all physical drawer cash into the Bank Note Acceptor (BNA) machine.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-color)', padding: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn btn-primary" onClick={handleSimulateBNAScan} style={{ fontSize: '12px' }}>
                    <Printer size={14} />
                    <span>Scan / Read BNA Machine Printout Slip</span>
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--status-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> BNA Hardware Ready
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    BNA Slip Receipt / Batch No.
                  </label>
                  <input
                    type="text"
                    className="input-field tabular-nums"
                    value={bnaSlipNumber}
                    onChange={(e) => setBnaSlipNumber(e.target.value)}
                    placeholder="e.g. BNA-SLIP-20260728-8841"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    BNA Machine Counted Total Cash Deposit (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field tabular-nums"
                    style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-lime)' }}
                    value={bnaAmountInput}
                    onChange={(e) => setBnaAmountInput(e.target.value)}
                  />
                </div>

                <div style={{ padding: '10px', backgroundColor: 'rgba(228,253,151,0.08)', border: '1px dashed var(--accent-lime)', fontSize: '12px' }}>
                  <strong>BNA Printout Verification:</strong> All banknotes counted by BNA optical sensors. Printed receipt total will be locked into the authoritative day close record.
                </div>
              </div>
            </div>
          )}

          {/* Right Side Payment Mode Breakdown & Shift Close Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '14px' }}>
                Shift Payment Mode Breakdown
              </h3>

              {/* Complete Payment Mode Summary Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>💵 Counter Notes Cash:</span>
                  <strong className="monetary">₹{(manualCountedCash / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏦 BNA Machine Cash:</span>
                  <strong className="monetary" style={{ color: 'var(--accent-lime)' }}>₹{(bnaCountedCash / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                  <span>Total Physical / BNA Cash:</span>
                  <strong className="monetary" style={{ color: 'var(--accent-lime)' }}>₹{(countedCash / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>💳 Card Sales Total:</span>
                  <strong className="monetary">₹{(systemCard / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>📱 UPI Sales Total:</span>
                  <strong className="monetary">₹{(systemUPI / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '8px', fontSize: '14px' }}>
                  <span style={{ fontWeight: 'bold' }}>Total Shift Collection:</span>
                  <strong className="monetary" style={{ color: 'var(--accent-lime)', fontSize: '16px' }}>
                    ₹{(totalShiftSales / 100).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* CASH VARIANCE STATUS CONTROL: HIDE FOR CASHIERS (BLIND CASH CLOSE) */}
              {isCashier ? (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: 'var(--text-main)',
                    textAlign: 'center',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Lock size={12} />
                    <span>Blind Shift Close Active</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                    Cash count submitted blindly to Cash Officer for audit sign-off
                  </div>
                </div>
              ) : (
                /* Authorized Officers (Cash Officer, Manager, Admin, Accountant) view full Cash Variance Status */
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: variance === 0 ? 'rgba(74,222,128,0.1)' : variance < 0 ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                    border: `1px solid ${variance === 0 ? 'var(--status-green)' : variance < 0 ? 'var(--status-red)' : 'var(--status-amber)'}`,
                    color: variance === 0 ? 'var(--status-green)' : variance < 0 ? 'var(--status-red)' : 'var(--status-amber)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', textTransform: 'uppercase' }}>Cash Variance Status (Officer Audit View)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }} className="monetary">
                    {variance === 0 ? 'EXACT MATCH (₹0.00)' : variance < 0 ? `SHORT (-₹${(Math.abs(variance) / 100).toFixed(2)})` : `EXCESS (+₹${(variance / 100).toFixed(2)})`}
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handleSubmitClose} style={{ padding: '14px', fontSize: '15px' }}>
              <Send size={16} />
              <span>Close Sale & Send to Cash Officer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
