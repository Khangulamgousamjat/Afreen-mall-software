import React, { useState } from 'react';
import { GitBranch, Plus, Trash2, ArrowDown, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { RoleName } from '@afreen-mall/shared-types';

interface WorkflowEditorModalProps {
  onClose: () => void;
  onCreated: (workflow: any) => void;
}

const TRIGGER_EVENTS = [
  'PURCHASE_ORDER_CREATED', 'LEAVE_APPLIED', 'MANUAL_JOURNAL_POSTED',
  'PAYROLL_RUN_INITIATED', 'STOCK_ADJUSTMENT_SUBMITTED', 'SALE_RETURN_INITIATED',
  'DISCOUNT_OVERRIDE_REQUESTED', 'VOID_TRANSACTION_REQUESTED',
];
const AVAILABLE_ROLES = [
  RoleName.SUPER_ADMIN, RoleName.STORE_MANAGER, RoleName.CASH_OFFICER,
  RoleName.ACCOUNTANT, 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'HR_MANAGER',
];

interface WorkflowStep {
  stepNo: number;
  name: string;
  role: string;
  timeoutHours: number;
}

export const WorkflowEditorModal: React.FC<WorkflowEditorModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState(TRIGGER_EVENTS[0]);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { stepNo: 1, name: 'Manager Review', role: RoleName.STORE_MANAGER, timeoutHours: 24 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepNo: prev.length + 1, name: '', role: RoleName.STORE_MANAGER, timeoutHours: 24 },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNo: i + 1 })));
  };

  const updateStep = (idx: number, key: keyof WorkflowStep, value: any) => {
    setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !trigger) { setError('Workflow name and trigger event are required'); return; }
    if (steps.some((s) => !s.name || !s.role)) { setError('All steps require a name and approver role'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/admin/workflows', { name, trigger, steps });
      onCreated(res.data.workflow);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <GitBranch size={24} style={{ color: '#8b5cf6' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Workflow Editor</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Define multi-step configurable workflows. No code changes required.</div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Workflow Name *</label>
            <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Purchase Order Approval Workflow" required />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Trigger Event *</label>
            <select className="input-field" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {TRIGGER_EVENTS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {/* Visual step builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workflow Steps *</label>
              <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={addStep}>
                <Plus size={12} /> Add Step
              </button>
            </div>

            {/* Start node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
              <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '8px 16px', fontSize: '12px', color: '#10b981', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
                ▶ {trigger.replace(/_/g, ' ')} — REQUEST CREATED
              </div>

              {steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '18px', margin: '2px 0' }}>
                    <ArrowDown size={16} />
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px 12px', width: '100%', backgroundColor: 'var(--bg-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ backgroundColor: '#8b5cf6', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>
                        {step.stepNo}
                      </span>
                      <input
                        type="text"
                        className="input-field"
                        style={{ fontSize: '12px', padding: '4px 8px', flex: 1 }}
                        value={step.name}
                        onChange={(e) => updateStep(idx, 'name', e.target.value)}
                        placeholder="Step name (e.g. Manager Approval)"
                        required
                      />
                      <button type="button" onClick={() => removeStep(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }} disabled={steps.length === 1}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '28px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Approver Role</label>
                        <select className="input-field" style={{ fontSize: '11px', padding: '3px 6px' }} value={step.role} onChange={(e) => updateStep(idx, 'role', e.target.value)}>
                          {AVAILABLE_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Timeout (hours)</label>
                        <input type="number" className="input-field" style={{ fontSize: '11px', padding: '3px 6px' }} value={step.timeoutHours} onChange={(e) => updateStep(idx, 'timeoutHours', Number(e.target.value))} min="1" max="720" />
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', margin: '2px 0' }}>
                <ArrowDown size={16} />
              </div>
              <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '8px 16px', fontSize: '12px', color: '#10b981', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
                ✓ WORKFLOW COMPLETED
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckCircle2 size={15} />
              {loading ? 'Creating…' : 'Create Workflow'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
