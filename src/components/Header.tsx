// src/components/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Building, Database, User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onOpenSupabaseSetup: () => void;
  user?: any;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSupabaseSetup, 
  user, 
  onSignOut 
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Logo and Title */}
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Building className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chan Rental Management</h1>
        </div>
      </div>

      {/* Right side - User menu and actions */}
      <div className="flex items-center space-x-4">
        {/* Supabase Setup Button */}
        <button
          onClick={onOpenSupabaseSetup}
          className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Supabase Configuration"
        >
          <Database className="h-5 w-5" />
          <span className="hidden md:inline text-sm">Database</span>
        </button>

        {/* User Menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* User Avatar */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {getUserInitials()}
                  </span>
                )}
              </div>

              {/* User Info */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500">
                  {getUserEmail()}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* User Info in Mobile */}
                <div className="md:hidden px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getUserEmail()}
                  </p>
                </div>

                {/* Menu Items */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    // Add profile/settings functionality here if needed
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm">Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSupabaseSetup();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Database Settings</span>
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSignOut?.();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};