import React, { useState, useMemo } from 'react';
import { Plus, Calendar, DollarSign, CreditCard, AlertTriangle, TrendingUp, Filter, Search, Edit, Trash2, Grid3X3, List, BarChart3 } from 'lucide-react';
import { PaymentGeneration } from './PaymentGeneration';
import type { useData } from '../hooks/useData';

interface PaymentPortalProps {
  dataHook: ReturnType<typeof useData>;
}

interface MonthlyPaymentData {
  propertyId: string;
  propertyAddress: string;
  monthlyData: { [month: string]: { paid: number; expected: number; status: 'paid' | 'partial' | 'missing' } };
  totalPaid: number;
  totalExpected: number;
}

export const PaymentPortal: React.FC<PaymentPortalProps> = ({ dataHook }) => {
  const { properties, tenants, payments, addPayment, updatePayment, deletePayment } = dataHook;
  
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'aggregate'>('payments');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'property'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState({
    propertyId: '',
    tenantId: '',
    amount: '',
    amountPaid: '',
    rentMonth: '',
    date: '',
    method: '',
    status: 'Not Paid Yet' as const
  });

  // Current year months for aggregate view
  const currentYear = new Date().getFullYear();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Aggregate data calculation
  const aggregateData = useMemo((): MonthlyPaymentData[] => {
    const propertyMap = new Map<string, MonthlyPaymentData>();

    // Initialize all properties
    properties.forEach(property => {
      const monthlyData: { [month: string]: { paid: number; expected: number; status: 'paid' | 'partial' | 'missing' } } = {};
      
      months.forEach(month => {
        const monthKey = `${month} ${currentYear}`;
        monthlyData[month] = { paid: 0, expected: 0, status: 'missing' };
      });

      propertyMap.set(property.id, {
        propertyId: property.id,
        propertyAddress: property.address,
        monthlyData,
        totalPaid: 0,
        totalExpected: 0
      });
    });

    // Process payments for current year
    payments.forEach(payment => {
      const property = propertyMap.get(payment.propertyId);
      if (!property) return;

      // Extract month from rentMonth (e.g., "January 2024")
      const [monthName, year] = payment.rentMonth.split(' ');
      if (parseInt(year) !== currentYear) return;

      const monthData = property.monthlyData[monthName];
      if (monthData) {
        monthData.paid += payment.amountPaid || 0;
        monthData.expected += payment.amount || 0;
        
        // Determine status
        if (monthData.paid === 0) {
          monthData.status = 'missing';
        } else if (monthData.paid >= monthData.expected) {
          monthData.status = 'paid';
        } else {
          monthData.status = 'partial';
        }

        property.totalPaid += payment.amountPaid || 0;
        property.totalExpected += payment.amount || 0;
      }
    });

    return Array.from(propertyMap.values()).sort((a, b) => 
      a.propertyAddress.localeCompare(b.propertyAddress)
    );
  }, [properties, payments, currentYear, months]);

  // Filter and sort payments for main view
  const filteredAndSortedPayments = useMemo(() => {
    return payments
      .filter(payment => {
        const property = properties.find(p => p.id === payment.propertyId);
        const tenant = tenants.find(t => t.id === payment.tenantId);
        
        const matchesSearch = (
          payment.rentMonth.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (property?.address.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (tenant?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          payment.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any = a[sortBy as keyof typeof a];
        let bValue: any = b[sortBy as keyof typeof b];
        
        if (sortBy === 'property') {
          const propA = properties.find(p => p.id === a.propertyId);
          const propB = properties.find(p => p.id === b.propertyId);
          aValue = propA?.address || '';
          bValue = propB?.address || '';
        }
        
        if (sortBy === 'date') {
          aValue = new Date(a.date || '1970-01-01');
          bValue = new Date(b.date || '1970-01-01');
        }
        
        if (sortBy === 'amount') {
          aValue = a.amount;
          bValue = b.amount;
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
  }, [payments, properties, tenants, searchTerm, filterStatus, sortBy, sortOrder]);

  const resetForm = () => {
    setFormData({
      propertyId: '',
      tenantId: '',
      amount: '',
      amountPaid: '',
      rentMonth: '',
      date: '',
      method: '',
      status: 'Not Paid Yet'
    });
    setEditingPayment(null);
    setShowForm(false);
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment);
    setFormData({
      propertyId: payment.propertyId,
      tenantId: payment.tenantId || '',
      amount: payment.amount.toString(),
      amountPaid: payment.amountPaid.toString(),
      rentMonth: payment.rentMonth,
      date: payment.date || '',
      method: payment.method || '',
      status: payment.status
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentData = {
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      amount: parseInt(formData.amount),
      amountPaid: parseInt(formData.amountPaid),
      rentMonth: formData.rentMonth,
      date: formData.date,
      method: formData.method,
      status: formData.status
    };

    if (editingPayment) {
      updatePayment(editingPayment.id, paymentData);
    } else {
      addPayment(paymentData);
    }
    
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      deletePayment(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Partially Paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getCellColor = (status: 'paid' | 'partial' | 'missing', paid: number) => {
    if (paid === 0) return 'bg-red-50 text-red-800 border-red-200';
    if (status === 'paid') return 'bg-green-50 text-green-800 border-green-200';
    if (status === 'partial') return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Payment generation handlers
  const occupiedPropertiesCount = properties.filter(p => p.status === 'occupied').length;
  const totalPropertiesCount = properties.length;

  const handleGenerateForMonth = (month: number, year: number, force?: boolean) => {
    return dataHook.generatePaymentsForSpecificMonth(month, year, force);
  };

  const handleGenerateRange = (startMonth: number, startYear: number, endMonth: number, endYear: number) => {
    return dataHook.generatePaymentsForRange(startMonth, startYear, endMonth, endYear);
  };

  const handleGenerateCurrentAndNext = () => {
    return dataHook.generateCurrentAndNextMonth();
  };

  const handleGenerateUpcoming = (monthsAhead: number) => {
    return dataHook.generateUpcomingMonths(monthsAhead);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Portal</h2>
          <p className="text-gray-600">Track rent payments and generate payment records</p>
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
            Add Payment
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab('payments')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeSubTab === 'payments'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="h-4 w-4 mr-2 inline" />
          Payment Records
        </button>
        <button
          onClick={() => setActiveSubTab('aggregate')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeSubTab === 'aggregate'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2 inline" />
          Aggregate View
        </button>
      </div>

      {activeSubTab === 'payments' ? (
        <>
          {/* Payment Generation Section */}
          <div className="mb-8">
            <PaymentGeneration
              onGenerateForMonth={handleGenerateForMonth}
              onGenerateRange={handleGenerateRange}
              onGenerateCurrentAndNext={handleGenerateCurrentAndNext}
              onGenerateUpcoming={handleGenerateUpcoming}
              occupiedPropertiesCount={occupiedPropertiesCount}
              totalPropertiesCount={totalPropertiesCount}
            />
          </div>

          {/* Filter Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Not Paid Yet">Not Paid Yet</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
                <option value="property">Sort by Property</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Payments List */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPayments.map((payment) => {
                const property = properties.find(p => p.id === payment.propertyId);
                const tenant = tenants.find(t => t.id === payment.tenantId);
                
                return (
                  <div key={payment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{payment.rentMonth}</h3>
                          <p className="text-sm text-gray-600">{property?.address}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Expected:</span>
                        <span className="font-medium">${payment.amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium">${payment.amountPaid}</span>
                      </div>
                      {tenant && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tenant:</span>
                          <span className="font-medium">{tenant.name}</span>
                        </div>
                      )}
                      {payment.method && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Method:</span>
                          <span className="font-medium">{payment.method}</span>
                        </div>
                      )}
                      {payment.date && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{new Date(payment.date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(payment)}
                        className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(payment.id)}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedPayments.map((payment) => {
                      const property = properties.find(p => p.id === payment.propertyId);
                      const tenant = tenants.find(t => t.id === payment.tenantId);
                      
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {property?.address}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tenant?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.rentMonth}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${payment.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${payment.amountPaid}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.method || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.date ? new Date(payment.date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEdit(payment)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(payment.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
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

          {filteredAndSortedPayments.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600">No payment records match the current filter.</p>
            </div>
          )}
        </>
      ) : (
        /* Aggregate View */
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expected ({currentYear})</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(aggregateData.reduce((sum, prop) => sum + prop.totalExpected, 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Collected ({currentYear})</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(aggregateData.reduce((sum, prop) => sum + prop.totalPaid, 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      aggregateData.reduce((sum, prop) => sum + prop.totalExpected, 0) -
                      aggregateData.reduce((sum, prop) => sum + prop.totalPaid, 0)
                    )}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {aggregateData.reduce((sum, prop) => sum + prop.totalExpected, 0) > 0
                      ? Math.round((aggregateData.reduce((sum, prop) => sum + prop.totalPaid, 0) / 
                          aggregateData.reduce((sum, prop) => sum + prop.totalExpected, 0)) * 100)
                      : 0}%
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Aggregate Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Payment Summary by Property - {currentYear}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Red cells indicate missing payments, yellow indicates partial payments
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      Property
                    </th>
                    {months.map(month => (
                      <th key={month} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        {month.slice(0, 3)}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Paid
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Expected
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aggregateData.map((propertyData) => (
                    <tr key={propertyData.propertyId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="max-w-xs truncate" title={propertyData.propertyAddress}>
                          {propertyData.propertyAddress}
                        </div>
                      </td>
                      {months.map(month => {
                        const monthData = propertyData.monthlyData[month];
                        return (
                          <td key={month} className={`px-4 py-4 text-center text-sm border ${getCellColor(monthData.status, monthData.paid)}`}>
                            <div className="font-medium">
                              {monthData.paid > 0 ? formatCurrency(monthData.paid) : '-'}
                            </div>
                            {monthData.expected > 0 && monthData.expected !== monthData.paid && (
                              <div className="text-xs opacity-75">
                                of {formatCurrency(monthData.expected)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center text-sm font-medium text-green-600">
                        {formatCurrency(propertyData.totalPaid)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {formatCurrency(propertyData.totalExpected)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span className="text-sm text-gray-600">Fully Paid</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                <span className="text-sm text-gray-600">Partially Paid</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span className="text-sm text-gray-600">Missing/Unpaid</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                <span className="text-sm text-gray-600">No Payment Expected</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Payment Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingPayment ? 'Edit Payment' : 'Add New Payment'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                    <select
                      required
                      value={formData.propertyId}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
                    <select
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Tenant</option>
                      {tenants
                        .filter(tenant => !formData.propertyId || tenant.propertyId === formData.propertyId)
                        .map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rent Month</label>
                  <input
                    type="text"
                    required
                    value={formData.rentMonth}
                    onChange={(e) => setFormData({ ...formData, rentMonth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="January 2024"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Amount</label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid</label>
                    <input
                      type="number"
                      required
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <input
                      type="text"
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bank Transfer, Cash, etc."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingPayment ? 'Update Payment' : 'Add Payment'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
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