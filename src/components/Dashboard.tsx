import React, { useMemo } from 'react';
import {
  Home,
  Users,
  DollarSign,
  Wrench,
  AlertTriangle,
  Database,
  RefreshCw,
  Calendar,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { googleAuthService } from '../components/GoogleAuthStatus';
import type { useData } from '../hooks/useData';
import { PaymentGeneration } from './PaymentGeneration';
import { calculateStatusForMonth } from './PaymentPortal';
import type { Payment, Tenant, Property } from '../types';

interface DashboardProps {
  onSync: () => void;
  isSyncing: boolean;
  dataHook: ReturnType<typeof useData>;
}

interface MissingPaymentsByMonth {
  month: string;
  expected: number;
  received: number;
  missing: number;
  missingAmount: number;
  occupiedProperties: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onSync, isSyncing, dataHook }) => {
  const { properties, tenants, payments, repairRequests } = dataHook;
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter((p) => p.status === 'occupied').length;
  const vacantProperties = properties.filter((p) => p.status === 'vacant').length;

  const expectedRevenue = properties
    .filter((p) => p.status === 'occupied')
    .reduce((sum, p) => sum + p.rent, 0);

  const pendingRepairs = repairRequests.filter((r) => r.status !== 'completed').length;
  const urgentRepairs = repairRequests.filter(
    (r) => r.priority === 'urgent' && r.status !== 'completed'
  ).length;

  const isConnected = googleAuthService.isConnected();

  // Grouped payment statuses
  const { totalPaid, totalPartial, totalNotPaid, totalRevenue } = useMemo(() => {
    const uniqueTenantMonths = Array.from(
      new Set(payments.map((p) => `${p.propertyId}-${p.rentMonth}`))
    );

    let paid = 0;
    let partial = 0;
    let notPaid = 0;
    let revenue = 0;

    uniqueTenantMonths.forEach((key) => {
      const [propertyId, rentMonth] = key.split('-');
      const tenant = tenants.find((t) => t.propertyId === propertyId);
      if (!tenant) return;

      const status = calculateStatusForMonth(payments, tenant.id, rentMonth, tenants, properties);

      if (status === 'Paid') paid++;
      else if (status === 'Partially Paid') partial++;
      else notPaid++;

      const monthPayments = payments.filter(
        (p) => p.propertyId === propertyId && p.rentMonth === rentMonth
      );
      revenue += monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    });

    return {
      totalPaid: paid,
      totalPartial: partial,
      totalNotPaid: notPaid,
      totalRevenue: revenue,
    };
  }, [payments, tenants, properties]);

  // Missing payments by month
  const missingPaymentsByMonth = useMemo(() => {
    const monthlyData: Record<string, MissingPaymentsByMonth> = {};

    const allMonths = [...new Set(payments.map((p) => p.rentMonth).filter(Boolean))];

    allMonths.forEach((month) => {
      const occupiedProps = properties.filter((p) => p.status === 'occupied');
      const monthPayments = payments.filter((p) => p.rentMonth === month);

      const propertiesWithPayments = new Set(monthPayments.map((p) => p.propertyId));
      const missingPaymentProperties = occupiedProps.filter((p) => !propertiesWithPayments.has(p.id));

      const receivedPayments = monthPayments.filter(
        (p) => p.status === 'Paid' || p.status === 'Partially Paid'
      ).length;

      const expectedPayments = occupiedProps.length;
      const missingCount = Math.max(0, expectedPayments - monthPayments.length);

      const missingAmount = missingPaymentProperties.reduce((sum, prop) => {
        const tenant = tenants.find((t) => t.propertyId === prop.id);
        return sum + (tenant?.rentAmount || prop.rent);
      }, 0);

      monthlyData[month] = {
        month,
        expected: expectedPayments,
        received: receivedPayments,
        missing: missingCount,
        missingAmount,
        occupiedProperties: occupiedProps.map((p) => p.address),
      };
    });

    return Object.values(monthlyData).sort((a, b) => {
      const dateA = new Date(`${a.month} 1, 2024`);
      const dateB = new Date(`${b.month} 1, 2024`);
      return (dateB.getTime() || 0) - (dateA.getTime() || 0);
    });
  }, [properties, tenants, payments]);

  // Current month summary
  const currentMonthData = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return (
      missingPaymentsByMonth.find((data) => data.month === currentMonth) || {
        month: currentMonth,
        expected: occupiedProperties,
        received: 0,
        missing: occupiedProperties,
        missingAmount: expectedRevenue,
        occupiedProperties: properties.filter((p) => p.status === 'occupied').map((p) => p.address),
      }
    );
  }, [missingPaymentsByMonth, occupiedProperties, expectedRevenue, properties]);

  const totalMissingPayments = missingPaymentsByMonth.reduce((sum, data) => sum + data.missing, 0);
  const totalMissingAmount = missingPaymentsByMonth.reduce(
    (sum, data) => sum + data.missingAmount,
    0
  );

  // 🔧 Fixed: stats now include icons and colors
  const stats = [
    { name: 'Properties', value: totalProperties, icon: Home, color: 'blue' },
    { name: 'Occupied', value: occupiedProperties, icon: Users, color: 'green' },
    { name: 'Vacant', value: vacantProperties, icon: Users, color: 'gray' },
    {
      name: 'Expected Revenue',
      value: `$${expectedRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'yellow',
    },
    {
      name: 'Revenue Collected',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      name: 'Payments',
      value: `Paid ${totalPaid} | Partial ${totalPartial} | Not Paid ${totalNotPaid}`,
      icon: DollarSign,
      color: 'indigo',
    },
    { name: 'Pending Repairs', value: pendingRepairs, icon: Wrench, color: 'orange' },
    { name: 'Urgent Repairs', value: urgentRepairs, icon: AlertTriangle, color: 'red' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        {/* Recent Repair Requests */}
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
            {repairRequests.length > 0 ? (
              repairRequests.slice(0, 3).map((repair) => {
                const property = properties.find(p => p.id === repair.propertyId);
                return (
                  <div key={repair.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{repair.title}</p>
                      <p className="text-sm text-gray-600">
                        {property?.address || 'Unknown Property'} • {repair.category} • {repair.dateSubmitted}
                      </p>
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
                );
              })
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Wrench className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No repair requests</p>
              </div>
            )}
          </div>
        </div>

        {/* Property Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Overview</h3>
          <div className="space-y-3">
            {properties.length > 0 ? (
              properties.slice(0, 5).map((property) => {
                const tenant = tenants.find(t => t.propertyId === property.id);
                return (
                  <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{property.address}</p>
                      <p className="text-sm text-gray-600">
                        ${property.rent.toLocaleString()}/month
                        {tenant && <span> • {tenant.name}</span>}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      property.status === 'occupied' ? 'bg-green-100 text-green-800' :
                      property.status === 'vacant' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Home className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No properties added yet</p>
              </div>
            )}
          </div>
          
          {/* Property Summary */}
          {properties.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">{occupiedProperties}</div>
                  <div className="text-xs text-gray-500">Occupied</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-600">{vacantProperties}</div>
                  <div className="text-xs text-gray-500">Vacant</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">
                    {properties.filter(p => p.status === 'maintenance').length}
                  </div>
                  <div className="text-xs text-gray-500">Maintenance</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
        <div className="space-y-3">
          {payments.length > 0 ? (
            payments
              .filter(p => p.status === 'Paid')
              .slice(0, 5)
              .map((payment) => {
                const property = properties.find(p => p.id === payment.propertyId);
                const tenant = tenants.find(t => t.propertyId === payment.propertyId);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {property?.address || 'Unknown Property'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {tenant?.name || 'Unknown Tenant'} • {payment.rentMonth} • {payment.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${payment.amountPaid.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{payment.date}</p>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-6 text-gray-500">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No payments recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};