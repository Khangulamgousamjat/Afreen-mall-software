import React, { useState } from 'react';
import { BookOpen, X, Plus } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreateGLAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateGLAccountModal: React.FC<CreateGLAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [accountCode, setAccountCode] = useState('1003');
  const [accountName, setAccountName] = useState('Axis Bank - Operating Account');
  const [category, setCategory] = useState('ASSETS');
  const [type, setType] = useState('Bank');
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('100000.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountCode || !accountName || !category) {
      setError('Account Code, Account Name, and Category are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        accountCode,
        accountName,
        category,
        type,
        openingBalanceRupees,
      };

      await api.post('/accounting/coa', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to add GL account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '560px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Add New General Ledger Account to COA
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Account Code *</label>
              <input type="text" className="input-field tabular-nums" value={accountCode} onChange={(e) => setAccountCode(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Account Name / Title *</label>
              <input type="text" className="input-field" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Primary COA Category *</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="ASSETS">Assets (1000s)</option>
                <option value="LIABILITIES">Liabilities (2000s)</option>
                <option value="EQUITY">Equity & Capital (3000s)</option>
                <option value="REVENUE">Revenue & Income (4000s)</option>
                <option value="EXPENSES">Expenses (5000s)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Account Subtype</label>
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Cash">Cash Account</option>
                <option value="Bank">Bank Account</option>
                <option value="AR">Accounts Receivable (AR)</option>
                <option value="AP">Accounts Payable (AP)</option>
                <option value="Inventory">Inventory Asset</option>
                <option value="Sales">Sales Revenue</option>
                <option value="Direct Expense">Direct Expense / COGS</option>
                <option value="Operating Expense">Operating Expense</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Opening Balance (₹)</label>
            <input type="number" step="0.01" className="input-field monetary" value={openingBalanceRupees} onChange={(e) => setOpeningBalanceRupees(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 20px' }}>
              {loading ? 'Creating...' : 'Create GL Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
