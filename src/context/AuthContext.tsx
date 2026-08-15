import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { UserSession } from '@afreen-mall/shared-types';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  login: (identifier: string, password: string) => Promise<any>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<UserSession | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    // Purge legacy unauthenticated localStorage tokens or passwords
    localStorage.removeItem('afreen_token');
    localStorage.removeItem('afreen_user');
    localStorage.removeItem('afreen_user_passwords');

    const expiresAt = sessionStorage.getItem('afreen_session_expires');
    if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
      sessionStorage.clear();
      return null;
    }

    const saved = sessionStorage.getItem('afreen_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const expiresAt = sessionStorage.getItem('afreen_session_expires');
    if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
      sessionStorage.clear();
      return null;
    }
    return sessionStorage.getItem('afreen_token');
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('afreen_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('afreen_theme', theme);
  }, [theme]);

  // Server-side Session Validation on App Load / Refresh
  useEffect(() => {
    const validateSessionOnLoad = async () => {
      const storedToken = sessionStorage.getItem('afreen_token');
      const expiresAt = sessionStorage.getItem('afreen_session_expires');

      if (!storedToken || (expiresAt && Date.now() > parseInt(expiresAt, 10))) {
        setUser(null);
        setToken(null);
        sessionStorage.clear();
        return;
      }

      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.data && res.data.user) {
          setUser(res.data.user);
          setToken(storedToken);
          sessionStorage.setItem('afreen_user', JSON.stringify(res.data.user));
        } else {
          throw new Error('Invalid session payload');
        }
      } catch {
        setUser(null);
        setToken(null);
        sessionStorage.clear();
      }
    };

    validateSessionOnLoad();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Strictly Server-Confirmed Authentication (Zero Offline Fallbacks)
  const login = async (identifier: string, password: string) => {
    const cleanId = identifier.trim();
    const cleanPass = password;

    if (!cleanId || !cleanPass) {
      throw new Error('Staff ID / Username and Password are required');
    }

    try {
      // Direct Server Authentication request to /auth/login
      const res = await api.post('/auth/login', {
        identifier: cleanId,
        password: cleanPass,
      });

      if (res.data && res.data.token && res.data.user) {
        const { token: jwtToken, user: userPayload } = res.data;
        const sessionExpiresAt = Date.now() + 12 * 60 * 60 * 1000;

        setToken(jwtToken);
        setUser(userPayload);
        sessionStorage.setItem('afreen_token', jwtToken);
        sessionStorage.setItem('afreen_user', JSON.stringify(userPayload));
        sessionStorage.setItem('afreen_session_expires', String(sessionExpiresAt));
        return res.data;
      }
      throw new Error('Invalid authentication response from server');
    } catch (err: any) {
      // Clear any state if authentication fails
      setToken(null);
      setUser(null);
      sessionStorage.clear();

      const errorMsg = getApiErrorMessage(err, 'Unable to reach authentication server. Please try again.');
      throw new Error(errorMsg);
    }
  };

  // Strictly Server-Confirmed Password Change
  const changePassword = async (newPassword: string, currentPassword?: string) => {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }
    if (!currentPassword) {
      throw new Error('Current password is required to change password');
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      // Clear session after password change to force re-authentication with new password
      logout();
    } catch (err: any) {
      const errorMsg = getApiErrorMessage(err, 'Failed to update password');
      throw new Error(errorMsg);
    }
  };

  const logout = () => {
    // Attempt backend session deletion asynchronously
    api.post('/auth/logout').catch(() => {});

    setUser(null);
    setToken(null);
    sessionStorage.clear();
    localStorage.removeItem('afreen_token');
    localStorage.removeItem('afreen_user');
    localStorage.removeItem('afreen_user_passwords');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        theme,
        toggleTheme,
        login,
        changePassword,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

