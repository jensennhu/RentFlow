export interface Property {
  id: string;
  address: string;
  type: string;
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
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  method: string;
  description: string;
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
  dateCompleted?: string;
  category: string;
  images?: string[];
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  connected: boolean;
}

export interface SyncStatus {
  lastSync: string;
  status: 'success' | 'error' | 'syncing';
  message?: string;
}