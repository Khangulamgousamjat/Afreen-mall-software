import React, { useState } from 'react';
import { Edit3, X, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface PostJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PostJournalModal: React.FC<PostJournalModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [description, setDescription] = useState('Manual adjustment journal for store utility expenses');
  const [lines, setLines] = useState([
    { accountCode: '5100', accountName: 'Store Rent & Utilities', debitRupees: '15000.00', creditRupees: '0.00' },
    { accountCode: '1002', accountName: 'HDFC Bank - Main Operating Account', debitRupees: '0.00', creditRupees: '15000.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debitRupees) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.creditRupees) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([
      ...lines,
      { accountCode: '1001', accountName: 'Cash on Hand', debitRupees: '0.00', creditRupees: '0.00' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isBalanced) {
      setError(`Double-Entry Rule Violation: Total Debit (₹${totalDebit.toFixed(2)}) must equal Total Credit (₹${totalCredit.toFixed(2)}).`);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        description,
        lines,
      };

      const res = await api.post('/accounting/journals', payload);
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to post manual journal voucher'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '680px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Post Manual Double-Entry Journal (JRN-2026-XXXXXX)
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
            ✓ Journal {result.journalNo} posted successfully! General Ledger updated.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Journal Description / Remarks *</label>
            <input type="text" className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          {/* JOURNAL LINES GRID */}
          <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent-lime)' }}>Double-Entry Journal Lines</span>
              <button type="button" className="btn" onClick={handleAddLine} style={{ padding: '4px 8px', fontSize: '11px' }}>
                <Plus size={12} /> Add Line Row
              </button>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input-field tabular-nums"
                  value={line.accountCode}
                  onChange={(e) => {
                    const copy = [...lines];
                    copy[idx].accountCode = e.target.value;
                    setLines(copy);
                  }}
                  placeholder="Code..."
                />
                <input
                  type="text"
                  className="input-field"
                  value={line.accountName}
                  onChange={(e) => {
                    const copy = [...lines];
                    copy[idx].accountName = e.target.value;
                    setLines(copy);
                  }}
                  placeholder="GL Account Title..."
                />
                <input
                  type="number"
                  step="0.01"
                  className="input-field monetary"
                  value={line.debitRupees}
                  onChange={(e) => {
                    const copy = [...lines];
                    copy[idx].debitRupees = e.target.value;
                    setLines(copy);
                  }}
                  placeholder="Debit ₹..."
                />
                <input
                  type="number"
                  step="0.01"
                  className="input-field monetary"
                  value={line.creditRupees}
                  onChange={(e) => {
                    const copy = [...lines];
                    copy[idx].creditRupees = e.target.value;
                    setLines(copy);
                  }}
                  placeholder="Credit ₹..."
                />
                <button type="button" className="btn" onClick={() => handleRemoveLine(idx)} style={{ padding: '4px', color: 'var(--status-red)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* BALANCE TOTALS BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 'bold' }}>
              <div style={{ color: isBalanced ? 'var(--status-green)' : 'var(--status-red)' }}>
                {isBalanced ? '✓ DOUBLE-ENTRY BALANCED' : '❌ UNBALANCED JOURNAL'}
              </div>
              <div style={{ display: 'flex', gap: '16px' }} className="monetary">
                <span>Debit Total: ₹{totalDebit.toFixed(2)}</span>
                <span>Credit Total: ₹{totalCredit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !isBalanced || !!result} style={{ padding: '8px 20px' }}>
              {loading ? 'Posting...' : 'Post Balanced Journal Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
