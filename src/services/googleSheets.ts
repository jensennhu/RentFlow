import { GoogleSheetsConfig, Property, Tenant, Payment } from '../types';
import type { RepairRequest } from '../types';
import { googleAuthService } from '../components/GoogleAuthStatus';

class GoogleSheetsService {
  getConfig(): GoogleSheetsConfig | null {
    return googleAuthService.getConfig();
  }

  isConnected(): boolean {
    return googleAuthService.isConnected();
  }

  async testConnection(spreadsheetId: string): Promise<boolean> {
    try {
      if (!spreadsheetId) {
        console.error('No spreadsheet ID provided for connection test');
        return false;
      }

      const accessToken = await googleAuthService.getValidAccessToken();
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Google Sheets connection test failed:', errorData.error?.message || response.statusText);
        return false;
      }
      
      console.log('Google Sheets connection test successful');
      return true;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  async createSheetsIfNeeded(spreadsheetId: string): Promise<void> {
    try {
      if (!spreadsheetId) {
        throw new Error('No spreadsheet ID provided');
      }

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to access spreadsheet: ${errorData.error?.message || response.statusText}`);
      }

      const spreadsheet = await response.json();
      const existingSheets = spreadsheet.sheets?.map((sheet: any) => sheet.properties?.title).filter(Boolean) || [];
      
      const requiredSheets = ['Properties', 'Tenants', 'Payments', 'Repairs'];
      const sheetsToCreate = requiredSheets.filter(sheet => !existingSheets.includes(sheet));

      if (sheetsToCreate.length > 0) {
        console.log(`Creating missing sheets: ${sheetsToCreate.join(', ')}`);
        
        const requests = sheetsToCreate.map(title => ({
          addSheet: {
            properties: { title }
          }
        }));

        const createResponse = await fetch(
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

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          throw new Error(`Failed to create sheets: ${errorData.error?.message || createResponse.statusText}`);
        }

        console.log(`Successfully created ${sheetsToCreate.length} sheets`);
      } else {
        console.log('All required sheets already exist');
      }
    } catch (error) {
      console.error('Error creating sheets:', error);
      if (error instanceof Error) {
        throw new Error(`Sheet creation failed: ${error.message}`);
      }
      throw error;
    }
  }

  async syncProperties(properties: Property[]): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new Error('Google Sheets not connected. Please reconnect your account.');
      }
      
      const config = this.getConfig()!;
      if (!config.spreadsheetId) {
        throw new Error('No spreadsheet selected. Please select a spreadsheet first.');
      }

      if (!properties || properties.length === 0) {
        console.warn('No properties to sync');
        return;
      }
      
      const accessToken = await googleAuthService.getValidAccessToken();
      
      // Convert properties to 2D array for Google Sheets
      const headers = ['ID', 'Address', 'City', 'State', 'ZipCode', 'Rent', 'Status'];
      const rows = properties.map(p => [
        p.id || '', 
        p.address || '', 
        p.city || '', 
        p.state || '', 
        p.zipcode || '', 
        p.rent?.toString() || '0', 
        p.status || 'vacant'
      ]);
      
      const values = [headers, ...rows];
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Properties!A1:G${values.length}?valueInputOption=RAW`,
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to sync properties: ${errorData.error?.message || response.statusText}`);
      }
      
      console.log(`Successfully synced ${properties.length} properties to Google Sheets`);
    } catch (error) {
      console.error('Error syncing properties:', error);
      if (error instanceof Error) {
        throw new Error(`Property sync failed: ${error.message}`);
      }
      throw error;
    }
  }

  async syncTenants(tenants: Tenant[]): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new Error('Google Sheets not connected. Please reconnect your account.');
      }
      
      const config = this.getConfig()!;
      if (!config.spreadsheetId) {
        throw new Error('No spreadsheet selected. Please select a spreadsheet first.');
      }

      if (!tenants || tenants.length === 0) {
        console.warn('No tenants to sync');
        return;
      }
      
      const accessToken = await googleAuthService.getValidAccessToken();
      
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Property ID', 'Lease Start', 'Lease End', 'Rent Amount', 'Payment Method', 'Lease Type', 'Lease Renewal'];
      const rows = tenants.map(t => [
        t.id || '', 
        t.name || '', 
        t.email || '', 
        t.phone || '', 
        t.propertyId || '', 
        t.leaseStart || '', 
        t.leaseEnd || '', 
        t.rentAmount?.toString() || '0', 
        t.paymentMethod || '', 
        t.leaseType || '', 
        t.leaseRenewal || ''
      ]);
      
      const values = [headers, ...rows];
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to sync tenants: ${errorData.error?.message || response.statusText}`);
      }
      
      console.log(`Successfully synced ${tenants.length} tenants to Google Sheets`);
    } catch (error) {
      console.error('Error syncing tenants:', error);
      if (error instanceof Error) {
        throw new Error(`Tenant sync failed: ${error.message}`);
      }
      throw error;
    }
  }

  async syncPayments(payments: Payment[]): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new Error('Google Sheets not connected. Please reconnect your account.');
      }
      
      const config = this.getConfig()!;
      if (!config.spreadsheetId) {
        throw new Error('No spreadsheet selected. Please select a spreadsheet first.');
      }

      if (!payments || payments.length === 0) {
        console.warn('No payments to sync');
        return;
      }
      
      const accessToken = await googleAuthService.getValidAccessToken();
      
      const headers = ['ID', 'Property ID', 'Amount', 'Amount Paid', 'Date', 'Status', 'Method', 'Rent Month'];
      const rows = payments.map(p => [
        p.id || '', 
        p.propertyId || '', 
        p.amount?.toString() || '0', 
        p.amountPaid?.toString() || '0', 
        p.date || '', 
        p.status || 'Not Paid Yet', 
        p.method || '', 
        p.rentMonth || ''
      ]);
      
      const values = [headers, ...rows];
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to sync payments: ${errorData.error?.message || response.statusText}`);
      }
      
      console.log(`Successfully synced ${payments.length} payments to Google Sheets`);
    } catch (error) {
      console.error('Error syncing payments:', error);
      if (error instanceof Error) {
        throw new Error(`Payment sync failed: ${error.message}`);
      }
      throw error;
    }
  }

  async syncRepairRequests(repairRequests: RepairRequest[]): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new Error('Google Sheets not connected. Please reconnect your account.');
      }
      
      const config = this.getConfig()!;
      if (!config.spreadsheetId) {
        throw new Error('No spreadsheet selected. Please select a spreadsheet first.');
      }

      if (!repairRequests || repairRequests.length === 0) {
        console.warn('No repair requests to sync');
        return;
      }
      
      const accessToken = await googleAuthService.getValidAccessToken();
      
      const headers = ['ID', 'Tenant ID', 'Property ID', 'Title', 'Description', 'Priority', 'Status', 'Date Submitted', 'Date Resolved', 'Category', 'Close Notes'];
      const rows = repairRequests.map(r => [
        r.id || '', 
        r.tenantId || '', 
        r.propertyId || '', 
        r.title || '', 
        r.description || '', 
        r.priority || 'medium', 
        r.status || 'pending', 
        r.dateSubmitted || '', 
        r.dateResolved || '', 
        r.category || '', 
        r.closeNotes || ''
      ]);
      
      const values = [headers, ...rows];
      
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to sync repair requests: ${errorData.error?.message || response.statusText}`);
      }
      
      console.log(`Successfully synced ${repairRequests.length} repair requests to Google Sheets`);
    } catch (error) {
      console.error('Error syncing repair requests:', error);
      if (error instanceof Error) {
        throw new Error(`Repair request sync failed: ${error.message}`);
      }
      throw error;
    }
  }

  async pullFromSheets(): Promise<{
    properties: Property[];
    tenants: Tenant[];
    payments: Payment[];
    repairRequests: RepairRequest[];
  }> {
    try {
      if (!this.isConnected()) {
        throw new Error('Google Sheets not connected. Please reconnect your account.');
      }
      
      const config = this.getConfig()!;
      if (!config.spreadsheetId) {
        throw new Error('No spreadsheet selected. Please select a spreadsheet first.');
      }
      
      const accessToken = await googleAuthService.getValidAccessToken();
      
      console.log('Pulling data from Google Sheets...');

      // Utility function to safely parse numbers
      const parseNumber = (value: string | undefined): number => {
        if (!value) return 0; 
        const cleaned = value.replace(/,/g, '').trim(); // remove commas & spaces
        if (cleaned === '') return 0;
        const parsed = Number(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Pull properties with better error handling
      let properties: Property[] = [];
      try {
        const propertiesResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Properties!A2:G1000`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!propertiesResponse.ok) {
          const errorData = await propertiesResponse.json().catch(() => ({}));
          console.warn('Failed to pull properties:', errorData.error?.message || propertiesResponse.statusText);
        } else {
          const propertiesData = await propertiesResponse.json();
          properties = (propertiesData.values || [])
            .map((row: string[]) => ({
              id: row[0],
              address: row[1] || '',
              city: row[2] || '',
              state: row[3] || '',
              zipcode: row[4] || '',
              rent: parseNumber(row[5]),
              status: (row[6] as Property['status']) || 'vacant'
            }))
            .filter(p => p.id && p.id.trim() !== ''); // Filter out empty rows
          
          console.log(`Successfully pulled ${properties.length} properties`);
        }
      } catch (error) {
        console.warn('Error pulling properties, using empty array:', error);
      }
      
      // Pull tenants with better error handling
      let tenants: Tenant[] = [];
      try {
        const tenantsResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Tenants!A2:K1000`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!tenantsResponse.ok) {
          const errorData = await tenantsResponse.json().catch(() => ({}));
          console.warn('Failed to pull tenants:', errorData.error?.message || tenantsResponse.statusText);
        } else {
          const tenantsData = await tenantsResponse.json();
          tenants = (tenantsData.values || [])
            .map((row: string[]) => ({
              id: row[0],
              name: row[1] || '',
              email: row[2] || '',
              phone: row[3] || '',
              propertyId: row[4] || '',
              leaseStart: row[5] || '',
              leaseEnd: row[6] || '',
              rentAmount: parseNumber(row[7]),
              paymentMethod: (row[8] as Tenant['paymentMethod']) || '',
              leaseType: (row[9] as Tenant['leaseType']) || '',
              leaseRenewal: row[10] || ''
            }))
            .filter(t => t.id && t.id.trim() !== ''); // Filter out empty rows
          
          console.log(`Successfully pulled ${tenants.length} tenants`);
        }
      } catch (error) {
        console.warn('Error pulling tenants, using empty array:', error);
      }
      
      // Pull payments with better error handling
      let payments: Payment[] = [];
      try {
        const paymentsResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Payments!A2:H1000`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!paymentsResponse.ok) {
          const errorData = await paymentsResponse.json().catch(() => ({}));
          console.warn('Failed to pull payments:', errorData.error?.message || paymentsResponse.statusText);
        } else {
          const paymentsData = await paymentsResponse.json();
          payments = (paymentsData.values || [])
            .map((row: string[]) => ({
              id: row[0],
              propertyId: row[1] || '',
              amount: parseNumber(row[2]),        
              amountPaid: parseNumber(row[3]),   
              date: row[4] || '',
              status: (row[5] as Payment['status']) || 'Not Paid Yet',
              method: row[6] || '',
              rentMonth: row[7] || ''
            }))
            .filter(p => p.id && p.id.trim() !== ''); // Filter out empty rows
          
          console.log(`Successfully pulled ${payments.length} payments`);
        }
      } catch (error) {
        console.warn('Error pulling payments, using empty array:', error);
      }
      
      // Pull repair requests with better error handling
      let repairRequests: RepairRequest[] = [];
      try {
        const repairsResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/Repairs!A2:K1000`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!repairsResponse.ok) {
          const errorData = await repairsResponse.json().catch(() => ({}));
          console.warn('Failed to pull repair requests:', errorData.error?.message || repairsResponse.statusText);
        } else {
          const repairsData = await repairsResponse.json();
          repairRequests = (repairsData.values || [])
            .map((row: string[]) => ({
              id: row[0],
              tenantId: row[1] || '',
              propertyId: row[2] || '',
              title: row[3] || '',
              description: row[4] || '',
              priority: (row[5] as RepairRequest['priority']) || 'medium',
              status: (row[6] as RepairRequest['status']) || 'pending',
              dateSubmitted: row[7] || '',
              dateResolved: row[8] || undefined,
              category: row[9] || '',
              closeNotes: row[10] || undefined
            }))
            .filter(r => r.id && r.id.trim() !== ''); // Filter out empty rows
          
          console.log(`Successfully pulled ${repairRequests.length} repair requests`);
        }
      } catch (error) {
        console.warn('Error pulling repair requests, using empty array:', error);
      }
      
      console.log('Successfully completed data pull from Google Sheets');
      return { properties, tenants, payments, repairRequests };
      
    } catch (error) {
      console.error('Error pulling from Google Sheets:', error);
      if (error instanceof Error) {
        throw new Error(`Data pull failed: ${error.message}`);
      }
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();