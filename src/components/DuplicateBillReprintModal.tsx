import React, { useState, useEffect, useRef } from 'react';
import { Copy, AlertTriangle, ShieldAlert, X, Printer, Search, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleName } from '@afreen-mall/shared-types';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface DuplicateBillReprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: any, receiptPrintContent: string) => void;
  lastInvoiceNo?: string;
}

export const DuplicateBillReprintModal: React.FC<DuplicateBillReprintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lastInvoiceNo,
}) => {
  const { user } = useAuth();
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [reason, setReason] = useState('Paper Jam / Printer Error');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || '').toUpperCase();
      const c = (e.code || '').toUpperCase();

      if (k === 'ESCAPE' || c === 'ESCAPE') {
        e.preventDefault(); e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setInvoiceNo(lastInvoiceNo || '');
      setReason('Paper Jam / Printer Error');
      setCustomReason('');
      setTimeout(() => invoiceInputRef.current?.focus(), 100);
    }
  }, [isOpen, lastInvoiceNo]);

  if (!isOpen) return null;

  // Role authorization: Cash Officer or higher
  const allowedRoles = [
    RoleName.CASH_OFFICER,
    RoleName.STORE_MANAGER,
    RoleName.REGIONAL_MANAGER,
    RoleName.SUPER_ADMIN,
    RoleName.ACCOUNTANT,
    RoleName.AUDITOR,
  ];

  const isAuthorized = Boolean(user && (allowedRoles as readonly string[]).includes(user.role));
  const finalReason = reason === 'Other' ? customReason.trim() : reason;
  const isFormValid = invoiceNo.trim().length >= 4 && (reason !== 'Other' || customReason.trim().length >= 3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('Access Denied: Duplicate bill printing requires Cash Officer or Manager authorization.');
      return;
    }
    if (!invoiceNo.trim()) {
      setError('Please enter an Invoice Number.');
      return;
    }

    const cleanInvoiceNo = invoiceNo.trim();

    try {
      setLoading(true);
      setError('');

      const res = await api.post('/pos/reprint-duplicate', {
        invoiceNo: cleanInvoiceNo,
        reason: finalReason,
      });

      if (res.data?.receiptPrintContent) {
        onSuccess(res.data.invoice, res.data.receiptPrintContent);
        onClose();
      } else {
        throw new Error('Failed to prepare duplicate receipt');
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to reprint duplicate bill'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1150 }}>
      <div ref={containerRef} className="modal-content" tabIndex={-1} style={{ maxWidth: '500px', width: '100%', borderRadius: '12px', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
              <Copy size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Print Duplicate Bill</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shortcut: Ctrl + F5 · Authorized Supervisor Access Only</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Role Access Restriction Notice */}
        {!isAuthorized ? (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', marginBottom: '6px' }}>
              <ShieldAlert size={20} />
              <span>Access Denied (Supervisor Restriction)</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Original bills print strictly once upon payment completion. Duplicate bill printing is restricted to <strong>Cash Officer</strong>, <strong>Manager</strong>, or <strong>Super Admin</strong> authorization.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card-hover)', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #eab308' }}>
              Reprinted receipts automatically feature a prominent <strong>*** DUPLICATE COPY ***</strong> watermark and are logged in the audit trail.
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(248, 113, 113, 0.12)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Invoice Number Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Invoice Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {lastInvoiceNo && (
                  <button
                    type="button"
                    onClick={() => setInvoiceNo(lastInvoiceNo)}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={12} />
                    <span>Use Last Invoice ({lastInvoiceNo})</span>
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  ref={invoiceInputRef}
                  type="text"
                  className="input-field"
                  value={invoiceNo}
                  onChange={(e) => {
                    setInvoiceNo(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. INV-20260803-0001"
                  required
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '14px', textTransform: 'uppercase' }}
                />
              </div>
            </div>

            {/* Reason Dropdown */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Reason for Duplicate Print <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="Paper Jam / Printer Error">Paper Jam / Printer Error</option>
                <option value="Customer Copy Request">Customer Copy Request</option>
                <option value="Low Ink / Blank Print">Low Ink / Blank Print</option>
                <option value="Printer Disconnect / Failure">Printer Disconnect / Failure</option>
                <option value="Damaged Original Receipt">Damaged Original Receipt</option>
                <option value="Other">Other Reason...</option>
              </select>
            </div>

            {reason === 'Other' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Specify Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter detailed reason for duplicate reprint..."
                  required
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
                style={{ padding: '10px 18px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!isFormValid || loading}
                style={{
                  padding: '10px 20px',
                  minWidth: '160px',
                  backgroundColor: '#eab308',
                  borderColor: '#ca8a04',
                  color: '#000',
                  fontWeight: 'bold',
                  opacity: isFormValid && !loading ? 1 : 0.6,
                }}
              >
                <Printer size={16} style={{ marginRight: '6px' }} />
                {loading ? 'Preparing Reprint...' : 'Print Duplicate Bill'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
