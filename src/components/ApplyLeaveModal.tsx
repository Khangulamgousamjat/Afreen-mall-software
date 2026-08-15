import React, { useState } from 'react';
import { Calendar, X, Check, FileText } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [empCode, setEmpCode] = useState('EMP-2026-000101');
  const [leaveType, setLeaveType] = useState('CASUAL_LEAVE');
  const [startDate, setStartDate] = useState('2026-08-10');
  const [endDate, setEndDate] = useState('2026-08-12');
  const [reason, setReason] = useState('Personal family event');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!empCode || !startDate || !endDate) {
      setError('Employee Code, Start Date, and End Date are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        empCode,
        leaveType,
        startDate,
        endDate,
        reason,
      };

      const res = await api.post('/hrms/leaves', payload);
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to submit leave application'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '520px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Employee Leave Application
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

        {result && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Leave Application {result.leaveNo} submitted! Pending HR approval.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Employee *</label>
            <select className="input-field" value={empCode} onChange={(e) => setEmpCode(e.target.value)}>
              <option value="EMP-2026-000101">EMP-2026-000101 - Rahul Sharma (Senior Cashier)</option>
              <option value="EMP-2026-000102">EMP-2026-000102 - Ayesha Khan (Store Manager)</option>
              <option value="EMP-2026-000103">EMP-2026-000103 - Vikram Singh (Inventory Executive)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Leave Category / Type</label>
            <select className="input-field" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="CASUAL_LEAVE">Casual Leave (CL)</option>
              <option value="SICK_LEAVE">Sick Leave (SL)</option>
              <option value="EARNED_LEAVE">Earned Leave (EL / Privilege)</option>
              <option value="MATERNITY">Maternity / Paternity Leave</option>
              <option value="UNPAID">Unpaid Leave (LWP)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Date *</label>
              <input type="date" className="input-field tabular-nums" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Date *</label>
              <input type="date" className="input-field tabular-nums" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reason / Remarks</label>
            <input type="text" className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!result} style={{ padding: '8px 20px' }}>
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
