import React, { useState } from 'react';
import { Plus, Camera, Calendar, AlertTriangle, CheckCircle, Clock, User, Home } from 'lucide-react';
import { repairRequests, tenants, properties } from '../data/mockData';
import type { RepairRequest } from '../types';

export const RepairManagement: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredRequests = repairRequests;

  const displayRequests = filterStatus === 'all' 
    ? filteredRequests 
    : filteredRequests.filter(r => r.status === filterStatus);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in-progress': return Clock;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Repair Management</h2>
          <p className="text-gray-600">
            Manage and track repair requests from tenants
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { value: 'all', label: 'All' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filterStatus === filter.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Repair Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayRequests.map((request) => {
          const StatusIcon = getStatusIcon(request.status);
          const tenant = tenants.find(t => t.id === request.tenantId);
          const property = properties.find(p => p.id === request.propertyId);
          
          return (
            <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <StatusIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900 truncate">{request.title}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                  {request.priority}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{request.description}</p>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Submitted: {new Date(request.dateSubmitted).toLocaleDateString()}
                </div>
                {tenant && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {tenant.name}
                  </div>
                )}
                <div className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  {property?.address}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {request.category}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>

              {request.dateCompleted && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-green-600">
                    Completed: {new Date(request.dateCompleted).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="mt-4 flex space-x-2">
                <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                  Update Status
                </button>
                <button className="flex-1 bg-gray-50 text-gray-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  Contact Tenant
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayRequests.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No repair requests found</h3>
          <p className="text-gray-600">
            There are no repair requests matching the current filter.
          </p>
        </div>
      )}
    </div>
  );
};