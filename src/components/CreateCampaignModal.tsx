import React, { useState } from 'react';
import { Target, X, Send, Check } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [campaignTitle, setCampaignTitle] = useState('Festival Re-Engagement Discount Offer');
  const [targetSegment, setTargetSegment] = useState('CHURN_RISK');
  const [promoCode, setPromoCode] = useState('WELCOMEBACK20');
  const [discountPct, setDiscountPct] = useState('20');
  const [channel, setChannel] = useState('SMS_AND_WHATSAPP');
  const [message, setMessage] = useState('We miss you at Afreen Mall! Enjoy 20% OFF on your next grocery purchase with promo code WELCOMEBACK20.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!campaignTitle || !targetSegment || !promoCode) {
      setError('Campaign Title, Target Segment, and Promo Code are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        campaignTitle,
        targetSegment,
        promoCode,
        discountPct: parseFloat(discountPct) || 10,
        channel,
        message,
      };

      const res = await api.post('/customers/campaigns', payload);
      setResult(res.data);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to launch marketing campaign'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1350 }}>
      <div className="modal-content" style={{ maxWidth: '580px', border: '2px solid var(--accent-lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Targeted Marketing Campaign Launcher
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
            ✓ Campaign {result.campaignId} dispatched to {result.dispatchedCount} customers in segment {targetSegment}!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Campaign Title *</label>
            <input type="text" className="input-field" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Customer Segment *</label>
              <select className="input-field" value={targetSegment} onChange={(e) => setTargetSegment(e.target.value)}>
                <option value="CHURN_RISK">Churn Risk (Inactive &gt;45 Days)</option>
                <option value="HIGH_VALUE_VIP">High-Value VIP Spenders</option>
                <option value="WEEKLY_SHOPPER">Weekly Supermarket Shoppers</option>
                <option value="GOLD_MEMBERS">Gold & Platinum Tier Members</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Promotional Coupon Code *</label>
              <input type="text" className="input-field tabular-nums" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Discount Percentage (%)</label>
              <input type="number" className="input-field tabular-nums" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Delivery Channel</label>
              <select className="input-field" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="SMS_AND_WHATSAPP">SMS + WhatsApp Portal Broadcast</option>
                <option value="SMS_ONLY">SMS Broadcast Only</option>
                <option value="EMAIL_ONLY">Email Newsletter Only</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Promotional Message Content</label>
            <textarea
              className="input-field"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ padding: '8px 16px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !!result} style={{ padding: '8px 20px' }}>
              <Send size={16} /> <span>{loading ? 'Broadcasting...' : 'Launch & Dispatch Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
