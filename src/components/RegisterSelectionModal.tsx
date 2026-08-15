import React, { useState, useEffect } from 'react';
import { Monitor, Check, X, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export interface POSRegister {
  id: string;
  posNumber: string;
  name: string;
  isActive: boolean;
}

interface RegisterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRegister: (register: POSRegister) => void;
  currentRegisterId?: string;
}

export const RegisterSelectionModal: React.FC<RegisterSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRegister,
  currentRegisterId,
}) => {
  const [registers, setRegisters] = useState<POSRegister[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchRegisters();
    }
  }, [isOpen]);

  const fetchRegisters = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pos/registers');
      if (res.data?.registers && Array.isArray(res.data.registers) && res.data.registers.length > 0) {
        setRegisters(res.data.registers);
        setSelectedId(currentRegisterId || res.data.registers[0].id);
      } else {
        throw new Error('No registers returned');
      }
    } catch {
      // Mock fallback registers for offline/dev operation
      const mockRegisters: POSRegister[] = [
        { id: 'reg-01', posNumber: 'POS-01', name: 'Main Billing Counter (Ground Floor)', isActive: true },
        { id: 'reg-02', posNumber: 'POS-02', name: 'Express Grocery & Snacks Counter', isActive: true },
        { id: 'reg-03', posNumber: 'POS-03', name: 'Apparel & Footwear Counter (1st Floor)', isActive: true },
        { id: 'reg-04', posNumber: 'POS-04', name: 'Bulk Purchases & Institutional POS', isActive: true },
      ];
      setRegisters(mockRegisters);
      setSelectedId(currentRegisterId || 'reg-01');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    const chosen = registers.find((r) => r.id === selectedId) || registers[0];
    if (chosen) {
      localStorage.setItem('afreen_pos_register', JSON.stringify(chosen));
      onSelectRegister(chosen);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content" style={{ maxWidth: '520px', padding: '24px', borderRadius: '12px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Monitor size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Select POS Terminal Register</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-feed terminal assignment for session sales & closing</span>
            </div>
          </div>
          {currentRegisterId && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Select the active POS register number operating on this terminal machine. All cash sales and BNA deposits will map to this POS number.
        </p>

        {/* Registers Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
          {registers.map((reg) => {
            const isSelected = reg.id === selectedId;
            return (
              <div
                key={reg.id}
                onClick={() => setSelectedId(reg.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card-hover)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                      color: isSelected ? '#fff' : 'var(--text-main)',
                    }}
                  >
                    {reg.posNumber}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)' }}>{reg.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: Active POS Billing Unit</div>
                  </div>
                </div>

                {isSelected && <Check size={20} style={{ color: '#3b82f6' }} />}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          {currentRegisterId && (
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{ padding: '8px 20px', minWidth: '140px', fontWeight: 'bold' }}
          >
            Assign POS Register
          </button>
        </div>

      </div>
    </div>
  );
};
