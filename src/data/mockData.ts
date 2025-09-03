import { Property, Tenant, Payment, RepairRequest } from '../types';

export const properties: Property[] = [
  {
    id: '1',
    address: '123 Oak Street, Unit A',
    type: 'Apartment',
    rent: 1200,
    status: 'occupied'
  },
  {
    id: '2',
    address: '456 Pine Avenue, Unit B',
    type: 'Apartment',
    rent: 1400,
    status: 'occupied'
  },
  {
    id: '3',
    address: '789 Maple Drive',
    type: 'House',
    rent: 2000,
    status: 'vacant'
  }
];

export const tenants: Tenant[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    propertyId: '1',
    leaseStart: '2024-01-01',
    leaseEnd: '2024-12-31',
    rentAmount: 1200
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '(555) 987-6543',
    propertyId: '2',
    leaseStart: '2024-02-01',
    leaseEnd: '2025-01-31',
    rentAmount: 1400
  }
];

export const payments: Payment[] = [
  {
    id: '1',
    tenantId: '1',
    amount: 1200,
    date: '2024-01-01',
    status: 'paid',
    method: 'Bank Transfer',
    description: 'January 2024 Rent'
  },
  {
    id: '2',
    tenantId: '1',
    amount: 1200,
    date: '2024-02-01',
    status: 'paid',
    method: 'Credit Card',
    description: 'February 2024 Rent'
  },
  {
    id: '3',
    tenantId: '2',
    amount: 1400,
    date: '2024-02-01',
    status: 'paid',
    method: 'Bank Transfer',
    description: 'February 2024 Rent'
  },
  {
    id: '4',
    tenantId: '1',
    amount: 1200,
    date: '2024-03-01',
    status: 'pending',
    method: 'Credit Card',
    description: 'March 2024 Rent'
  }
];

export const repairRequests: RepairRequest[] = [
  {
    id: '1',
    tenantId: '1',
    propertyId: '1',
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen faucet has been dripping constantly for the past week. Water is pooling around the base.',
    priority: 'medium',
    status: 'in-progress',
    dateSubmitted: '2024-02-15',
    category: 'Plumbing'
  },
  {
    id: '2',
    tenantId: '2',
    propertyId: '2',
    title: 'Broken Window Lock',
    description: 'The lock on the bedroom window is broken and won\'t secure properly.',
    priority: 'high',
    status: 'submitted',
    dateSubmitted: '2024-02-20',
    category: 'Security'
  },
  {
    id: '3',
    tenantId: '1',
    propertyId: '1',
    title: 'HVAC Not Working',
    description: 'Heating system stopped working. Temperature is very low.',
    priority: 'urgent',
    status: 'completed',
    dateSubmitted: '2024-01-30',
    dateCompleted: '2024-02-02',
    category: 'HVAC'
  }
];