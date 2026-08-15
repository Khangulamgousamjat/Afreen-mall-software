import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isDesktopApp } from '../services/desktopService';

export const DesktopStatusBar: React.FC = () => {
  const { user } = useAuth();
  const isDesktop = isDesktopApp();
  const [timeStr, setTimeStr] = useState('');
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleKey = (e: KeyboardEvent) => {
      setCapsLock(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, []);

  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '24px',
        backgroundColor: 'var(--surface-color)',
        borderTop: '1px solid var(--border-color)',
        padding: '0 8px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
        userSelect: 'none',
        zIndex: 9998,
      }}
    >
      {/* Left items: Engine & DB status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-lime)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-lime)' }} />
          {isDesktop ? 'DESKTOP ENGINE ACTIVE' : 'SYSTEM READY'}
        </span>
        <span style={separatorStyle}>|</span>
        <span>DB: PostgreSQL (Live)</span>
        <span style={separatorStyle}>|</span>
        <span>Register: REG-01</span>
        <span style={separatorStyle}>|</span>
        <span>Printer: 80mm ESC/POS (Ready)</span>
      </div>

      {/* Center: Quick Keys guide */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '10px' }}>
        <span style={keyBadgeStyle}>[F1] Shortcuts</span>
        <span style={keyBadgeStyle}>[F2] Price</span>
        <span style={keyBadgeStyle}>[F4] Hold</span>
        <span style={keyBadgeStyle}>[F8] Reprint</span>
        <span style={keyBadgeStyle}>[F11] Kiosk</span>
        <span style={keyBadgeStyle}>[F12] Day Close</span>
      </div>

      {/* Right items: Operator, CapsLock, Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {capsLock && (
          <span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '2px', fontSize: '9px', fontWeight: 'bold' }}>
            CAPS LOCK
          </span>
        )}
        {user && <span>Operator: {user.fullName} ({user.role})</span>}
        <span style={separatorStyle}>|</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{timeStr}</span>
      </div>
    </footer>
  );
};

const separatorStyle: React.CSSProperties = {
  color: 'var(--border-color)',
};

const keyBadgeStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-color)',
  padding: '1px 5px',
  borderRadius: '3px',
  border: '1px solid var(--border-color)',
};
