import { GoogleSheetsConfig, Property, Tenant, Payment, RepairRequest } from '../types';

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;

  setConfig(config: GoogleSheetsConfig) {
    this.config = config;
    localStorage.setItem('googleSheetsConfig', JSON.stringify(config));
  }

  getConfig(): GoogleSheetsConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('googleSheetsConfig');
    if (stored) {
      this.config = JSON.parse(stored);
      return this.config;
    }
    
    return null;
  }

  isConnected(): boolean {
    const config = this.getConfig();
    return config?.connected || false;
  }

  async testConnection(apiKey: string, spreadsheetId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`
      );
      return response.ok;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  async syncProperties(properties: Property[]): Promise<void> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    
    // Convert properties to 2D array for Google Sheets
    const headers = ['ID', 'Address', 'Type', 'Rent', 'Status'];
    const rows = properties.map(p => [p.id, p.address, p.type, p.rent.toString(), p.status]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Properties!A1:E${values.length}?valueInputOption=RAW&key=${config.apiKey}`,
        {
          method: 'PUT',
          headers: {
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
    
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Property ID', 'Lease Start', 'Lease End', 'Rent Amount'];
    const rows = tenants.map(t => [
      t.id, t.name, t.email, t.phone, t.propertyId, 
      t.leaseStart, t.leaseEnd, t.rentAmount.toString()
    ]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Tenants!A1:H${values.length}?valueInputOption=RAW&key=${config.apiKey}`,
        {
          method: 'PUT',
          headers: {
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
    
    const headers = ['ID', 'Tenant ID', 'Amount', 'Date', 'Status', 'Method', 'Description'];
    const rows = payments.map(p => [
      p.id, p.tenantId, p.amount.toString(), p.date, p.status, p.method, p.description
    ]);
    
    const values = [headers, ...rows];
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Payments!A1:G${values.length}?valueInputOption=RAW&key=${config.apiKey}`,
        {
          method: 'PUT',
          headers: {
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

  async pullFromSheets(): Promise<{
    properties: Property[];
    tenants: Tenant[];
    payments: Payment[];
  }> {
    if (!this.isConnected()) throw new Error('Google Sheets not connected');
    
    const config = this.getConfig()!;
    
    try {
      // Pull properties
      const propertiesResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Properties!A2:E1000?key=${config.apiKey}`
      );
      const propertiesData = await propertiesResponse.json();
      
      // Pull tenants
      const tenantsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Tenants!A2:H1000?key=${config.apiKey}`
      );
      const tenantsData = await tenantsResponse.json();
      
      // Pull payments
      const paymentsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Payments!A2:G1000?key=${config.apiKey}`
      );
      const paymentsData = await paymentsResponse.json();
      
      // Convert back to objects
      const properties: Property[] = (propertiesData.values || []).map((row: string[]) => ({
        id: row[0],
        address: row[1],
        type: row[2],
        rent: parseInt(row[3]),
        status: row[4] as Property['status']
      }));
      
      const tenants: Tenant[] = (tenantsData.values || []).map((row: string[]) => ({
        id: row[0],
        name: row[1],
        email: row[2],
        phone: row[3],
        propertyId: row[4],
        leaseStart: row[5],
        leaseEnd: row[6],
        rentAmount: parseInt(row[7])
      }));
      
      const payments: Payment[] = (paymentsData.values || []).map((row: string[]) => ({
        id: row[0],
        tenantId: row[1],
        amount: parseInt(row[2]),
        date: row[3],
        status: row[4] as Payment['status'],
        method: row[5],
        description: row[6]
      }));
      
      return { properties, tenants, payments };
    } catch (error) {
      console.error('Error pulling from Google Sheets:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();