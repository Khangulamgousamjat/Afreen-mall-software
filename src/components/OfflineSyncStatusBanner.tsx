import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const OfflineSyncStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const checkOfflineQueue = () => {
    try {
      const saved = localStorage.getItem('afreen_offline_sales_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setOfflineCount(parsed.length);
          return;
        }
      }
      setOfflineCount(0);
    } catch {
      setOfflineCount(0);
    }
  };

  useEffect(() => {
    checkOfflineQueue();

    const handleOnline = () => {
      setIsOnline(true);
      checkOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setInterval(checkOfflineQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  const handleSyncQueue = async () => {
    try {
      const saved = localStorage.getItem('afreen_offline_sales_queue');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      setSyncing(true);
      setSyncMessage('Synchronizing offline queue with central database...');

      const res = await api.post('/pos/sync-offline-queue', { offlineSales: parsed });

      if (res.data?.syncedCount !== undefined) {
        localStorage.removeItem('afreen_offline_sales_queue');
        setOfflineCount(0);
        setSyncMessage(`Successfully uploaded ${res.data.syncedCount} offline sales ✓`);
        setTimeout(() => setSyncMessage(''), 4000);
      }
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message || 'Server unreachable'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && offlineCount === 0 && !syncMessage) return null;

  return (
    <div
      style={{
        padding: '8px 16px',
        backgroundColor: !isOnline ? 'rgba(239, 68, 68, 0.9)' : 'rgba(212, 168, 67, 0.9)',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isOnline ? <WifiOff size={16} /> : <Wifi size={16} />}
        <span>
          {!isOnline
            ? '⚠️ NETWORK DISCONNECTED — Standalone Till Mode (Unsynced sales saved locally to this terminal\'s browser queue)'
            : `⚡ NETWORK RESTORED — ${offlineCount} Unsent Sales Queued Locally on This Terminal (Sync must be triggered from this till)`}
        </span>
      </div>

      {syncMessage ? (
        <span style={{ fontSize: '11px', fontStyle: 'italic' }}>{syncMessage}</span>
      ) : (
        isOnline && offlineCount > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleSyncQueue}
            disabled={syncing}
            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#ffffff', color: '#000000', border: 'none' }}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Uploading Queue...' : 'Sync Offline Queue Now'}</span>
          </button>
        )
      )}
    </div>
  );
};
