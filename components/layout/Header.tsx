import React, { useState, useEffect, useRef } from 'react';
import { Avatar, IconButton } from '@mui/material';
import AuthPanel from '../AuthPanel';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const authPanelRef = useRef<HTMLDivElement>(null);

  const toggleAuthPopover = () => {
    setIsAuthPanelOpen((isOpen) => !isOpen);
  };

  // Close AuthPanel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authPanelRef.current && !authPanelRef.current.contains(event.target as Node)) {
        setIsAuthPanelOpen(false);
      }
    };

    if (isAuthPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isAuthPanelOpen]);

  return (
    <>
      {/* Header Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-indigo-400 to-purple-600 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Brand Section */}
          <div className="flex items-center">
            <div className="text-2xl text-white/85">Vizion</div>
            <div className="text-white/70 font-light mt-1 ml-2">Your AI Interior Designer</div>
          </div>
          {/* Right Section - Profile */}
          <div className="flex items-center gap-2">
            <IconButton
              onClick={toggleAuthPopover}
              sx={{
                p: 0,
                border: '2px solid rgba(255,255,255,0.3)',
                '&:hover': { border: '2px solid rgba(255,255,255,0.5)' },
              }}
            >
              <Avatar alt={user?.displayName || 'User'} src={user?.photoURL || undefined} />
            </IconButton>
          </div>
        </div>
      </nav>
      {/* Spacer to prevent content from going under fixed header */}
      <div className="w-full" style={{ height: 'var(--header-height)' }} />
      {/* Auth Panel Popover */}
      {isAuthPanelOpen && (
        <div
          ref={authPanelRef}
          className="absolute right-6 bg-white rounded-lg shadow-xl border border-gray-200"
          style={{ top: 70, width: 400, maxWidth: '90vw', zIndex: 1000 }}
        >
          <AuthPanel />
        </div>
      )}
    </>
  );
};

export default Header;
