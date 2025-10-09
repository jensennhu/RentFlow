import React, { useState } from 'react';
import { Plus, User, Mail, Phone, Calendar, Edit, Trash2, MapPin, FileText, Grid3X3, List } from 'lucide-react';
import { useData } from '../hooks/useData'; // ✅ fixed import
import type { Tenant } from '../types';

interface TenantManagementProps {
  dataHook: ReturnType<typeof useData>;
}

export const TenantManagement: React.FC<TenantManagementProps> = ({ dataHook }) => {
  
  const { tenants, properties, addTenant, updateTenant, deleteTenant } = dataHook;
  
  // Lease stats
  const leaseStats = React.useMemo(() => {
  const today = new Date();
  const expiringSoon = tenants.filter((t) => {
    const leaseEnd = new Date(t.leaseEnd);
    const daysUntilEnd = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd > 0 && daysUntilEnd <= 60;
  }).length;

  const expired = tenants.filter((t) => new Date(t.leaseEnd) < today).length;

  const active = tenants.length - expiringSoon - expired;

  return { active, expiringSoon, expired };
  }, [tenants]);

  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'rentAmount' | 'leaseEnd'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    leaseStart: '',
    leaseEnd: '',
    rentAmount: '',
    paymentMethod: '' as Tenant['paymentMethod'],
    leaseType: '' as Tenant['leaseType'],
    leaseRenewal: null as string | null, // ✅ safer than ''
  });

  // Filter and sort tenants
  const filteredAndSortedTenants = tenants
    .filter(tenant => {
      const property = properties.find(p => p.id === tenant.propertyId);
      return (
        tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.phone?.includes(searchTerm) ||
        (property?.address?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
    })
    .sort((a, b) => {
      let aValue: string | number | Date | null = a[sortBy as keyof typeof a] as any;
      let bValue: string | number | Date | null = b[sortBy as keyof typeof b] as any;
      
      if (sortBy === 'leaseEnd') {
        aValue = a.leaseEnd ? new Date(a.leaseEnd) : null;
        bValue = b.leaseEnd ? new Date(b.leaseEnd) : null;
      }
      
      if (sortBy === 'rentAmount') {
        aValue = a.rentAmount ?? 0;
        bValue = b.rentAmount ?? 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
    
    console.log('Tenants in component:', tenants);
    console.log('First tenant:', tenants[0]);
    
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      propertyId: '',
      leaseStart: '',
      leaseEnd: '',
      rentAmount: '',
      paymentMethod: '' as Tenant['paymentMethod'],
      leaseType: '' as Tenant['leaseType'],
      leaseRenewal: null, // ✅ reset properly
    });
    setEditingTenant(null);
    setShowForm(false);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      propertyId: tenant.propertyId,
      leaseStart: tenant.leaseStart,
      leaseEnd: tenant.leaseEnd,
      rentAmount: tenant.rentAmount.toString(),
      paymentMethod: tenant.paymentMethod,
      leaseType: tenant.leaseType,
      leaseRenewal: tenant.leaseRenewal ?? null,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tenantData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      propertyId: formData.propertyId,
      leaseStart: formData.leaseStart,
      leaseEnd: formData.leaseEnd,
      rentAmount: parseInt(formData.rentAmount, 10), // ✅ radix specified
      paymentMethod: formData.paymentMethod,
      leaseType: formData.leaseType,
      leaseRenewal: formData.leaseRenewal,
    };

    if (editingTenant) {
      updateTenant(editingTenant.id, tenantData);
    } else {
      addTenant(tenantData);
    }
    
    resetForm();
  };

  const handleDelete = (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (tenant && confirm(`Are you sure you want to delete ${tenant.name}? This will also remove all associated payments.`)) {
      deleteTenant(id);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tenant Management</h2>
          <p className="text-gray-600">Manage tenant information and leases</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Lease Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-500">Active Leases</h4>
          <p className="text-2xl font-bold text-green-600">{leaseStats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-500">Expiring Soon (≤60 days)</h4>
          <p className="text-2xl font-bold text-yellow-600">{leaseStats.expiringSoon}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-500">Expired Leases</h4>
          <p className="text-2xl font-bold text-red-600">{leaseStats.expired}</p>
        </div>
      </div>


      {/* Search and Sort */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'rentAmount' | 'leaseEnd')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="rentAmount">Sort by Rent</option>
            <option value="leaseEnd">Sort by Lease End</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Views */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTenants.map((tenant) => {
            const property = properties.find(p => p.id === tenant.propertyId);
            const leaseEnd = new Date(tenant.leaseEnd);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={tenant.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-gray-600">Tenant</p>
                    </div>
                  </div>
                  {daysUntilExpiry <= 60 && daysUntilExpiry > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                      Expires Soon
                    </span>
                  )}
                  {daysUntilExpiry <= 0 && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      Expired
                    </span>
                  )}
                </div>

                {/* Card details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-sm">{tenant.email}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="text-sm">{tenant.phone}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{property?.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">${tenant.rentAmount}/month</span>
                  </div>
                  {tenant.paymentMethod && (
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm">Payment: {tenant.paymentMethod}</span>
                    </div>
                  )}
                  {tenant.leaseType && (
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm">Lease: {tenant.leaseType}</span>
                    </div>
                  )}
                  {tenant.leaseRenewal && (
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm">Renewal: {new Date(tenant.leaseRenewal).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(tenant)}
                    className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(tenant.id)}
                    className="flex-1 bg-red-50 text-red-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTenants.map((tenant) => {
                  const property = properties.find(p => p.id === tenant.propertyId);
                  const leaseEnd = new Date(tenant.leaseEnd);
                  const today = new Date();
                  const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{tenant.email}</div>
                        <div className="text-sm text-gray-500">{tenant.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property?.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${tenant.rentAmount}/month
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {daysUntilExpiry <= 0 ? (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">Expired</span>
                        ) : daysUntilExpiry <= 60 ? (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">Expires Soon</span>
                        ) : (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                        <button 
                            onClick={() => handleEdit(tenant)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                          </button>
                          <button 
                            onClick={() => handleDelete(tenant.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Tenant Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h3>

              {editingTenant && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Editing this tenant will overwrite existing data.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select property</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>
                          {property.address}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start</label>
                    <input
                      type="date"
                      value={formData.leaseStart}
                      onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lease End</label>
                    <input
                      type="date"
                      value={formData.leaseEnd}
                      onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rent Amount</label>
                    <input
                      type="number"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as Tenant['paymentMethod'] })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select payment method</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="online_payment">Online Payment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lease Type</label>
                    <select
                      value={formData.leaseType}
                      onChange={(e) => setFormData({ ...formData, leaseType: e.target.value as Tenant['leaseType'] })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select lease type</option>
                      <option value="fixed">Fixed Term</option>
                      <option value="month_to_month">Month-to-Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lease Renewal</label>
                    <input
                      type="date"
                      value={formData.leaseRenewal || ''}
                      onChange={(e) => setFormData({ ...formData, leaseRenewal: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingTenant ? 'Update Tenant' : 'Add Tenant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
