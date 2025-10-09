import React, { useMemo } from 'react';
import {
  Home,
  Users,
  DollarSign,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../hooks/useData';

interface DashboardProps {
  onSync: () => void;
  isSyncing: boolean;
  dataHook: ReturnType<typeof useData>;
}

//

interface DataChange {
  id: string;
  type: 'add' | 'update' | 'delete';
  table: 'properties' | 'tenants' | 'payments' | 'repairRequests';
  current?: unknown;
  new?: unknown;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

//

export const Dashboard: React.FC<DashboardProps> = ({ onSync: _onSync, isSyncing: _isSyncing, dataHook }) => {
  const { properties, tenants, payments, repairRequests } = dataHook;

  // Received rent in current month
  const receivedRent = useMemo(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return payments
      .filter(p => {
        const paymentDate = new Date(p.date); // adjust if field is rent_month instead
        return paymentDate >= firstDayOfMonth && paymentDate <= lastDayOfMonth;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);
  
  // Filter only submitted or in-progress repairs
  const activeRepairs = useMemo(
    () => repairRequests.filter(r => r.status === 'pending' || r.status === 'in-progress'),
    [repairRequests]
  );

  const urgentRepairs = useMemo(
    () => activeRepairs.filter(r => r.priority === 'urgent').length,
    [activeRepairs]
  );

  // Property stats
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
  const vacantProperties = properties.filter(p => p.status === 'vacant').length;
  const expectedRevenue = properties
    .filter(p => p.status === 'occupied')
    .reduce((sum, p) => sum + p.rent, 0);

  // Lease Alerts
  const leaseAlerts = useMemo(() => {
    const today = new Date();
    return tenants
      .map(t => {
        const leaseEnd = new Date(t.leaseEnd);
        const daysUntilEnd = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'expiring' | 'expired' | null = null;
        if (daysUntilEnd <= 60 && daysUntilEnd > 0) status = 'expiring';
        else if (daysUntilEnd <= 0) status = 'expired';
        if (!status) return null;
        const property = properties.find(p => p.id === t.propertyId);
        return {
          id: t.id,
          tenantName: t.name,
          propertyAddress: property?.address || 'Unknown Property',
          leaseEnd: t.leaseEnd,
          status,
        };
      })
      .filter(Boolean) as {
        id: string;
        tenantName: string;
        propertyAddress: string;
        leaseEnd: string;
        status: 'expiring' | 'expired';
      }[];
  }, [tenants, properties]);

  // Stats cards
  const stats = [
    { name: 'Properties', value: totalProperties, icon: Home, color: 'blue' },
    { name: 'Occupied', value: occupiedProperties, icon: Users, color: 'green' },
    { name: 'Vacant', value: vacantProperties, icon: Users, color: 'gray' },
    { name: 'Expected Revenue', value: `${expectedRevenue.toLocaleString()}`, icon: DollarSign, color: 'yellow' },
    { name: 'Received Rent', value: `${receivedRent.toLocaleString()}`, icon: DollarSign, color: 'green' },
    { name: 'Pending Repairs', value: activeRepairs.length, icon: Wrench, color: 'orange' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Manage your rental properties, tenants, payments, and repairs</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
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

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lease Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Lease Alerts</h3>
            {leaseAlerts.length > 0 && (
              <span className="flex items-center text-sm font-medium text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {leaseAlerts.length} Alert{leaseAlerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {leaseAlerts.length > 0 ? (
              leaseAlerts.map(alert => (
                <div
                  key={`lease-${alert.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.propertyAddress}</p>
                    <p className="text-sm text-gray-600">
                      Tenant: {alert.tenantName} • Lease ends {alert.leaseEnd}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.status === "expiring"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {alert.status === "expiring" ? "Expiring Soon" : "Expired"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-6">No lease alerts</p>
            )}
          </div>
        </div>

        {/* Repair Requests */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Repair Requests</h3>
            {urgentRepairs > 0 && (
              <span className="flex items-center text-sm font-medium text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {urgentRepairs} Urgent Repair{urgentRepairs > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-75 overflow-y-auto pr-2">
            {activeRepairs.length > 0 ? (
              activeRepairs.map(repair => {
                const property = properties.find(p => p.id === repair.propertyId);
                return (
                  <div
                    key={`repair-${repair.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{repair.title}</p>
                      <p className="text-sm text-gray-600">
                        {property?.address || "Unknown Property"} • {repair.category} • {repair.dateSubmitted}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        repair.priority === "urgent"
                          ? "bg-red-100 text-red-800"
                          : repair.priority === "high"
                          ? "bg-orange-100 text-orange-800"
                          : repair.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {repair.priority}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-6">No repair requests</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
