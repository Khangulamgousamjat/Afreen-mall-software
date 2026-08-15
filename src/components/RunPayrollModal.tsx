import React, { useState } from 'react';
import { DollarSign, X, Check, FileText, Landmark } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface RunPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RunPayrollModal: React.FC<RunPayrollModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [monthYear, setMonthYear] = useState('2026-08');
  const [remarks, setRemarks] = useState('Monthly Store Staff Salary Batch Execution');
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!monthYear) {
      setError('Payroll Month (YYYY-MM) is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        monthYear,
        remarks,
      };

      const res = await api.post('/hrms/payroll/run', payload);
      setBatch(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to run payroll batch'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '540px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Run Monthly Payroll & Statutory PF/ESIC Batch
            </h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', border: '1px solid var(--status-red)', fontSize: '12px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {batch && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Payroll Batch {batch.batchNo} executed! Payslips generated and posted to GL.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Payroll Month (YYYY-MM) *</label>
            <input type="month" className="input-field tabular-nums" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} required />
          </div>

          <div style={{ backgroundColor: 'var(--bg-color)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-lime)', marginBottom: '6px' }}>Statutory Rules Enforced:</div>
            <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--text-muted)', fontSize: '11px' }}>
              <li>Provident Fund (PF): 12% on Basic Salary</li>
              <li>ESIC Employee Contribution: 0.75% on Gross Salary (&lt; ₹21k)</li>
              <li>Overtime Computation: 1.5x Hourly Rate automatically applied</li>
              <li>GL Posting: Auto-debits Salary Expense & credits Bank/Payable</li>
            </ul>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Batch Remarks / Notes</label>
            <input type="text" className="input-field" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!batch} style={{ padding: '8px 20px' }}>
              {loading ? 'Processing...' : 'Run Payroll Batch & Generate Payslips'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
