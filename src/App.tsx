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
import { useData } from './hooks/useData';
import type { SyncStatus } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

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
    // This could be used to show setup instructions or configuration
    console.log('Supabase setup requested');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onOpenSupabaseSetup={() => setShowSupabaseSetup(true)} />
      
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-64 flex-shrink-0">
          <Navigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        </div>
        
        <main className="flex-1 overflow-y-auto">
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
}

export default App;