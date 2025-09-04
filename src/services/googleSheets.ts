import { GoogleSheetsConfig, Property, Tenant, Payment } from '../types';
import { googleAuthService } from './googleAuth';

class GoogleSheetsService {
  private readonly API_BASE = 'http://localhost:3001';

  getConfig(): GoogleSheetsConfig | null {
    return googleAuthService.getConfig();
  }

  isConnected(): boolean {
    return googleAuthService.isConnected();
  }

  async testConnection(spreadsheetId: string): Promise<boolean> {
    return googleAuthService.testConnection(spreadsheetId);
  }

  async createSheetsIfNeeded(spreadsheetId: string): Promise<void> {
    // This is now handled by the backend sync endpoint
    console.log('Sheet creation handled by backend during sync');
  }

  async syncAllData(properties: Property[], tenants: Tenant[], payments: Payment[]): Promise<void> {
    const config = this.getConfig();
    if (!config?.spreadsheetId) {
      throw new Error('No spreadsheet configured');
    }

    try {
      const response = await fetch(`${this.API_BASE}/api/sheets/${config.spreadsheetId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          properties,
          tenants,
          payments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync data');
      }

      const result = await response.json();
      console.log('Sync successful:', result.message);
    } catch (error) {
      console.error('Error syncing data:', error);
      throw error;
    }
  }

  async syncProperties(properties: Property[]): Promise<void> {
    await this.syncAllData(properties, [], []);
  }

  async syncTenants(tenants: Tenant[]): Promise<void> {
    await this.syncAllData([], tenants, []);
  }

  async syncPayments(payments: Payment[]): Promise<void> {
    await this.syncAllData([], [], payments);
  }

  async getSheetData(spreadsheetId: string, range: string = 'Sheet1!A1:Z1000'): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE}/api/sheets/${spreadsheetId}?range=${encodeURIComponent(range)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sheet data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  async pullFromSheets(): Promise<{
    properties: Property[];
    tenants: Tenant[];
    payments: Payment[];
  }> {
    const config = this.getConfig();
    if (!config?.spreadsheetId) {
      throw new Error('No spreadsheet configured');
    }

    try {
      // Pull properties
      const propertiesData = await this.getSheetData(config.spreadsheetId, 'Properties!A2:E1000');
      const properties: Property[] = (propertiesData.data.values || []).map((row: string[]) => ({
        id: row[0],
        address: row[1],
        type: row[2],
        rent: parseInt(row[3]) || 0,
        status: row[4] as Property['status']
      }));

      // Pull tenants
      const tenantsData = await this.getSheetData(config.spreadsheetId, 'Tenants!A2:H1000');
      const tenants: Tenant[] = (tenantsData.data.values || []).map((row: string[]) => ({
        id: row[0],
        name: row[1],
        email: row[2],
        phone: row[3],
        propertyId: row[4],
        leaseStart: row[5],
        leaseEnd: row[6],
        rentAmount: parseInt(row[7]) || 0
      }));

      // Pull payments
      const paymentsData = await this.getSheetData(config.spreadsheetId, 'Payments!A2:G1000');
      const payments: Payment[] = (paymentsData.data.values || []).map((row: string[]) => ({
        id: row[0],
        tenantId: row[1],
        amount: parseInt(row[2]) || 0,
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