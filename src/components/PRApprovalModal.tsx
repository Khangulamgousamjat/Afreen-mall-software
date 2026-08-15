import React, { useState } from 'react';
import { CheckCircle2, XCircle, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface PRApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  pr: any;
  onSuccess: () => void;
}

export const PRApprovalModal: React.FC<PRApprovalModalProps> = ({ isOpen, onClose, pr, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !pr) return null;

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/purchasing/requisitions/${pr.id}/approve`, { action, notes });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to process PR approval action'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1400 }}>
      <div className="modal-content" style={{ maxWidth: '580px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Manager Review — Requisition {pr.prNumber}
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

        <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '10px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Requested By: </span>
              <strong>{pr.requestedBy}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Department: </span>
              <strong>{pr.department}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Priority: </span>
              <strong style={{ color: 'var(--status-amber)' }}>{pr.priority}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Required Date: </span>
              <strong>{pr.requiredDate}</strong>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
            <strong>Justification: </strong> {pr.justification}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)', marginBottom: '8px' }}>
            Requisition Items List
          </div>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '6px' }}>Product</th>
                <th style={{ textAlign: 'right', padding: '6px' }}>Requested Qty</th>
                <th style={{ textAlign: 'right', padding: '6px' }}>Est. Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {pr.items?.map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>{item.productName}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }} className="tabular-nums">{item.requestedQty} pcs</td>
                  <td style={{ padding: '6px', textAlign: 'right' }} className="monetary">₹{(item.estimatedCost / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Approval / Rejection Audit Remarks</label>
          <input
            type="text"
            className="input-field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add manager review notes..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn" onClick={() => handleAction('REJECT')} disabled={loading} style={{ padding: '8px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', border: '1px solid var(--status-red)' }}>
            <XCircle size={16} /> <span>Reject Requisition</span>
          </button>
          <button className="btn btn-primary" onClick={() => handleAction('APPROVE')} disabled={loading} style={{ padding: '8px 20px' }}>
            <CheckCircle2 size={16} /> <span>Approve Requisition</span>
          </button>
        </div>
      </div>
    </div>
  );
};
