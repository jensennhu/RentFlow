// src/App.tsx
import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { PropertyManagement } from './components/PropertyManagement';
import { TenantManagement } from './components/TenantManagement';
import { PaymentPortal } from './components/PaymentPortal';
import { RepairManagement } from './components/RepairManagement';
import { SupabaseSetup } from './components/SupabaseSetup';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import type { SyncStatus } from './types';

// Main App Component (wrapped with auth)
const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const dataHook = useData();
  const isSupabaseEnabled = import.meta.env.VITE_USE_SUPABASE === 'true';

  const handleSync = async () => {
    if (!isSupabaseEnabled) {
      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: 'error',
        message: 'Supabase is not configured. Enable VITE_USE_SUPABASE and set up your Supabase credentials.'
      });
      return;
    }

    try {
      const result = await dataHook.syncWithSupabase();
      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: result.success ? 'success' : 'error',
        message: result.message
      });
    } catch (error) {
      setSyncStatus({
        lastSync: new Date().toISOString(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to sync data with Supabase'
      });
    }
  };

  const handleSupabaseSetup = () => {
    console.log('Supabase setup requested');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onSync={handleSync} isSyncing={dataHook.isSyncing} dataHook={dataHook} />;
      case 'properties':
        return <PropertyManagement dataHook={dataHook} />;
      case 'tenants':
        return <TenantManagement dataHook={dataHook} />;
      case 'payments':
        return <PaymentPortal dataHook={dataHook} />;
      case 'repairs':
        return <RepairManagement dataHook={dataHook} />;
      default:
        return <Dashboard onSync={handleSync} isSyncing={dataHook.isSyncing} dataHook={dataHook} />;
    }
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth page if user is not authenticated
  if (!user) {
    return <AuthPage />;
  }

  // Show main app if user is authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onOpenSupabaseSetup={() => setShowSupabaseSetup(true)} 
        user={user}
        onSignOut={handleSignOut}
      />
      
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Hover trigger area - thin strip on the left edge */}
        <div 
          className="fixed left-0 top-[64px] h-[calc(100vh-64px)] w-2 bg-transparent"
          style={{ zIndex: 9998 }}
          onMouseEnter={() => setIsSidebarExpanded(true)}
        />
        
        <div 
          className={`fixed left-0 top-[64px] h-[calc(100vh-64px)] bg-white border-r border-gray-200 shadow-2xl transition-transform duration-300 ease-in-out ${
            isSidebarExpanded ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: '256px', zIndex: 9999 }}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <Navigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            isExpanded={isSidebarExpanded}
          />
        </div>
        
        <main className="flex-1 overflow-y-auto w-full">
          {syncStatus && (
            <div className={`mx-6 mt-4 p-3 rounded-lg ${
              syncStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <p className="text-sm font-medium">{syncStatus.message}</p>
              <p className="text-xs opacity-75">
                Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
              </p>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
      
      <SupabaseSetup
        isOpen={showSupabaseSetup}
        onClose={() => setShowSupabaseSetup(false)}
        onSetup={handleSupabaseSetup}
      />
    </div>
  );
};

// Root App Component with Auth Provider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;