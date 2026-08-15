import React from 'react';
import { useAuth } from '../context/AuthContext';

interface AfreenMallLogoProps {
  size?: 'small' | 'medium' | 'large' | 'huge';
  className?: string;
}

export const AfreenMallLogo: React.FC<AfreenMallLogoProps> = ({ size = 'medium', className = '' }) => {
  const { theme } = useAuth();

  const widths: Record<string, number> = {
    small: 150,
    medium: 200,
    large: 260,
    huge: 320,
  };

  const logoSrc = theme === 'dark' ? './logo-dark.jpg' : './logo-light.jpg';

  return (
    <img
      src={logoSrc}
      alt="Afreen Mall"
      className={className}
      style={{
        width: widths[size],
        maxWidth: '100%',
        height: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
      draggable={false}
    />
  );
};
