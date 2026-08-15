import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isDesktopApp, getDesktopAPI } from '../services/desktopService';
import { Minus, Square, X, Maximize2, Wifi, WifiOff, Monitor } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, theme } = useAuth();
  const logoSrc = theme === 'dark' ? './logo-dark.jpg' : './logo-light.jpg';
  const isDesktop = isDesktopApp();
  const desktop = getDesktopAPI();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let cleanupDesktopListener: (() => void) | undefined;
    if (desktop) {
      desktop.getNetworkStatus().then((s) => setIsOnline(s.isOnline));
      cleanupDesktopListener = desktop.onNetworkChange((status) => setIsOnline(status));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (cleanupDesktopListener) cleanupDesktopListener();
    };
  }, [desktop]);

  return (
    <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', userSelect: 'none' }}>
      {/* LEFT: Logo + Mall name + Network Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <img
          src={logoSrc}
          alt="Afreen Mall"
          style={{ height: '38px', width: 'auto', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '0.5px', color: 'var(--text-main)' }}>
              Afreen Mall
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: isDesktop ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-color)',
                color: isDesktop ? 'var(--accent-lime)' : 'var(--text-muted)',
                fontWeight: 'bold',
                border: '1px solid var(--border-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Monitor size={10} />
              {isDesktop ? 'PC DESKTOP APP' : 'INTERNAL OPERATIONS'}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Staff Operations Platform
          </span>
        </div>

        {/* Live Network & Internet Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)',
            border: isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '11px',
            fontWeight: '600',
            color: isOnline ? 'var(--accent-lime)' : '#ef4444',
          }}
          title={isOnline ? 'Connected to Store & Cloud Database' : 'Offline Mode: Transactions queued locally in PC software'}
        >
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{isOnline ? 'Online (Cloud Connected)' : 'Offline (Local Sync Queue)'}</span>
        </div>
      </div>

      {/* RIGHT: Logged-in Staff Info + Desktop Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)' }}>{user.fullName}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="tabular-nums">
              Staff ID: <strong>{user.staffId}</strong> | {user.role}
            </div>
          </div>
        )}

        {/* Native Windows PC Window Controls */}
        {isDesktop && desktop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
            <button
              onClick={() => desktop.windowControl.toggleKiosk()}
              title="Toggle Fullscreen POS Kiosk Mode"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={() => desktop.windowControl.minimize()}
              title="Minimize Window"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Minus size={13} />
            </button>
            <button
              onClick={() => desktop.windowControl.maximize()}
              title="Maximize / Restore Window"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Square size={12} />
            </button>
            <button
              onClick={() => desktop.windowControl.close()}
              title="Close Application"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                color: '#ef4444',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
