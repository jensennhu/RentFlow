import React from 'react';
import { Building2, User, Bell, Database, Wifi, WifiOff } from 'lucide-react';
import { googleAuthService } from '../services/googleAuthService';

interface HeaderProps {
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGoogleSheets }) => {
  const isConnected = googleAuthService.isConnected();
  const config = googleAuthService.getConfig();

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">RentFlow</h1>
              <p className="text-xs text-gray-500">Landlord Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenGoogleSheets}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isConnected
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span>Google Sheets</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Connect Sheets</span>
                </>
              )}
            </button>
            
            {isConnected && config?.userEmail && (
              <div className="text-xs text-gray-500">
                {config.userEmail}
              </div>
            )}
            
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Erika Chan</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};