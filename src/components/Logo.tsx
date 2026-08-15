import React from 'react';
import { useAuth } from '../context/AuthContext';

interface LogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSubtitle?: boolean;
  className?: string;
}

export default function Logo({
  size = 'md',
  className = '',
}: LogoProps) {
  const { theme } = useAuth();

  const widths: Record<string, number> = {
    sm: 120,
    md: 150,
    lg: 200,
    hero: 280,
  };

  const logoSrc = theme === 'dark' ? './logo-dark.jpg' : './logo-light.jpg';

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        userSelect: 'none',
      }}
    >
      <img
        src={logoSrc}
        alt="Afreen Mall"
        style={{
          width: widths[size],
          maxWidth: '100%',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
}
