import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Grid3X3,
  List,
  Loader2,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { PaymentSchema } from '../utils/validation';
import { useErrorHandler } from '../hooks/useErrorHandler';


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
  type?: string;
  rent: number;
  status?: string;
}

interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  leaseStart: string;
  leaseEnd: string;
  paymentMethod?: string;
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

type SortKey =
  | 'date'
  | 'rentMonth'
  | 'amount'
  | 'amountPaid'
  | 'status'
  | 'method'
  | 'property'
  | 'tenant';

interface PaymentPortalProps {
  dataHook: DataHook;
}

export function calculateStatusForMonth(
  payments: Payment[],
  tenantId: string,
  rentMonth: string,
  tenants: Tenant[],
  properties: Property[]
): 'Paid' | 'Partially Paid' | 'Not Paid Yet' {
  const tenant = tenants.find(t => t.id === tenantId);
  if (!tenant) return 'Not Paid Yet';

  const property = properties.find(p => p.id === tenant.propertyId);
  const rent = property?.rent || 0;

  // Sum all payments by this tenant for that month
  const totalPaid = payments
    .filter(p => p.rentMonth === rentMonth && p.propertyId === tenant.propertyId)
    .reduce((sum, p) => sum + p.amountPaid, 0);

  if (totalPaid === 0) return 'Not Paid Yet';
  if (totalPaid >= rent) return 'Paid';
  return 'Partially Paid';
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
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const { handleError, clearError } = useErrorHandler();
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; paymentId: string | null }>({
    isOpen: false,
    paymentId: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkMonth, setBulkMonth] = useState<string>('');
  const [bulkPayments, setBulkPayments] = useState<Array<{
    propertyId: string;
    tenantId: string;
    amount: number;
    amountPaid: number;
    method: string;
    date: string;
  }>>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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
    return new Date(0); // fallback to epoch (ensures stable sorting)
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

    // keep tenantChartData calculation in case we want it extended later
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
    const filtered = payments.filter(payment => {
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
    });

    const sorted = filtered.slice().sort((a, b) => {
      const key = sortConfig.key;
      let aValue: any = null;
      let bValue: any = null;

      // derive comparison values depending on key
      if (key === 'date') {
        aValue = a.date ? new Date(a.date) : new Date(0);
        bValue = b.date ? new Date(b.date) : new Date(0);
      } else if (key === 'rentMonth') {
        aValue = a.rentMonth ? parseMonth(a.rentMonth) : new Date(0);
        bValue = b.rentMonth ? parseMonth(b.rentMonth) : new Date(0);
      } else if (key === 'amount') {
        aValue = typeof a.amount === 'number' ? a.amount : 0;
        bValue = typeof b.amount === 'number' ? b.amount : 0;
      } else if (key === 'amountPaid') {
        aValue = typeof a.amountPaid === 'number' ? a.amountPaid : 0;
        bValue = typeof b.amountPaid === 'number' ? b.amountPaid : 0;
      } else if (key === 'property') {
        aValue = properties.find(p => p.id === a.propertyId)?.address || '';
        bValue = properties.find(p => p.id === b.propertyId)?.address || '';
      } else if (key === 'tenant') {
        aValue = tenants.find(t => t.propertyId === a.propertyId)?.name || '';
        bValue = tenants.find(t => t.propertyId === b.propertyId)?.name || '';
      } else if (key === 'status') {
        aValue = a.status || '';
        bValue = b.status || '';
      } else if (key === 'method') {
        aValue = a.method || '';
        bValue = b.method || '';
      } else {
        // fallback
        aValue = (a as any)[key] ?? '';
        bValue = (b as any)[key] ?? '';
      }

      // Compare
      // Dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [payments, properties, tenants, searchTerm, sortConfig, parseMonth]);

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

  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  
    // Filter occupied properties
    let relevantProperties = properties.filter(p => p.status === 'occupied');
  
    // If a specific tenant is selected, further filter to that tenant's property (if occupied)
    if (selectedTenant !== 'all') {
      const tenantObj = tenants.find(t => t.id === selectedTenant);
      relevantProperties = tenantObj
        ? relevantProperties.filter(p => p.id === tenantObj.propertyId)
        : [];
    }
  
    const totalRentDue = relevantProperties.reduce((sum, p) => sum + (p.rent || 0), 0);
  
    // Payments for current month from relevant properties only
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
    setIsSubmitting(true);
    clearError();

    try {
      // Validate form data
      const validationResult = PaymentSchema.safeParse(formData);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        setFormError(firstError.message);
        return;
      }

      const { amount, amountPaid, ...rest } = validationResult.data;

      // Additional business logic validation
      if (amountPaid > amount) {
        setFormError("Amount paid cannot exceed total amount.");
        return;
      }

      const paymentData = {
        ...rest,
        amount,
        amountPaid,
        status: formData.status
      };

      if (editingPayment) {
        await updatePayment(editingPayment.id, paymentData);
      } else {
        await addPayment(paymentData);
      }

      resetForm();
    } catch (error) {
      handleError(error as Error, 'Payment Save');
      setFormError("An error occurred while saving the payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingPayment, addPayment, updatePayment, resetForm, handleError, clearError]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteModal({ isOpen: true, paymentId: id });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteModal.paymentId) {
      try {
        await deletePayment(deleteModal.paymentId);
        setDeleteModal({ isOpen: false, paymentId: null });
      } catch (error) {
        console.error('Failed to delete payment:', error);
      }
    }
  }, [deleteModal.paymentId, deletePayment]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModal({ isOpen: false, paymentId: null });
  }, []);

  // Bulk payment generation
  const handleGenerateMonth = useCallback(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    setSelectedMonth(nextMonth.getMonth() + 1); // 1-12
    setSelectedYear(nextMonth.getFullYear());
    
    const monthStr = nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    setBulkMonth(monthStr);
    setShowBulkForm(true);
  }, []);

  const handleMonthYearChange = useCallback((month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const monthStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    setBulkMonth(monthStr);
    
    // Get all occupied properties
    const occupiedProperties = properties.filter(p => p.status === 'occupied');
    
    const initialPayments = occupiedProperties.map(property => {
      const tenant = tenants.find(t => t.propertyId === property.id);
      return {
        propertyId: property.id,
        tenantId: tenant?.id || '',
        amount: property.rent,
        amountPaid: 0,
        method: tenant?.paymentMethod || '',
        date: ''
      };
    });
    
    setBulkPayments(initialPayments);
  }, [properties, tenants]);

  // Check if payments already exist for a given month
  const checkExistingPayments = useCallback((month: string): number => {
    return payments.filter(p => p.rentMonth === month).length;
  }, [payments]);

  const handleBulkPaymentChange = useCallback((index: number, field: string, value: string | number) => {
    setBulkPayments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleBulkSubmit = useCallback(async () => {
    // Check if payments already exist for this month
    const existingCount = checkExistingPayments(bulkMonth);
    
    if (existingCount > 0) {
      const confirmed = window.confirm(
        `Warning: ${existingCount} payment record(s) already exist for ${bulkMonth}.\n\nAre you sure you want to create ${bulkPayments.length} additional payment(s)?`
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      for (const payment of bulkPayments) {
        const status: Payment['status'] = 
          payment.amountPaid === 0 ? 'Not Paid Yet' :
          payment.amountPaid >= payment.amount ? 'Paid' :
          'Partially Paid';

        await addPayment({
          propertyId: payment.propertyId,
          tenantId: payment.tenantId,
          amount: payment.amount,
          amountPaid: payment.amountPaid,
          date: payment.date,
          status,
          method: payment.method,
          rentMonth: bulkMonth
        });
      }
      
      setShowBulkForm(false);
      setBulkPayments([]);
      setBulkMonth('');
    } catch (error) {
      console.error('Error creating bulk payments:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [bulkPayments, bulkMonth, addPayment, checkExistingPayments]);

  // Header-click sorting helper for table columns
  const handleHeaderSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

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
            onClick={handleGenerateMonth}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Generate Month
          </button>
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
        {/* Current Month Radial Chart */}
        <ChartErrorBoundary>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Current Month Rent Status</h3>

              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select tenant filter"
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
                  {
                    name: 'Paid',
                    value: currentMonthData.received,
                    fill: '#3b82f6',
                  },
                  {
                    name: 'Remaining',
                    value: currentMonthData.missingAmount,
                    fill: '#ef4444',
                  },
                ]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, currentMonthData.expected || 1]}
                  tick={false}
                />
                <RadialBar
                  minAngle={15}
                  background
                  clockWise
                  dataKey="value"
                />
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
        <div className="flex gap-2 items-center">
          <select
            value={sortConfig.key}
            onChange={(e) => setSortConfig({ key: e.target.value as SortKey, direction: 'asc' })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Sort payments by"
          >
            <option value="date">Date</option>
            <option value="rentMonth">Rent Month</option>
            <option value="property">Property</option>
            <option value="tenant">Tenant</option>
            <option value="amount">Amount</option>
            <option value="amountPaid">Paid</option>
            <option value="status">Status</option>
            <option value="method">Method</option>
          </select>
          <button
            onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label={`Sort ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
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
                  <th
                    onClick={() => handleHeaderSort('property')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Property {sortConfig.key === 'property' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('tenant')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Tenant {sortConfig.key === 'tenant' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('rentMonth')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Rent Month {sortConfig.key === 'rentMonth' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('amount')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('amountPaid')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Paid {sortConfig.key === 'amountPaid' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('method')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Method {sortConfig.key === 'method' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleHeaderSort('date')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  >
                    Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
              {(() => {
                    // Group payments by rentMonth preserving order from filteredAndSortedPayments
                    const grouped: Record<string, Payment[]> = {};
                    const orderedMonths: string[] = [];
                    filteredAndSortedPayments.forEach(payment => {
                      const monthKey = payment.rentMonth || 'Unknown';
                      if (!grouped[monthKey]) {
                        grouped[monthKey] = [];
                        orderedMonths.push(monthKey);
                      }
                      grouped[monthKey].push(payment);
                    });

                    // If user sorted by rentMonth we want groups ordered by parsed month (respect sort direction)
                    if (sortConfig.key === 'rentMonth') {
                      orderedMonths.sort((a, b) => {
                        const da = parseMonth(a);
                        const db = parseMonth(b);
                        return sortConfig.direction === 'asc' ? da.getTime() - db.getTime() : db.getTime() - da.getTime();
                      });
                    }

                    return orderedMonths.map((month) => {
                      let monthPayments = grouped[month];
                      const isExpanded = expandedMonths.includes(month);
                    
                      // Sort payments inside the month by property
                      monthPayments = monthPayments.slice().sort((a, b) => {
                        const aProp = properties.find(p => p.id === a.propertyId)?.address || '';
                        const bProp = properties.find(p => p.id === b.propertyId)?.address || '';
                        return aProp.localeCompare(bProp);
                      });

                    return (
                      <React.Fragment key={month}>
                        {/* Collapsible Group Header */}
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

                        {/* Group Rows */}
                        {isExpanded &&
                          monthPayments.map(payment => {
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
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      STATUS_STYLES[
                                        calculateStatusForMonth(
                                          payments,
                                          tenant?.id || '',
                                          payment.rentMonth,
                                          tenants,
                                          properties
                                        )
                                      ]
                                    }`}
                                  >
                                    {calculateStatusForMonth(
                                      payments,
                                      tenant?.id || '',
                                      payment.rentMonth,
                                      tenants,
                                      properties
                                    )}
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
                      </React.Fragment>
                    );
                  });
                })()}
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

      {/* Bulk Payment Generation Modal */}
      {showBulkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Generate Monthly Payments</h3>
              <button
                onClick={() => {
                  setShowBulkForm(false);
                  setBulkPayments([]);
                  setBulkMonth('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Month Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month to Generate
              </label>
              <div className="flex gap-3 items-center">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const newMonth = parseInt(e.target.value);
                    setSelectedMonth(newMonth);
                    handleMonthYearChange(newMonth, selectedYear);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value);
                    setSelectedYear(newYear);
                    handleMonthYearChange(selectedMonth, newYear);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 20 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                
                <button
                  onClick={() => handleMonthYearChange(selectedMonth, selectedYear)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Load Properties
                </button>
              </div>
              
              {bulkMonth && checkExistingPayments(bulkMonth) > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> {checkExistingPayments(bulkMonth)} payment record(s) already exist for {bulkMonth}.
                    Creating new payments will add to existing records.
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Review and edit payment details for all occupied properties. You can adjust amounts, 
                payment methods, and dates before creating the records.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {bulkPayments.map((payment, index) => {
                const property = properties.find(p => p.id === payment.propertyId);
                const tenant = tenants.find(t => t.id === payment.tenantId);

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{property?.address}</h4>
                        <p className="text-sm text-gray-600">Tenant: {tenant?.name || 'Unknown'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setBulkPayments(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="text-red-600 hover:text-red-700"
                        title="Remove from batch"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total Amount
                        </label>
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => handleBulkPaymentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Amount Paid
                        </label>
                        <input
                          type="number"
                          value={payment.amountPaid}
                          onChange={(e) => handleBulkPaymentChange(index, 'amountPaid', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <input
                          type="text"
                          value={payment.method}
                          onChange={(e) => handleBulkPaymentChange(index, 'method', e.target.value)}
                          placeholder="e.g., Bank Transfer"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={payment.date}
                          onChange={(e) => handleBulkPaymentChange(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {bulkPayments.length === 0 && bulkMonth && (
              <div className="text-center py-8 text-gray-500">
                No occupied properties found. Click "Load Properties" to generate payments for occupied properties.
              </div>
            )}

            {!bulkMonth && (
              <div className="text-center py-8 text-gray-500">
                Enter a month above and click "Load Properties" to get started.
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowBulkForm(false);
                  setBulkPayments([]);
                  setBulkMonth('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={isSubmitting || bulkPayments.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating {bulkPayments.length} Payment{bulkPayments.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    Create {bulkPayments.length} Payment{bulkPayments.length !== 1 ? 's' : ''} for {bulkMonth}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};