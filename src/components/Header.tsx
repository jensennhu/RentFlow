// src/components/Header.tsx
import React from 'react';
import { Database, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSupabaseSetup: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSupabaseSetup }) => {
  const isSupabaseEnabled = import.meta.env.VITE_USE_SUPABASE === 'true';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Chan Rental Management Dashboard</h1>
            <p className="text-sm text-gray-500">
              Properties of Chan Family
              {isSupabaseEnabled && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Supabase Enabled
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenSupabaseSetup}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            title="Supabase Configuration"
          >
            <Settings className="h-5 w-5" />
            <span className="hidden sm:inline">Database Setup</span>
          </button>
        </div>
      </div>
    </header>
  );
};