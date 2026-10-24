'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="app">
        <Sidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />

        <div className="main">
          <Header onOpenNav={() => setIsNavOpen(true)} />
          <main id="view">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
};
