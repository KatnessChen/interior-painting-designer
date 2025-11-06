import React, { useState } from 'react';
import AuthPanel from '../AuthPanel';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);

  const toggleAuthPopover = () => {
    setIsAuthPanelOpen((isOpen) => !isOpen);
  };

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
          {/* Right Section - Storage Manager & Profile */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAuthPopover}
              className="p-0 border-2 border-white/30 rounded-full hover:border-white/50"
            >
              <img
                alt={user?.displayName || 'User'}
                src={user?.photoURL || undefined}
                className="w-10 h-10 rounded-full"
              />
            </button>
          </div>
        </div>
      </nav>
      {/* Spacer to prevent content from going under fixed header */}
      <div className="w-full" style={{ height: 'var(--header-height)' }} />
      {/* Auth Panel Popover */}
      {isAuthPanelOpen && (
        <div
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
