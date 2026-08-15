import React, { useState } from 'react';
import { CheckSquare, Zap, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { RoleName } from '@afreen-mall/shared-types';

interface ApprovalRuleModalProps {
  onClose: () => void;
  onCreated: (rule: any) => void;
}

const MODULES = ['Purchase Order', 'Sale Return', 'Discount', 'Journal Entry', 'Payroll', 'Stock Adjustment', 'Leave Request', 'Void Transaction'];
const EVENTS = [
  'PURCHASE_ORDER_ABOVE', 'DISCOUNT_ABOVE_PERCENT', 'RETURN_ABOVE',
  'MANUAL_JOURNAL_ABOVE', 'PAYROLL_RUN', 'STOCK_ADJUSTMENT_ABOVE', 'LEAVE_APPLIED', 'VOID_ABOVE',
];
const APPROVER_ROLES = [
  RoleName.SUPER_ADMIN, RoleName.STORE_MANAGER, RoleName.CASH_OFFICER, RoleName.ACCOUNTANT,
  'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'HR_MANAGER',
];

export const ApprovalRuleModal: React.FC<ApprovalRuleModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    module: MODULES[0],
    event: EVENTS[0],
    threshold: '',
    approverRole: RoleName.STORE_MANAGER as string,
    escalationHours: '24',
    notifyOnEscalation: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module || !form.event || !form.approverRole) { setError('Module, event, and approver role are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/approval-rules', {
        ...form,
        threshold: Number(form.threshold) || 0,
        escalationHours: Number(form.escalationHours) || 24,
      });
      onCreated(res.data.rule);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create approval rule');
    } finally {
      setLoading(false);
    }
  };

  const formatThresholdHint = () => {
    if (form.event.includes('PERCENT')) return 'e.g. 20 (meaning >20% discount requires approval)';
    if (form.threshold && !form.event.includes('PERCENT')) return `₹${(Number(form.threshold) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    return 'Amount in paise (₹1 = 100 paise). Enter 0 for all transactions.';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Zap size={24} style={{ color: '#f59e0b' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Create Approval Rule</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Define when a business event requires manager/admin approval</div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Business Module *</label>
              <select className="input-field" value={form.module} onChange={(e) => set('module', e.target.value)}>
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Trigger Event *</label>
              <select className="input-field" value={form.event} onChange={(e) => set('event', e.target.value)}>
                {EVENTS.map((ev) => <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Threshold Value {form.event.includes('PERCENT') ? '(%)' : '(in paise)'}
            </label>
            <input
              type="number"
              className="input-field"
              value={form.threshold}
              onChange={(e) => set('threshold', e.target.value)}
              placeholder={form.event.includes('PERCENT') ? '20' : '500000 (= ₹5,000.00)'}
              min="0"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{formatThresholdHint()}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Required Approver Role *</label>
              <select className="input-field" value={form.approverRole} onChange={(e) => set('approverRole', e.target.value)}>
                {APPROVER_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Escalation Timeout (hours)</label>
              <input type="number" className="input-field" value={form.escalationHours} onChange={(e) => set('escalationHours', e.target.value)} min="1" max="168" />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input type="checkbox" checked={form.notifyOnEscalation} onChange={(e) => set('notifyOnEscalation', e.target.checked)} />
            Notify approver on escalation timeout
          </label>

          <div style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong style={{ color: '#f59e0b' }}>Rule Logic:</strong> When a {form.module} event occurs
            {form.threshold ? ` above ${form.event.includes('PERCENT') ? form.threshold + '%' : '₹' + (Number(form.threshold)/100).toLocaleString('en-IN')}` : ''},
            it will require approval from a <strong>{form.approverRole.replace(/_/g, ' ')}</strong>.
            Auto-escalates after <strong>{form.escalationHours} hours</strong>.
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckSquare size={15} />
              {loading ? 'Creating…' : 'Create Approval Rule'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
