export interface Property {
  id: string;
  address: string;
  rent: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenant?: Tenant;
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
  amount: number;
  amountPaid: number;
  date: string;
  status: 'Paid' | 'Not Paid Yet' | 'Partially Paid';
  method: string;
  rentMonth: string;
}

export interface RepairRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'in-progress' | 'completed';
  dateSubmitted: string;
  dateResolved?: string;
  category: string;
  images?: string[];
  closeNotes?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  connected: boolean;
  userEmail?: string;
}

export interface SyncStatus {
  lastSync: string;
  status: 'success' | 'error' | 'syncing';
  message?: string;
}

export interface GoogleSheet {
  id: string;
  name: string;
  url: string;
}