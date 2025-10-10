import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Calendar, DollarSign, CreditCard, AlertTriangle, TrendingUp, Search, Edit, Trash2, Grid3X3, List, BarChart3, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import type { useData } from '../hooks/useData';
import type { Payment } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface PaymentPortalProps {
  dataHook: ReturnType<typeof useData>;
}

interface MonthlyPaymentData {
  propertyId: string;
  propertyAddress: string;
  tenantNames: string[];
  monthlyData: { [month: string]: { paid: number; expected: number; status: 'paid' | 'partial' | 'missing' } };
  totalPaid: number;
  totalExpected: number;
}

interface ChartDataPoint {
  month: string;
  revenue: number;
  date?: Date;
}

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export const PaymentPortal: React.FC<PaymentPortalProps> = ({ dataHook }) => {
  const { properties, tenants, payments, addPayment, updatePayment, deletePayment } = dataHook;
  
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'aggregate'>('payments');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'property'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
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
  const months = useMemo(
    () => [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    []
  );

  // Enhanced month parsing
  const parseMonth = useCallback((monthStr: string): Date => {
    const formats = [
      monthStr + " 1",
      monthStr,
      monthStr.replace(/(\d{4})-(\d{2})/, "$2/1/$1")
    ];
    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime())) return date;
    }
    return new Date(0);
  }, []);

  // Chart data calculations
  const chartData = useMemo(() => {
    const revenueByMonth = payments.reduce((acc: Record<string, number>, p) => {
      const month = p.rentMonth || "Unknown";
      acc[month] = (acc[month] || 0) + p.amountPaid;
      return acc;
    }, {});
    
    const revenueChartData: ChartDataPoint[] = Object.keys(revenueByMonth)
      .map(month => ({
        month,
        revenue: revenueByMonth[month],
        date: parseMonth(month)
      }))
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())
      .map(({ month, revenue }) => ({ month, revenue }));

    return { revenueChartData };
  }, [payments, parseMonth]);

  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    let relevantProperties = properties.filter(p => p.status === 'occupied');
    if (selectedTenant !== 'all') {
      const tenantObj = tenants.find(t => t.id === selectedTenant);
      relevantProperties = tenantObj ? relevantProperties.filter(p => p.id === tenantObj.propertyId) : [];
    }
    
    const totalRentDue = relevantProperties.reduce((sum, p) => sum + (p.rent || 0), 0);
    
    const paidThisMonth = payments
      .filter(p => p.rentMonth === currentMonthStr)
      .filter(p => relevantProperties.some(rp => rp.id === p.propertyId))
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    return {
      month: currentMonthStr,
      expected: totalRentDue,
      received: paidThisMonth,
      missingAmount: Math.max(totalRentDue - paidThisMonth, 0),
    };
  }, [payments, properties, tenants, selectedTenant]);

  // Aggregate data calculation
  const aggregateData = useMemo((): MonthlyPaymentData[] => {
    const propertyMap = new Map<string, MonthlyPaymentData>();

    properties.forEach(property => {
      const monthlyData: { [month: string]: { paid: number; expected: number; status: 'paid' | 'partial' | 'missing' } } = {};
      
      months.forEach(month => {
        monthlyData[month] = { paid: 0, expected: 0, status: 'missing' };
      });

      const tenantNames = tenants
        .filter(tenant => tenant.propertyId === property.id)
        .map(tenant => tenant.name);

      propertyMap.set(property.id, {
        propertyId: property.id,
        propertyAddress: property.address,
        tenantNames,
        monthlyData,
        totalPaid: 0,
        totalExpected: 0
      });
    });

    payments.forEach(payment => {
      const property = propertyMap.get(payment.propertyId);
      if (!property) return;

      const [monthName, year] = payment.rentMonth.split(' ');
      if (parseInt(year) !== currentYear) return;

      const monthData = property.monthlyData[monthName];
      if (monthData) {
        monthData.paid += payment.amountPaid || 0;
        monthData.expected += payment.amount || 0;
        
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
  }, [properties, payments, tenants, currentYear, months]);

  // Filter and sort payments
  const filteredAndSortedPayments = useMemo(() => {
    const filtered = payments
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
      });

    const grouped: Record<string, Payment[]> = {};
    const orderedMonths: string[] = [];
    
    filtered.forEach(payment => {
      const monthKey = payment.rentMonth || 'Unknown';
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
        orderedMonths.push(monthKey);
      }
      grouped[monthKey].push(payment);
    });

    if (sortBy === 'rentMonth') {
      orderedMonths.sort((a, b) => {
        const da = parseMonth(a);
        const db = parseMonth(b);
        return sortOrder === 'asc' ? da.getTime() - db.getTime() : db.getTime() - da.getTime();
      });
    }

    return { grouped, orderedMonths };
  }, [payments, properties, tenants, searchTerm, filterStatus, sortBy, sortOrder, parseMonth]);

  // Auto-update form fields when property is selected
  useEffect(() => {
    if (formData.propertyId && !editingPayment) {
      // Find the selected property
      const selectedProperty = properties.find(p => p.id === formData.propertyId);
      if (selectedProperty) {
        // Find tenants for this property
        const propertyTenants = tenants.filter(t => t.propertyId === selectedProperty.id);
        
        // Auto-select tenant if there's exactly one, otherwise clear tenantId
        const newTenantId = propertyTenants.length === 1 ? propertyTenants[0].id : '';
        
        // Get expected amount from property rent
        const newAmount = selectedProperty.rent ? selectedProperty.rent.toString() : '';
        
        // Get payment method: use tenant's preferred method if available, else default to "Bank Transfer"
        const selectedTenant = propertyTenants.find(t => t.id === newTenantId);
        const newMethod = selectedTenant?.preferredPaymentMethod || 'Bank Transfer';

        setFormData(prev => ({
          ...prev,
          tenantId: newTenantId,
          amount: newAmount,
          method: newMethod
        }));
      }
    }
  }, [formData.propertyId, properties, tenants, editingPayment]);

  // Auto-update status
  useEffect(() => {
    const amount = parseInt(formData.amount || '0', 10);
    const amountPaid = parseInt(formData.amountPaid || '0', 10);
    let newStatus: Payment['status'] = 'Not Paid Yet';
    if (amountPaid === amount && amount > 0) {
      newStatus = 'Paid';
    } else if (amountPaid > 0 && amountPaid < amount) {
      newStatus = 'Partially Paid';
    }
    if (formData.status !== newStatus) {
      setFormData((prev) => ({ ...prev, status: newStatus }));
    }
  }, [formData.amount, formData.amountPaid, formData.status]);

  const resetForm = useCallback(() => {
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
  }, []);

  const handleEdit = useCallback((payment: Payment) => {
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
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentData = {
      propertyId: formData.propertyId,
      tenantId: formData.tenantId,
      amount: parseInt(formData.amount) || 0,
      amountPaid: parseInt(formData.amountPaid) || 0,
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
  }, [formData, editingPayment, addPayment, updatePayment, resetForm]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      deletePayment(id);
    }
  }, [deletePayment]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Partially Paid': return 'bg-yellow-100 text-yellow-800';
      case 'Not Paid Yet': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Current Month Rent Status</h3>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tenants</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              innerRadius="40%"
              outerRadius="100%"
              data={[
                { name: 'Paid', value: currentMonthData.received, fill: CHART_COLORS[0] },
                { name: 'Remaining', value: currentMonthData.missingAmount, fill: CHART_COLORS[1] },
              ]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, currentMonthData.expected || 1]} tick={false} />
              <RadialBar minAngle={15} background clockWise dataKey="value" />
              <circle cx="50%" cy="50%" r="55" fill="white" />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xl font-bold fill-gray-800"
              >
                {currentMonthData.expected > 0
                  ? `${Math.round((currentMonthData.received / currentMonthData.expected) * 100)}%`
                  : '0%'}
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-sm text-gray-600">
            Collected: ${currentMonthData.received.toLocaleString()} / $
            {currentMonthData.expected.toLocaleString()} — Missing: $
            {currentMonthData.missingAmount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Total Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.revenueChartData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill={CHART_COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
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
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status' | 'property')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
                <option value="property">Sort by Property</option>
                <option value="rentMonth">Sort by Rent Month</option>
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
              {Object.values(filteredAndSortedPayments.grouped).flat().map((payment) => {
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
                    {filteredAndSortedPayments.orderedMonths.map((month) => {
                      let monthPayments = filteredAndSortedPayments.grouped[month];
                      const isExpanded = expandedMonths.includes(month);
                      
                      monthPayments = monthPayments.slice().sort((a, b) => {
                        const aProp = properties.find(p => p.id === a.propertyId)?.address || '';
                        const bProp = properties.find(p => p.id === b.propertyId)?.address || '';
                        return aProp.localeCompare(bProp);
                      });

                      return (
                        <React.Fragment key={month}>
                          <tr
                            onClick={() =>
                              setExpandedMonths(prev =>
                                prev.includes(month)
                                  ? prev.filter(m => m !== month)
                                  : [...prev, month]
                              )
                            }
                            className="cursor-pointer bg-gray-100 hover:bg-gray-200"
                          >
                            <td colSpan={9} className="px-6 py-3 text-sm font-semibold text-gray-700">
                              {month} ({monthPayments.length} payments)
                              <span className="ml-2 text-gray-500">
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded &&
                            monthPayments.map((payment) => {
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
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredAndSortedPayments.orderedMonths.length === 0 && (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant(s)
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={propertyData.tenantNames.join(', ')}>
                          {propertyData.tenantNames.length > 0 ? propertyData.tenantNames.join(', ') : '-'}
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
                      disabled={!formData.propertyId || tenants.filter(t => t.propertyId === formData.propertyId).length === 0}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-lg">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(formData.status)}`}>
                      {formData.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Status is automatically calculated based on amounts
                    </p>
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