import React, { useState } from 'react';
import { Hash, Eye, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface NumberSeriesModalProps {
  seriesKey: string;
  series: any;
  onClose: () => void;
  onSaved: (key: string, updated: any) => void;
}

export const NumberSeriesModal: React.FC<NumberSeriesModalProps> = ({ seriesKey, series, onClose, onSaved }) => {
  const [form, setForm] = useState({
    prefix: series.prefix || '',
    suffix: series.suffix || '',
    yearCode: series.yearCode || '2026',
    branchPrefix: series.branchPrefix || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const previewExample = `${form.prefix ? form.prefix + '-' : ''}${form.yearCode ? form.yearCode + '-' : ''}${String(series.currentSeq || 1).padStart(4, '0')}${form.suffix}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prefix) { setError('Prefix is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.patch(`/admin/number-series/${seriesKey}`, form);
      onSaved(seriesKey, res.data.series);
    } catch (err: any) {
      // Apply locally if API unavailable
      const updated = { ...series, ...form, example: previewExample };
      onSaved(seriesKey, updated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Hash size={24} style={{ color: '#06b6d4' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Number Series: {series.module}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configure prefix, suffix, year code and auto-increment format</div>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', marginBottom: '14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Live Preview */}
        <div style={{ backgroundColor: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.3)', padding: '14px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Eye size={11} style={{ display: 'inline', marginRight: '4px' }} />Live Preview
          </div>
          <div style={{ fontSize: '22px', fontFamily: 'monospace', fontWeight: 'bold', color: '#06b6d4', letterSpacing: '2px' }}>
            {previewExample || '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Current Sequence: <strong style={{ color: 'var(--text-color)' }}>#{String(series.currentSeq || 1).padStart(4, '0')}</strong>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Prefix *</label>
              <input type="text" className="input-field" value={form.prefix} onChange={(e) => set('prefix', e.target.value.toUpperCase())} placeholder="e.g. INV, PO, GRN" required />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Suffix (optional)</label>
              <input type="text" className="input-field" value={form.suffix} onChange={(e) => set('suffix', e.target.value.toUpperCase())} placeholder="e.g. -A, -MUM" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Year Code</label>
            <input type="text" className="input-field" value={form.yearCode} onChange={(e) => set('yearCode', e.target.value)} placeholder="e.g. 26, 2026, 2026-27" />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input type="checkbox" checked={form.branchPrefix} onChange={(e) => set('branchPrefix', e.target.checked)} />
            Include Branch Code in Number (e.g. AFREEN-001-INV-26-1001)
          </label>

          <div style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Format: <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>
              {form.branchPrefix ? '[BRANCH]-' : ''}{form.prefix || 'PREFIX'}-{form.yearCode || 'YEAR'}-[SEQUENCE]{form.suffix}
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <CheckCircle2 size={15} />
              {loading ? 'Saving…' : 'Save Number Series'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
