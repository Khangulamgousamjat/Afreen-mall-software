import React, { useState } from 'react';
import { Clock, X, Check, Fingerprint } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface AttendancePunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AttendancePunchModal: React.FC<AttendancePunchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [empCode, setEmpCode] = useState('EMP-2026-000101');
  const [punchType, setPunchType] = useState('CHECK_IN');
  const [deviceId, setDeviceId] = useState('BIO-POS-TERMINAL-01');
  const [remarks, setRemarks] = useState('Standard Shift Attendance Punch');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!empCode) {
      setError('Select an Employee.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        empCode,
        punchType,
        deviceId,
        remarks,
      };

      const res = await api.post('/hrms/attendance/check-in', payload);
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to record biometric attendance punch'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '520px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Log Biometric / Attendance Punch
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
            ✓ Punch {result.punchNo} logged at {result.timeStr}! Attendance record updated.
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Punch Action</label>
              <select className="input-field" value={punchType} onChange={(e) => setPunchType(e.target.value)}>
                <option value="CHECK_IN">Shift Check-In Punch</option>
                <option value="CHECK_OUT">Shift Check-Out Punch</option>
                <option value="BREAK_START">Tea / Lunch Break Start</option>
                <option value="BREAK_END">Tea / Lunch Break End</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Device ID / Reader</label>
              <input type="text" className="input-field tabular-nums" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Remarks / Location Note</label>
            <input type="text" className="input-field" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!result} style={{ padding: '8px 20px' }}>
              {loading ? 'Logging...' : 'Log Attendance Punch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
