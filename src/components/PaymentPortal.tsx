import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2, Grid3X3, List, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types (moved inline)
interface Payment {
  id: string;
  propertyId: string;
  amount: number;
  amountPaid: number;
  date: string;
  status: 'Paid' | 'Partially Paid' | 'Not Paid Yet';
  method: string;
  rentMonth: string;
}

interface Property {
  id: string;
  address: string;
  type: string;
  rent: number;
}

interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  leaseStart: string;
  leaseEnd: string;
}

interface DataHook {
  payments: Payment[];
  properties: Property[];
  tenants: Tenant[];
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: string, payment: Omit<Payment, 'id'>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
}

// Constants and Configuration
const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

const STATUS_STYLES = {
  'Paid': 'bg-green-100 text-green-800',
  'Partially Paid': 'bg-yellow-100 text-yellow-800',
  'Not Paid Yet': 'bg-red-100 text-red-800'
} as const;

// Types for chart data
interface ChartDataPoint {
  month: string;
  revenue: number;
  date?: Date;
}

interface TenantChartDataPoint {
  month: string;
  [tenantName: string]: string | number;
}

interface PaymentPortalProps {
  dataHook: DataHook;
}

// Delete Confirmation Modal Component
const DeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentId: string;
}> = ({ isOpen, onClose, onConfirm, paymentId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this payment record? This action cannot be undone.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Boundary Component
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Failed to load chart</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const PaymentPortal: React.FC<PaymentPortalProps> = ({ dataHook }) => {
  const { payments, properties, tenants, addPayment, updatePayment, deletePayment } = dataHook;
  
  // State
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'rentMonth'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; paymentId: string | null }>({
    isOpen: false,
    paymentId: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    amount: '',
    amountPaid: '',
    date: '',
    status: 'Not Paid Yet' as Payment['status'],
    method: '',
    rentMonth: ''
  });

  // Enhanced month parsing with better error handling
  const parseMonth = useCallback((monthStr: string): Date => {
    const formats = [
      monthStr + " 1", // "September 2025" -> "September 2025 1"
      monthStr,        // Direct parsing
      monthStr.replace(/(\d{4})-(\d{2})/, "$2/1/$1") // "2025-09" -> "09/1/2025"
    ];
    
    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime())) return date;
    }
    return new Date(); // fallback to current date
  }, []);

  // Memoized chart data calculations
  const chartData = useMemo(() => {
    // Revenue by Month
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

    // Tenant Payments by Month
    const tenantMonthMap: Record<string, any> = {};
    payments.forEach(p => {
      const month = p.rentMonth || "Unknown";
      const tenant = tenants.find(t => t.propertyId === p.propertyId)?.name || "Unknown Tenant";
      if (!tenantMonthMap[month]) tenantMonthMap[month] = { month };
      tenantMonthMap[month][tenant] = (tenantMonthMap[month][tenant] || 0) + p.amountPaid;
    });

    let tenantChartData: TenantChartDataPoint[] = Object.values(tenantMonthMap)
      .map(entry => ({
        ...entry,
        parsedDate: parseMonth(entry.month),
      }))
      .sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .map(({ parsedDate, ...rest }) => rest);

    // Filter if individual tenant selected
    if (selectedTenant !== "all") {
      tenantChartData = tenantChartData.map(entry => ({
        month: entry.month,
        [selectedTenant]: entry[selectedTenant] || 0
      }));
    }

    return { revenueChartData, tenantChartData };
  }, [payments, tenants, parseMonth, selectedTenant]);

  // Memoized filtered and sorted payments
  const filteredAndSortedPayments = useMemo(() => {
    return payments
      .filter(payment => {
        const property = properties.find(p => p.id === payment.propertyId);
        const tenant = tenants.find(t => t.propertyId === payment.propertyId);
        const searchLower = searchTerm.toLowerCase();
        
        return (
          (payment.rentMonth || '').toLowerCase().includes(searchLower) ||
          (payment.method || '').toLowerCase().includes(searchLower) ||
          (payment.status || '').toLowerCase().includes(searchLower) ||
          (tenant?.name || '').toLowerCase().includes(searchLower) ||
          (property?.address || '').toLowerCase().includes(searchLower) ||
          payment.amount.toString().includes(searchTerm)
        );
      })
      .sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];
        
        if (sortBy === 'date') {
          aValue = new Date(a.date);
          bValue = new Date(b.date);
        } else if (sortBy === 'amount') {
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
  }, [payments, properties, tenants, searchTerm, sortBy, sortOrder]);

  // Memoized dashboard stats
  const dashboardStats = useMemo(() => {
    const totalCollected = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const pending = payments
      .filter(p => p.status === 'Not Paid Yet')
      .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0);

    const thisMonth = payments
      .filter(p => p.date && new Date(p.date).getMonth() === new Date().getMonth())
      .reduce((sum, p) => sum + p.amountPaid, 0);

    return { totalCollected, pending, thisMonth };
  }, [payments]);

  // Auto-update status as user types
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
      amount: '',
      amountPaid: '',
      date: '',
      status: 'Not Paid Yet',
      method: '',
      rentMonth: ''
    });
    setEditingPayment(null);
    setShowForm(false);
    setFormError(null);
    setIsSubmitting(false);
  }, []);

  const handleEdit = useCallback((payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      propertyId: payment.propertyId,
      amount: payment.amount.toString(),
      amountPaid: payment.amountPaid.toString(),
      date: payment.date,
      status: payment.status,
      method: payment.method,
      rentMonth: payment.rentMonth
    });
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const amount = parseInt(formData.amount || '0', 10);
      const amountPaid = parseInt(formData.amountPaid || '0', 10);

      if (!formData.propertyId) {
        setFormError("Please select a property.");
        return;
      }
      if (!formData.rentMonth.trim()) {
        setFormError("Please enter the rent month.");
        return;
      }
      if (amount <= 0) {
        setFormError("Amount must be greater than 0.");
        return;
      }
      if (amountPaid < 0) {
        setFormError("Amount paid cannot be negative.");
        return;
      }
      if (amountPaid > amount) {
        setFormError("Amount paid cannot exceed total amount.");
        return;
      }

      const paymentData = {
        propertyId: formData.propertyId,
        amount,
        amountPaid,
        date: formData.date,
        status: formData.status,
        method: formData.method,
        rentMonth: formData.rentMonth
      };

      if (editingPayment) {
        await updatePayment(editingPayment.id, paymentData);
      } else {
        await addPayment(paymentData);
      }

      resetForm();
    } catch (error) {
      setFormError("An error occurred while saving the payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingPayment, addPayment, updatePayment, resetForm]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteModal({ isOpen: true, paymentId: id });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteModal.paymentId) {
      try {
        await deletePayment(deleteModal.paymentId);
        setDeleteModal({ isOpen: false, paymentId: null });
      } catch (error) {
        // Handle error - could show a toast notification
        console.error('Failed to delete payment:', error);
      }
    }
  }, [deleteModal.paymentId, deletePayment]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModal({ isOpen: false, paymentId: null });
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
          <p className="text-gray-600">Track and manage rental payments</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1" role="tablist">
            <button
              onClick={() => setViewMode('card')}
              role="tab"
              aria-selected={viewMode === 'card'}
              aria-label="Switch to card view"
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              role="tab"
              aria-selected={viewMode === 'table'}
              aria-label="Switch to table view"
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

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="text-xl font-bold text-green-600">
                ${dashboardStats.totalCollected.toLocaleString()}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                ${dashboardStats.pending.toLocaleString()}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-xl font-bold text-blue-600">
                ${dashboardStats.thisMonth.toLocaleString()}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tenant Payments by Month */}
        <ChartErrorBoundary>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tenant Payments by Month</h3>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select tenant filter"
              >
                <option value="all">All Tenants</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.tenantChartData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Payment']} />
                {selectedTenant === "all" ? (
                  <>
                    <Legend />
                    {tenants.map((t, idx) => (
                      <Bar
                        key={t.id}
                        dataKey={t.name}
                        stackId="a"
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </>
                ) : (
                  <Bar dataKey={selectedTenant} fill="#3b82f6" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartErrorBoundary>

        {/* Total Revenue by Month */}
        <ChartErrorBoundary>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">Total Revenue by Month</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.revenueChartData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartErrorBoundary>
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search payments"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Sort payments by"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="status">Sort by Status</option>
            <option value="rentMonth">Sort by Rent Month</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Table or Card View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent Month</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedPayments.map((payment) => {
                  const property = properties.find(p => p.id === payment.propertyId);
                  const tenant = tenants.find(t => t.propertyId === payment.propertyId);

                  return (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{property?.address || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{tenant?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.rentMonth}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${payment.amountPaid.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[payment.status]}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.method || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.date || '-'}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(payment)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`Edit payment for ${property?.address || 'unknown property'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(payment.id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label={`Delete payment for ${property?.address || 'unknown property'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPayments.map((payment) => {
            const property = properties.find(p => p.id === payment.propertyId);
            const tenant = tenants.find(t => t.propertyId === payment.propertyId);

            return (
              <div key={payment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{property?.address || 'N/A'}</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[payment.status]}`}
                  >
                    {payment.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <p><strong>Tenant:</strong> {tenant?.name || 'N/A'}</p>
                  <p><strong>Rent Month:</strong> {payment.rentMonth}</p>
                  <p><strong>Amount:</strong> ${payment.amount.toLocaleString()}</p>
                  <p><strong>Paid:</strong> ${payment.amountPaid.toLocaleString()}</p>
                  <p><strong>Method:</strong> {payment.method || '-'}</p>
                  <p><strong>Date:</strong> {payment.date || '-'}</p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEdit(payment)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(payment.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingPayment ? 'Edit Payment' : 'Add New Payment'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Month
                </label>
                <input
                  type="text"
                  value={formData.rentMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, rentMonth: e.target.value }))}
                  placeholder="e.g., September 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountPaid: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={formData.method}
                  onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                  placeholder="e.g., Bank Transfer, Cash, Check"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="mt-1 p-2 bg-gray-50 rounded-lg">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[formData.status]}`}
                  >
                    {formData.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Status is automatically calculated based on amounts
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPayment ? 'Update Payment' : 'Add Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        paymentId={deleteModal.paymentId || ''}
      />
    </div>
  );
};