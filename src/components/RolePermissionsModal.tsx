import React, { useState } from 'react';
import { Shield, CheckSquare, Square, Info } from 'lucide-react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

interface RolePermissionsModalProps {
  role: any;
  permissionMatrix: any;
  onClose: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  VIEW: '#06b6d4', CREATE: '#10b981', EDIT: '#f59e0b',
  DELETE: '#ef4444', APPROVE: '#8b5cf6', PRINT: '#6b7280',
  EXPORT: '#6b7280', IMPORT: '#6b7280', VOID: '#ef4444', REVERSE: '#f59e0b',
};

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ role, permissionMatrix, onClose }) => {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    // Initialize based on role level (Super Admin = all, Cashier = minimal)
    const initial: Record<string, Record<string, boolean>> = {};
    if (permissionMatrix?.modules) {
      permissionMatrix.modules.forEach((mod: any) => {
        mod.screens.forEach((screen: any) => {
          const key = `${mod.id}.${screen.id}`;
          initial[key] = {};
          permissionMatrix.actions.forEach((action: string) => {
            // Super Admin gets all, others get view-only by default in this UI
            initial[key][action] = role.name === 'SUPER_ADMIN';
          });
        });
      });
    }
    return initial;
  });

  const [activeModule, setActiveModule] = useState(permissionMatrix?.modules?.[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (role?.name) {
      api
        .get(`/admin/roles/${role.name}/permissions`)
        .then((res) => {
          if (res.data?.permissions && typeof res.data.permissions === 'object') {
            setPermissions(res.data.permissions);
          }
        })
        .catch(() => {
          // ignore fallback
        });
    }
  }, [role?.name]);

  const togglePermission = (screenKey: string, action: string) => {
    if (role.name === 'SUPER_ADMIN') return; // Super Admin is immutable
    setPermissions((prev) => ({
      ...prev,
      [screenKey]: { ...prev[screenKey], [action]: !prev[screenKey]?.[action] },
    }));
  };

  const toggleAllForScreen = (screenKey: string, value: boolean) => {
    if (role.name === 'SUPER_ADMIN') return;
    const updated: Record<string, boolean> = {};
    permissionMatrix.actions.forEach((a: string) => { updated[a] = value; });
    setPermissions((prev) => ({ ...prev, [screenKey]: updated }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/roles/${role.name}/permissions`, { permissions });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to update role permissions'));
    } finally {
      setSaving(false);
    }
  };

  const activeModuleData = permissionMatrix?.modules?.find((m: any) => m.id === activeModule);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Shield size={24} style={{ color: role.color || '#10b981' }} />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Role Permissions: {role.name.replace(/_/g, ' ')}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{role.description}</div>
          </div>
          {role.name === 'SUPER_ADMIN' && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 8px' }}>
              <Info size={12} /> IMMUTABLE — All Permissions Granted
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', border: '1px solid var(--status-red)', fontSize: '12px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', minHeight: '400px' }}>
          {/* Module List */}
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modules</div>
            {permissionMatrix?.modules?.map((mod: any) => (
              <div
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderLeft: activeModule === mod.id ? '2px solid #10b981' : '2px solid transparent',
                  backgroundColor: activeModule === mod.id ? 'rgba(16,185,129,0.08)' : 'transparent',
                  color: activeModule === mod.id ? '#10b981' : 'var(--text-color)',
                  marginBottom: '2px',
                }}
              >
                {mod.name}
              </div>
            ))}
          </div>

          {/* Permission Grid */}
          <div>
            {activeModuleData && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#10b981' }}>
                  {activeModuleData.name}
                </div>
                {/* Action header */}
                <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${permissionMatrix.actions.length}, 1fr)`, gap: '4px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Screen</div>
                  {permissionMatrix.actions.map((action: string) => (
                    <div key={action} style={{ fontSize: '9px', color: ACTION_COLORS[action] || '#6b7280', textAlign: 'center', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      {action}
                    </div>
                  ))}
                </div>
                {activeModuleData.screens.map((screen: any) => {
                  const key = `${activeModuleData.id}.${screen.id}`;
                  const allGranted = permissionMatrix.actions.every((a: string) => permissions[key]?.[a]);
                  return (
                    <div key={screen.id} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${permissionMatrix.actions.length}, 1fr)`, gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <button
                          onClick={() => toggleAllForScreen(key, !allGranted)}
                          style={{ background: 'none', border: 'none', cursor: role.name === 'SUPER_ADMIN' ? 'not-allowed' : 'pointer', color: allGranted ? '#10b981' : 'var(--text-muted)', padding: 0 }}
                        >
                          {allGranted ? <CheckSquare size={13} /> : <Square size={13} />}
                        </button>
                        {screen.name}
                      </div>
                      {permissionMatrix.actions.map((action: string) => {
                        const granted = role.name === 'SUPER_ADMIN' ? true : (permissions[key]?.[action] || false);
                        return (
                          <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              onClick={() => togglePermission(key, action)}
                              style={{
                                background: 'none', border: 'none', cursor: role.name === 'SUPER_ADMIN' ? 'not-allowed' : 'pointer',
                                color: granted ? (ACTION_COLORS[action] || '#10b981') : 'var(--border-color)',
                                padding: 0,
                              }}
                            >
                              {granted ? <CheckSquare size={15} /> : <Square size={15} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving || role.name === 'SUPER_ADMIN'}
          >
            {saved ? '✓ Permissions Saved' : saving ? 'Saving…' : 'Save Permissions'}
          </button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
