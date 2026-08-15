import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface F1ShortcutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const F1ShortcutOverlay: React.FC<F1ShortcutOverlayProps> = ({ isOpen, onClose }) => {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', desc: 'Show keyboard shortcut reference overlay' },
    { key: 'F2', desc: 'New sale / Focus barcode scanner' },
    { key: 'F3', desc: 'Customer lookup & search' },
    { key: 'F4', desc: 'Manual discount (authorized users)' },
    { key: 'F5', desc: 'Hold current active bill' },
    { key: 'F6', desc: 'Recall held bills modal' },
    { key: 'F7', desc: 'Product search / Price checker' },
    { key: 'F8', desc: 'Manual bill recovery (Card/UPI)' },
    { key: 'F9', desc: 'Change item quantity modal' },
    { key: 'F10', desc: 'Save invoice & open payment dialog' },
    { key: 'F11', desc: 'Toggle full screen POS mode' },
    { key: 'F12', desc: 'Quick POS calculator' },
    { key: 'Esc', desc: 'Close modal / Toggle grid & barcode focus' },
    { key: 'Delete', desc: 'Delete selected cart item' },
    { key: '↑ / ↓', desc: 'Navigate cart items' },
    { key: 'Enter', desc: 'Confirm action / Scan barcode' },
    { key: 'Ctrl + P', desc: 'Reprint duplicate bill copy' },
    { key: 'Ctrl + D', desc: 'Void current invoice (Manager PIN required)' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={containerRef} className="modal-content" tabIndex={-1} style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Keyboard size={24} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>POS Keyboard Shortcut Reference (F1 Help)</h3>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: 'var(--accent-lime)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '2px 8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {s.key}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-main)', textAlign: 'right' }}>{s.desc}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
