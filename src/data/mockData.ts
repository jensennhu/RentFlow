import { Property, Tenant, Payment, RepairRequest } from '../types';

export const properties: Property[] = [
  {
    id: '0',
    address: '123 Test Street, Unit A',
    city: 'Test City',
    state: 'TX',
    zipcode: '12345',
    rent: 0,
    status: 'occupied'
  }
];

export const tenants: Tenant[] = [
  {
    id: '0',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '(555) 987-6543',
    propertyId: '0',
    leaseStart: '2024-02-01',
    leaseEnd: '2025-01-31',
    rentAmount: 0,
    paymentMethod: 'Direct Deposit',
    leaseType: 'Yearly',
    leaseRenewal: '2024-12-31'
  }
];

export const payments: Payment[] = [
  {
    id: '0',
    propertyId: '0',
    amount: 0,
    amountPaid: 0,
    date: '2024-01-01',
    status: 'Paid',
    method: 'Bank Transfer',
    rentMonth: 'January 2024'
  }
];

export const repairRequests: RepairRequest[] = [
  {
    id: '0',
    tenantId: '0',
    propertyId: '0',
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen faucet has been dripping constantly for the past week. Water is pooling around the base.',
    priority: 'medium',
    status: 'in-progress',
    dateSubmitted: '2024-02-15',
    category: 'Plumbing',
    closeNotes: ''
  }
];