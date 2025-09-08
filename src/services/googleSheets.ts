import { GoogleSheetsConfig, Property, Tenant, Payment } from '../types';
import type { RepairRequest } from '../types';
import { googleAuthService } from './googleAuth';

class GoogleSheetsService {
  getConfig(): GoogleSheetsConfig | null {
    return googleAuthService.getConfig();
  }

  isConnected(): boolean {
    return googleAuthService.isConnected();
  }

  async testConnection(spreadsheetId: string): Promise<boolean> {
    try {
      const accessToken = await googleAuthService.getValidAccessToken();
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  async createSheetsIfNeeded(spreadsheetId: string): Promise<void> {
    try {
      const accessToken = await googleAuthService.getValidAccessToken();
      
      // Get existing sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to access spreadsheet');
      }

      const spreadsheet = await response.json();
      const existingSheets = spreadsheet.sheets.map((sheet: any) => sheet.properties.title);
      
      const requiredSheets = ['Properties', 'Tenants', 'Payments', 'Repairs'];
      const sheetsToCreate = requiredSheets.filter(sheet => !existingSheets.includes(sheet));

      if (sheetsToCreate.length > 0) {
        const requests = sheetsToCreate.map(title => ({
          addSheet: {
            properties: { title }
          }
        }));

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
          }
        );
      }
    } catch (error) {
      console.error('Error creating sheets:', error);
      throw error;
    }
  }

  async syncProperties(properties: Property[]): Promise<void> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    if (!config.spreadsheetId) throw new Error('No spreadsheet selected');
    
    const accessToken = await googleAuthService.getValidAccessToken();
    
    // Convert properties to 2D array for Google Sheets
    const headers = ['ID', 'Address', 'Rent', 'Status'];
    const rows = properties.map(p => [p.id, p.address, p.rent.toString(), p.status]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Properties!A1:D${values.length}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to sync properties to Google Sheets');
      }
    } catch (error) {
      console.error('Error syncing properties:', error);
      throw error;
    }
  }

  async syncTenants(tenants: Tenant[]): Promise<void> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    if (!config.spreadsheetId) throw new Error('No spreadsheet selected');
    
    const accessToken = await googleAuthService.getValidAccessToken();
    
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Property ID', 'Lease Start', 'Lease End', 'Rent Amount', 'Payment Method', 'Lease Type', 'Lease Renewal'];
    const rows = tenants.map(t => [
      t.id, t.name, t.email, t.phone, t.propertyId, 
      t.leaseStart, t.leaseEnd, t.rentAmount.toString(), t.paymentMethod, t.leaseType, t.leaseRenewal
    ]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Tenants!A1:K${values.length}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to sync tenants to Google Sheets');
      }
    } catch (error) {
      console.error('Error syncing tenants:', error);
      throw error;
    }
  }

  async syncPayments(payments: Payment[]): Promise<void> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    if (!config.spreadsheetId) throw new Error('No spreadsheet selected');
    
    const accessToken = await googleAuthService.getValidAccessToken();
    
    const headers = ['ID', 'Property ID', 'Amount', 'Amount Paid', 'Date', 'Status', 'Method', 'Rent Month'];
    const rows = payments.map(p => [
      p.id, p.propertyId, p.amount.toString(), p.amountPaid.toString(), p.date, p.status, p.method, p.rentMonth
    ]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Payments!A1:H${values.length}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to sync payments to Google Sheets');
      }
    } catch (error) {
      console.error('Error syncing payments:', error);
      throw error;
    }
  }

  async syncRepairRequests(repairRequests: RepairRequest[]): Promise<void> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    if (!config.spreadsheetId) throw new Error('No spreadsheet selected');
    
    const accessToken = await googleAuthService.getValidAccessToken();
    
    const headers = ['ID', 'Tenant ID', 'Property ID', 'Title', 'Description', 'Priority', 'Status', 'Date Submitted', 'Date Resolved', 'Category', 'Close Notes'];
    const rows = repairRequests.map(r => [
      r.id, r.tenantId, r.propertyId, r.title, r.description, r.priority, r.status, r.dateSubmitted, r.dateResolved || '', r.category, r.closeNotes || ''
    ]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Repairs!A1:K${values.length}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to sync repair requests to Google Sheets');
      }
    } catch (error) {
      console.error('Error syncing repair requests:', error);
      throw error;
    }
  }

  async pullFromSheets(): Promise<{
    properties: Property[];
    tenants: Tenant[];
    payments: Payment[];
    repairRequests: RepairRequest[];
  }> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    if (!config.spreadsheetId) throw new Error('No spreadsheet selected');
    
    const accessToken = await googleAuthService.getValidAccessToken();
    
    try {
      // Pull properties
      const propertiesResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Properties!A2:D1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const propertiesData = await propertiesResponse.json();
      
      // Pull tenants
      const tenantsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Tenants!A2:K1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const tenantsData = await tenantsResponse.json();
      
      // Pull payments
      const paymentsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Payments!A2:H1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const paymentsData = await paymentsResponse.json();
      
      // Pull repair requests
      const repairsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Repairs!A2:K1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      const repairsData = await repairsResponse.json();
      
      // Convert back to objects
      const properties: Property[] = (propertiesData.values || []).map((row: string[]) => ({
        id: row[0],
        address: row[1],
        rent: parseInt(row[2]),
        status: row[3] as Property['status']
      }
      )
      )
      
      const tenants: Tenant[] = (tenantsData.values || []).map((row: string[]) => ({
        id: row[0],
        name: row[1],
        email: row[2],
        phone: row[3],
        propertyId: row[4],
        leaseStart: row[5],
        leaseEnd: row[6],
        rentAmount: parseInt(row[7]),
        paymentMethod: row[8] as Tenant['paymentMethod'],
        leaseType: row[9] as Tenant['leaseType'],
        leaseRenewal: row[10]
        paymentMethod: row[8] as Tenant['paymentMethod'],
        leaseType: row[9] as Tenant['leaseType'],
        leaseRenewal: row[10]
      }));
      
      const payments: Payment[] = (paymentsData.values || []).map((row: string[]) => ({
        id: row[0],
        propertyId: row[1],
        amount: parseInt(row[2]),
        amountPaid: parseInt(row[3]),
        date: row[4],
        status: row[5] as Payment['status'],
        method: row[6],
        rentMonth: row[7]
      }));
      
      const repairRequests: RepairRequest[] = (repairsData.values || []).map((row: string[]) => ({
        id: row[0],
        propertyId: row[1],
        propertyId: row[2],
        title: row[3],
        description: row[4],
        priority: row[5] as RepairRequest['priority'],
        status: row[6] as RepairRequest['status'],
        amountPaid: parseInt(row[3]),
        date: row[4],
        status: row[5] as Payment['status'],
        method: row[6],
        rentMonth: row[7]
      }));
      
      return { properties, tenants, payments, repairRequests };
    } catch (error) {
      console.error('Error pulling from Google Sheets:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
        dateResolved: row[8] || undefined,
        category: row[9],
        closeNotes: row[10] || undefined