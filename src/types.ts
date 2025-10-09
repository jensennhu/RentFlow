export interface Property {
  id: string;
  address: string;
  zipcode: string;
  city: string;
  state: string;
  rent: number;
  status: 'vacant' | 'occupied' | 'maintenance';
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  paymentMethod: 'Zelle' | 'Direct Deposit' | 'Cash' | '';
  leaseType: 'Yearly' | 'Monthly' | '';
  leaseRenewal: string;
}

export interface Payment {
  id: string;
  propertyId: string;
  tenantId: string; // add this
  rentMonth: string;
  amount: number; // total rent expected
  amountPaid: number;
  date: string; // original date
  paymentDate?: string; // optional alias for PaymentPortal
  status: 'Not Paid Yet' | 'Partially Paid' | 'Paid';
  method?: string;
}
export interface RepairRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  dateSubmitted: string;
  dateResolved?: string;
  category: string;
  closeNotes?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId?: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  connected: boolean;
  userEmail: string;
}

export interface GoogleSheet {
  id: string;
  name: string;
  url: string;
}

export interface SyncStatus {
  lastSync: string;
  status: 'success' | 'error';
  message: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
}
export interface DataChange {
  id: string;
  type: 'add' | 'update' | 'delete';
  table: 'properties' | 'tenants' | 'payments' | 'repairRequests';
  current?: unknown;
  new?: unknown;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
}