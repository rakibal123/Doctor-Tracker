'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from './Icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onOpenNav: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/doctors': 'Doctors',
  '/patients': 'Patients',
};

export const Header: React.FC<HeaderProps> = ({ onOpenNav }) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // Determine breadcrumb title based on current route
  let title = 'Dashboard';
  for (const [route, label] of Object.entries(PAGE_TITLES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      title = label;
      break;
    }
  }

  return (
    <header className="top">
      <button
        type="button"
        className="btn ib menu"
        onClick={onOpenNav}
        aria-label="Open navigation drawer"
        style={{ border: 0 }}
      >
        <Icon name="menu" />
      </button>

      <span className="crumb">{title}</span>

      <span className="sp" />

      {/* Synchronized Theme Switcher */}
      <button
        type="button"
        className="btn ib"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        style={{ border: 0 }}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>

      {/* Admin User Avatar */}
      <button
        type="button"
        className="btn ib"
        aria-label={`User profile for ${user?.name || 'Administrator'}`}
        title={user?.email ? `${user.name} (${user.email})` : 'Administrator'}
        style={{ border: 0, borderRadius: '50%' }}
      >
        <span className="av">
          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
        </span>
      </button>
    </header>
  );
};
