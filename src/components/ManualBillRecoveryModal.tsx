import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, X, CreditCard, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PaymentMode, RoleName } from '@afreen-mall/shared-types';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ManualBillRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: any, receiptPrintContent: string) => void;
  defaultAmountRupees?: number;
}

export const ManualBillRecoveryModal: React.FC<ManualBillRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultAmountRupees = 0,
}) => {
  const { user } = useAuth();
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);

  const [transactionId, setTransactionId] = useState('');
  const [amountRupees, setAmountRupees] = useState<string>(
    defaultAmountRupees > 0 ? defaultAmountRupees.toString() : ''
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CARD);
  const [error, setError] = useState('');
  const [checkingTx, setCheckingTx] = useState(false);
  const [loading, setLoading] = useState(false);
  const txnInputRef = useRef<HTMLInputElement>(null);

  // Escape Key dismissal & Numpad Enter key handling
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
      setTransactionId('');
      setAmountRupees(defaultAmountRupees > 0 ? defaultAmountRupees.toString() : '');
      setPaymentMode(PaymentMode.CARD);
      setTimeout(() => txnInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultAmountRupees]);

  if (!isOpen) return null;

  // Authorization check: Cash Officer or higher
  const allowedRoles = [
    RoleName.CASH_OFFICER,
    RoleName.STORE_MANAGER,
    RoleName.REGIONAL_MANAGER,
    RoleName.SUPER_ADMIN,
    RoleName.ACCOUNTANT,
    RoleName.AUDITOR,
  ];

  const isAuthorized = Boolean(user && (allowedRoles as readonly string[]).includes(user.role));

  const numAmount = parseFloat(amountRupees);
  const isValidAmount = !isNaN(numAmount) && numAmount > 0;
  const isValidTxId = transactionId.trim().length >= 3;
  const isFormValid = isValidAmount && isValidTxId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('Access Restricted: Cash Officer authorization required for manual bill recovery.');
      return;
    }
    if (!isValidTxId) {
      setError('Please enter a valid Transaction ID.');
      return;
    }
    if (!isValidAmount) {
      setError('Amount paid must be greater than ₹0.');
      return;
    }

    const cleanTxId = transactionId.trim();
    const amountPaise = Math.round(numAmount * 100);

    try {
      setLoading(true);
      setError('');

      // Check duplicate Transaction ID first
      try {
        const checkRes = await api.get(`/pos/check-transaction-id/${encodeURIComponent(cleanTxId)}`);
        if (checkRes.data?.exists) {
          setError(checkRes.data.message || `Transaction ID '${cleanTxId}' was already used for bill ${checkRes.data.invoiceNo}.`);
          setLoading(false);
          return;
        }
      } catch {
        // If check API is unavailable, proceed to post endpoint validation
      }

      // Submit recovery request
      const res = await api.post('/pos/recover-bill', {
        transactionId: cleanTxId,
        amount: amountPaise,
        paymentMode,
      });

      if (res.data?.invoice) {
        onSuccess(res.data.invoice, res.data.receiptPrintContent);
        onClose();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Manual bill recovery failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div ref={containerRef} className="modal-content" tabIndex={-1} style={{ maxWidth: '520px', width: '100%', borderRadius: '12px', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <RefreshCw size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Manual Bill Recovery</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shortcut: Shift + F8 · Card/UPI Paid (Bill Not Generated)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Access Restriction Notice */}
        {!isAuthorized ? (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', marginBottom: '6px' }}>
              <ShieldAlert size={20} />
              <span>Cash Officer Authorization Required</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Manual bill recovery is restricted to <strong>Cash Officer</strong> or higher roles. You are logged in as <em>{user?.role || 'Cashier'}</em>. Please request a Cash Officer or Store Manager to perform this recovery.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Context instructions */}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card-hover)', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
              Verify with the bank/PG terminal that the payment was received before recovering the bill. Every manual recovery is recorded in the audit trail.
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(248, 113, 113, 0.12)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Mode Selection */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Payment Mode <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMode(PaymentMode.CARD)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: paymentMode === PaymentMode.CARD ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    backgroundColor: paymentMode === PaymentMode.CARD ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: paymentMode === PaymentMode.CARD ? '#3b82f6' : 'var(--text-main)',
                    fontWeight: paymentMode === PaymentMode.CARD ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                >
                  <CreditCard size={18} />
                  <span>Card Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode(PaymentMode.UPI)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: paymentMode === PaymentMode.UPI ? '2px solid #10b981' : '1px solid var(--border-color)',
                    backgroundColor: paymentMode === PaymentMode.UPI ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: paymentMode === PaymentMode.UPI ? '#10b981' : 'var(--text-main)',
                    fontWeight: paymentMode === PaymentMode.UPI ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                >
                  <QrCode size={18} />
                  <span>UPI Payment</span>
                </button>
              </div>
            </div>

            {/* Transaction ID */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Transaction ID (Card RRN / UPI Reference) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                ref={txnInputRef}
                type="text"
                className="input-field"
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. TXN9876543210 or 421098765432"
                required
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.5px' }}
              />
            </div>

            {/* Amount Paid */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Amount Paid (₹) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input-field"
                  value={amountRupees}
                  onChange={(e) => {
                    setAmountRupees(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="0.00"
                  required
                  style={{ width: '100%', paddingLeft: '28px', fontSize: '16px', fontWeight: 'bold' }}
                />
              </div>
            </div>

            {/* Verification Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isFormValid ? '#10b981' : 'var(--text-muted)' }}>
              <CheckCircle2 size={15} style={{ opacity: isFormValid ? 1 : 0.4 }} />
              <span>{isFormValid ? 'Ready to verify and generate bill' : 'Enter Transaction ID and Amount paid > ₹0'}</span>
            </div>

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
                style={{ padding: '10px 20px', minWidth: '160px', opacity: isFormValid && !loading ? 1 : 0.6 }}
              >
                {loading ? 'Processing Recovery...' : 'Submit & Generate Bill'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
