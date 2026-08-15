import React, { useState } from 'react';
import { Key, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PasswordChangeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isMandatory = Boolean(user && user.mustChangePassword);
  const showModal = Boolean(isOpen || isMandatory);

  if (!user || !showModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and Confirmation do not match');
      return;
    }

    try {
      setLoading(true);
      await changePassword(newPassword, currentPassword);
      setSuccessMsg('Password updated successfully! Please log in with your new password.');
      setTimeout(() => {
        if (onClose) onClose();
        logout();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: '460px', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={22} style={{ color: 'var(--accent-lime)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              {isMandatory ? 'First Login: Password Change Required' : 'Change Password'}
            </h3>
          </div>
          {!isMandatory && onClose && (
            <button className="btn" onClick={onClose} style={{ padding: '4px 8px' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {isMandatory && (
          <p style={{ fontSize: '12px', color: 'var(--status-amber)', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
            ⚠ Security Policy Notice: You are required to update your temporary password to a private password (min 8 characters).
          </p>
        )}

        {error && (
          <div style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid var(--status-red)', color: 'var(--status-red)', padding: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px', fontSize: '12px', fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Current Password:
            </label>
            <input
              type="password"
              className="input-field"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              style={{ padding: '7px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              New Password (Min 8 Chars):
            </label>
            <input
              type="password"
              className="input-field"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new private password"
              required
              style={{ padding: '7px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Confirm New Password:
            </label>
            <input
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              style={{ padding: '7px 10px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
            {!isMandatory && onClose && (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '8px 16px' }}>
              {loading ? 'Updating Password...' : 'Update Password & Re-login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

