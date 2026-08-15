import React, { useState } from 'react';
import { Star, X, MessageSquare, ThumbsUp } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerFeedbackModal: React.FC<CustomerFeedbackModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('Vikram Mehta');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('STORE_EXPERIENCE');
  const [comments, setComments] = useState('Superb billing speed at cash counter 04! Basmati rice quality was top-notch.');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      const payload = {
        customerName,
        rating,
        category,
        comments,
      };

      await api.post('/customers/feedback', payload);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to submit customer feedback'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '520px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Customer CSAT Survey & Feedback Capture
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

        {submitted && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--status-green)', border: '1px solid var(--status-green)', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: 'bold' }}>
            ✓ Thank you! CSAT Feedback ({rating} Stars) recorded into Store CSAT Scorecard.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Name</label>
            <input type="text" className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CSAT Rating (1 to 5 Stars)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: rating >= star ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-color)',
                    color: rating >= star ? 'var(--status-amber)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  ★ {star}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Feedback Category</label>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="STORE_EXPERIENCE">Store Cleanliness & Billing Speed</option>
              <option value="PRODUCT_QUALITY">Product Quality & Freshness</option>
              <option value="STAFF_BEHAVIOR">Staff Behavior & Hospitality</option>
              <option value="PRICING_VALUE">Pricing & Promotion Value</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Comments & Recommendations</label>
            <textarea
              className="input-field"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || submitted} style={{ padding: '8px 20px' }}>
              {loading ? 'Submitting...' : 'Submit CSAT Survey Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
