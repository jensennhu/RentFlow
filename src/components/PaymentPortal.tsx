import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2, Grid3X3, List } from 'lucide-react';
import { useData } from '../hooks/useData';
import type { Payment } from '../types';

interface PaymentPortalProps {
  dataHook: ReturnType<typeof useData>;
}

export const PaymentPortal: React.FC<PaymentPortalProps> = ({ dataHook }) => {
  const { payments, properties, tenants, addPayment, updatePayment, deletePayment } = dataHook;
  
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    propertyId: '',
    amount: '',
    amountPaid: '',
    date: '',
    status: 'Not Paid Yet' as Payment['status'],
    method: '',
    rentMonth: ''
  });

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
  }, [formData.amount, formData.amountPaid]);

  // Filter and sort payments
  const filteredAndSortedPayments = payments
    .filter(payment => {
      const property = properties.find(p => p.id === payment.propertyId);
      const tenant = tenants.find(t => t.propertyId === payment.propertyId);
      return (
        (payment.rentMonth || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.method || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tenant?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (property?.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm)
      );
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'date') {
        aValue = new Date(a.date);
        bValue = new Date(b.date);
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

  const resetForm = () => {
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
  };

  const handleEdit = (payment: Payment) => {
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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

    // Status already auto-calculated in useEffect
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
          <p className="text-gray-600">Track and manage rental payments</p>
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

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="text-xl font-bold text-green-600">
                ${payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()}
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
                ${payments.filter(p => p.status === 'Not Paid Yet').reduce((sum, p) => sum + (p.amount - p.amountPaid), 0).toLocaleString()}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partially Paid</p>
              <p className="text-xl font-bold text-red-600">
                ${payments.filter(p => p.status === 'Partially Paid').reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-xl font-bold text-blue-600">
                ${payments.filter(p => p.date && new Date(p.date).getMonth() === new Date().getMonth()).reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
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
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Table or Card View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          payment.status === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'Partially Paid'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
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
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-900"
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
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      payment.status === 'Paid'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'Partially Paid'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-1"><strong>Tenant:</strong> {tenant?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Rent Month:</strong> {payment.rentMonth}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Amount:</strong> ${payment.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Paid:</strong> ${payment.amountPaid.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Method:</strong> {payment.method || '-'}</p>
                <p className="text-sm text-gray-600 mb-3"><strong>Date:</strong> {payment.date || '-'}</p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEdit(payment)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(payment.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100
