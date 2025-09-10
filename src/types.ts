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
  status: 'pending' | 'in-progress' | 'completed';
  dateSubmitted: string;
  dateResolved?: string;
  category: string;
  closeNotes?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userEmail:string;
}

export interface GoogleSheet {
  properties: {
    sheetId: number;
    title: string;
  };
}

export interface SyncStatus {
  success: boolean;
  message: string;
}