import React, { useMemo, useState } from 'react';
import {
  Home,
  Users,
  DollarSign,
  Wrench,
  AlertTriangle,
  Download,
  CheckSquare
} from 'lucide-react';
import { useData } from '../hooks/useData';

interface DashboardProps {
  onSync: () => void;
  isSyncing: boolean;
  dataHook: ReturnType<typeof useData>;
}

// CSV Export Helper Functions
const convertToCSV = (data: any[], headers: string[]) => {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const Dashboard: React.FC<DashboardProps> = ({ onSync: _onSync, isSyncing: _isSyncing, dataHook }) => {
  const { properties, tenants, payments, repairRequests } = dataHook;
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Received rent in current month
  const receivedRent = useMemo(() => {
    const today = new Date();
    const currentMonthStr = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    return payments
      .filter(p => p.rentMonth === currentMonthStr)
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
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
          daysUntilEnd
        };
      })
      .filter(Boolean) as {
        id: string;
        tenantName: string;
        propertyAddress: string;
        leaseEnd: string;
        status: 'expiring' | 'expired';
        daysUntilEnd: number;
      }[];
  }, [tenants, properties]);

  // CSV Export Functions
  const exportProperties = () => {
    const data = properties.map(p => {
      const tenant = tenants.find(t => t.propertyId === p.id);
      return {
        Address: p.address,
        City: p.city,
        State: p.state,
        Zipcode: p.zipcode,
        'Monthly Rent': p.rent,
        Status: p.status,
        'Tenant Name': tenant?.name || 'N/A',
        'Tenant Email': tenant?.email || 'N/A',
        'Lease Start': tenant?.leaseStart || 'N/A',
        'Lease End': tenant?.leaseEnd || 'N/A'
      };
    });
    
    const csv = convertToCSV(data, Object.keys(data[0] || {}));
    downloadCSV(csv, `properties-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportTenants = () => {
    const data = tenants.map(t => {
      const property = properties.find(p => p.id === t.propertyId);
      const today = new Date();
      const leaseEnd = new Date(t.leaseEnd);
      const daysUntilEnd = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        Name: t.name,
        Email: t.email,
        Phone: t.phone,
        Property: property?.address || 'Unknown',
        'Lease Start': t.leaseStart,
        'Lease End': t.leaseEnd,
        'Days Until Expiry': daysUntilEnd,
        'Rent Amount': t.rentAmount || property?.rent || 0,
        'Payment Method': t.paymentMethod || 'N/A',
        'Lease Type': t.leaseType || 'N/A'
      };
    });
    
    const csv = convertToCSV(data, Object.keys(data[0] || {}));
    downloadCSV(csv, `tenants-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportPayments = () => {
    const data = payments.map(p => {
      const property = properties.find(prop => prop.id === p.propertyId);
      const tenant = tenants.find(t => t.id === p.tenantId);
      
      return {
        'Rent Month': p.rentMonth,
        Property: property?.address || 'Unknown',
        Tenant: tenant?.name || 'Unknown',
        'Expected Amount': p.amount,
        'Amount Paid': p.amountPaid,
        'Outstanding': p.amount - p.amountPaid,
        Status: p.status,
        'Payment Date': p.date || 'N/A'
      };
    });
    
    const csv = convertToCSV(data, Object.keys(data[0] || {}));
    downloadCSV(csv, `payments-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportRepairs = () => {
    const data = repairRequests.map(r => {
      const property = properties.find(p => p.id === r.propertyId);
      const tenant = tenants.find(t => t.id === r.tenantId);
      
      return {
        Title: r.title,
        Description: r.description,
        Property: property?.address || 'Unknown',
        Tenant: tenant?.name || 'Unknown',
        Category: r.category,
        Priority: r.priority,
        Status: r.status,
        'Date Submitted': r.dateSubmitted,
        'Date Resolved': r.dateResolved || 'N/A',
        'Close Notes': r.closeNotes || 'N/A'
      };
    });
    
    const csv = convertToCSV(data, Object.keys(data[0] || {}));
    downloadCSV(csv, `repairs-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportLeaseAlerts = () => {
    const data = leaseAlerts.map(alert => ({
      'Tenant Name': alert.tenantName,
      Property: alert.propertyAddress,
      'Lease End Date': alert.leaseEnd,
      'Days Until Expiry': alert.daysUntilEnd,
      Status: alert.status
    }));
    
    const csv = convertToCSV(data, Object.keys(data[0] || {}));
    downloadCSV(csv, `lease-alerts-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

  const exportAllData = () => {
    // Create a comprehensive export with all data
    const summary = {
      'Export Date': new Date().toISOString().split('T')[0],
      'Total Properties': totalProperties,
      'Occupied Properties': occupiedProperties,
      'Vacant Properties': vacantProperties,
      'Expected Revenue': expectedRevenue,
      'Received Rent (Current Month)': receivedRent,
      'Active Repairs': activeRepairs.length,
      'Urgent Repairs': urgentRepairs,
      'Lease Alerts': leaseAlerts.length
    };
    
    let csv = '=== DASHBOARD SUMMARY ===\n';
    csv += convertToCSV([summary], Object.keys(summary)) + '\n\n';
    
    csv += '=== PROPERTIES ===\n';
    const propertiesData = properties.map(p => ({
      Address: p.address,
      City: p.city,
      State: p.state,
      Rent: p.rent,
      Status: p.status
    }));
    csv += convertToCSV(propertiesData, Object.keys(propertiesData[0] || {})) + '\n\n';
    
    csv += '=== TENANTS ===\n';
    const tenantsData = tenants.map(t => ({
      Name: t.name,
      Email: t.email,
      Phone: t.phone,
      LeaseEnd: t.leaseEnd
    }));
    csv += convertToCSV(tenantsData, Object.keys(tenantsData[0] || {})) + '\n\n';
    
    csv += '=== LEASE ALERTS ===\n';
    const alertsData = leaseAlerts.map(a => ({
      Tenant: a.tenantName,
      Property: a.propertyAddress,
      LeaseEnd: a.leaseEnd,
      Status: a.status
    }));
    csv += convertToCSV(alertsData, Object.keys(alertsData[0] || {})) + '\n\n';
    
    csv += '=== ACTIVE REPAIRS ===\n';
    const repairsData = activeRepairs.map(r => ({
      Title: r.title,
      Priority: r.priority,
      Status: r.status,
      Submitted: r.dateSubmitted
    }));
    csv += convertToCSV(repairsData, Object.keys(repairsData[0] || {}));
    
    downloadCSV(csv, `dashboard-full-export-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };

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
        
        {/* Export Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
          
          {showExportMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowExportMenu(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Export Options
                  </div>
                  
                  <button
                    onClick={exportAllData}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md flex items-center"
                  >
                    <CheckSquare className="h-4 w-4 mr-2 text-blue-600" />
                    Complete Dashboard Export
                  </button>
                  
                  <div className="border-t border-gray-200 my-2"></div>
                  
                  <button
                    onClick={exportProperties}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Properties ({properties.length})
                  </button>
                  
                  <button
                    onClick={exportTenants}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Tenants ({tenants.length})
                  </button>
                  
                  <button
                    onClick={exportPayments}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payments ({payments.length})
                  </button>
                  
                  <button
                    onClick={exportRepairs}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Repair Requests ({repairRequests.length})
                  </button>
                  
                  <button
                    onClick={exportLeaseAlerts}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Lease Alerts ({leaseAlerts.length})
                  </button>
                </div>
              </div>
            </>
          )}
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