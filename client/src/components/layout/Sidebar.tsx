'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icons';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dash' as const },
  { href: '/doctors', label: 'Doctors', icon: 'doc' as const },
  { href: '/patients', label: 'Patients', icon: 'pat' as const },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll on mobile when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    if (isOpen) {
      onClose();
    }
  };

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      setIsLoggingOut(false);
      const message = err instanceof Error ? err.message : 'Logout failed. Please try again.';
      alert(message);
    }
  };

  return (
    <>
      <aside
        className={`side ${isOpen ? 'open' : ''}`}
        id="side"
        aria-label="Main navigation"
      >
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <Icon name="shield" size={16} />
          </span>
          Doctor Tracker
        </div>

        <nav className="nav" aria-label="Application sections">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? 'on' : ''}
                aria-current={isActive ? 'page' : undefined}
                onClick={handleLinkClick}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sf">
          <button
            type="button"
            className="lo"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Log out of application"
          >
            {isLoggingOut ? (
              <span className="spin" aria-hidden="true" style={{ width: 16, height: 16, marginRight: 8 }} />
            ) : (
              <Icon name="out" />
            )}
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </button>
        </div>
      </aside>

      {/* Accessible Backdrop Scrim for mobile drawer */}
      <div
        className={`scrim ${isOpen ? 'open' : ''}`}
        id="scrim"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
};
