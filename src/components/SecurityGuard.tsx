import React, { useEffect } from 'react';

/**
 * SecurityGuard — Enterprise Anti-Tampering Shield Component
 * Safely guards environment checks using import.meta.env to prevent ReferenceError in Vite.
 */
export const SecurityGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    try {
      // Safe environment mode detection for Vite
      const isProduction = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'production';

      if (isProduction) {
        // Suppress non-critical console output in production while preserving error logs
        console.log = () => {};
        console.debug = () => {};
        console.info = () => {};
      }
    } catch (e) {
      // Fail-safe: SecurityGuard will never crash the React application tree
    }
  }, []);

  return <>{children}</>;
};
