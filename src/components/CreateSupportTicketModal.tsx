import React, { useState } from 'react';
import { LifeBuoy, X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreateSupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSupportTicketModal: React.FC<CreateSupportTicketModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('Ananya Deshmukh');
  const [phone, setPhone] = useState('9820011223');
  const [category, setCategory] = useState('PRODUCT_COMPLAINT');
  const [priority, setPriority] = useState('HIGH');
  const [subject, setSubject] = useState('Damaged outer seal on imported olive oil bottle');
  const [description, setDescription] = useState('Customer reported leaking bottle upon unboxing at home. Invoice AFM-2026-000042.');
  const [loading, setLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName || !phone || !subject) {
      setError('Customer Name, Phone, and Subject are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerName,
        phone,
        category,
        priority,
        subject,
        description,
      };

      const res = await api.post('/customers/tickets', payload);
      setTicketResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to log customer support ticket'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '580px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LifeBuoy size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Log Customer Support Ticket / Complaint
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

        {ticketResult && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Support Ticket {ticketResult.ticketNo} logged & assigned to Help Desk! SLA countdown started.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Full Name *</label>
              <input type="text" className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mobile Phone *</label>
              <input type="text" className="input-field tabular-nums" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Complaint Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="PRODUCT_COMPLAINT">Product Quality / Damage Complaint</option>
                <option value="BILLING_ISSUE">Billing & Payment Discrepancy</option>
                <option value="DELIVERY_DELAY">Delivery Delay / Wrong Address</option>
                <option value="REFUND_REQUEST">Refund / Credit Note Inquiry</option>
                <option value="MEMBERSHIP_ISSUE">Loyalty Points & Membership Dispute</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Priority Level</label>
              <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low (SLA 48 hrs)</option>
                <option value="MEDIUM">Medium (SLA 24 hrs)</option>
                <option value="HIGH">High (SLA 6 hrs)</option>
                <option value="CRITICAL">Critical (SLA 2 hrs)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subject Line *</label>
            <input type="text" className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Detailed Complaint Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!ticketResult} style={{ padding: '8px 20px' }}>
              {loading ? 'Logging...' : 'Issue Support Ticket & Notify Help Desk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
