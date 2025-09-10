import React from 'react';
import { Home, Users, DollarSign, Wrench, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { googleAuthService } from '../services/googleAuth';
import type { useData } from '../hooks/useData';

interface DashboardProps {
  onSync: () => void;
  isSyncing: boolean;
  dataHook: ReturnType<typeof useData>;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSync, isSyncing, dataHook }) => {
  const { properties, tenants, payments, repairRequests } = dataHook;
  
  // Filter out properties with id = 0 first (TEST Property)
  const filteredProperties = properties.filter(p => p.id !== '0');

  const totalProperties = filteredProperties.length;
  const occupiedProperties = filteredProperties.filter(p => p.status === 'occupied' && p.id !== '0').length;

  // Assuming payments and repairRequests have no id field filtering needs
  const totalRevenue = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amountPaid, 0);
  const pendingRepairs = repairRequests.filter(r => r.status !== 'completed').length;
  const urgentRepairs = repairRequests.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;

  const isConnected = googleAuthService.isConnected();

  const occupied_percent = (occupiedProperties / totalProperties) * 100;

  const stats = [
    //{ label: 'Total Properties', value: totalProperties, icon: Home, color: 'blue' },
    { label: 'Occupied Units', value: `${occupied_percent.toLocaleString()}%`, icon: Users, color: 'green' },
    { label: 'Pending Repairs', value: pendingRepairs, icon: Wrench, color: 'amber' },
    { label: 'Monthly Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'emerald' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Landlord Dashboard</h2>
          <p className="text-gray-600">Manage your rental properties and tenants</p>
        </div>
        
        {isConnected && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing with Sheets...</span>
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                <span>Sync with Sheets</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Repair Requests</h3>
            {urgentRepairs > 0 && (
              <span className="flex items-center text-red-600 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {urgentRepairs} Urgent
              </span>
            )}
          </div>
          <div className="space-y-3">
            {repairRequests.slice(0, 3).map((repair) => (
              <div key={repair.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{repair.title}</p>
                  <p className="text-sm text-gray-600">{repair.category} • {repair.dateSubmitted}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  repair.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  repair.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  repair.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {repair.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Overview</h3>
          <div className="space-y-3">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{property.address}</p>
                  <p className="text-sm text-gray-600">${property.rent}/month</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  property.status === 'occupied' ? 'bg-green-100 text-green-800' :
                  property.status === 'vacant' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {property.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};