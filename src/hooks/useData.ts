import { useState, useCallback } from 'react';
import { Property, Tenant, Payment, RepairRequest } from '../types';
import { properties as initialProperties, tenants as initialTenants, payments as initialPayments, repairRequests as initialRepairRequests } from '../data/mockData';
import { googleSheetsService } from '../services/googleSheets';

export const useData = () => {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>(initialRepairRequests);
  const [isSyncing, setIsSyncing] = useState(false);

  // Properties CRUD
  const addProperty = useCallback((property: Omit<Property, 'id'>) => {
    const newProperty: Property = {
      ...property,
      id: Date.now().toString()
    };
    setProperties(prev => [...prev, newProperty]);
    
    // Generate payment records for the new property
    generateUpcomingPayments([newProperty]);
    
    return newProperty;
  }, []);

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    // Also remove associated tenants and payments
    setTenants(prev => prev.filter(t => t.propertyId !== id));
    setPayments(prev => prev.filter(p => p.propertyId !== id));
  }, []);

  // Tenants CRUD
  const addTenant = useCallback((tenant: Omit<Tenant, 'id'>) => {
    // Calculate lease renewal date (last day of month, one month before lease end)
    const leaseEndDate = new Date(tenant.leaseEnd);
    const renewalDate = new Date(leaseEndDate.getFullYear(), leaseEndDate.getMonth() - 1, 0);
    
    const newTenant: Tenant = {
      ...tenant,
      id: Date.now().toString(),
      leaseRenewal: renewalDate.toISOString().split('T')[0]
    };
    setTenants(prev => [...prev, newTenant]);
    // Update property status to occupied
    setProperties(prev => prev.map(p => 
      p.id === tenant.propertyId ? { ...p, status: 'occupied' as const } : p
    ));
    return newTenant;
  }, []);

  const updateTenant = useCallback((id: string, updates: Partial<Tenant>) => {
    // Recalculate lease renewal if lease end date changes
    if (updates.leaseEnd) {
      const leaseEndDate = new Date(updates.leaseEnd);
      const renewalDate = new Date(leaseEndDate.getFullYear(), leaseEndDate.getMonth() - 1, 0);
      updates.leaseRenewal = renewalDate.toISOString().split('T')[0];
    }
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTenant = useCallback((id: string) => {
    const tenant = tenants.find(t => t.id === id);
    setTenants(prev => prev.filter(t => t.id !== id));
    // Update property status to vacant
    if (tenant) {
      setProperties(prev => prev.map(p => 
        p.id === tenant.propertyId ? { ...p, status: 'vacant' as const } : p
      ));
    }
  }, [tenants]);

  // Payments CRUD
  const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString()
    };
    setPayments(prev => [...prev, newPayment]);
    return newPayment;
  }, []);

  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    // Auto-update status based on amount paid
    if (updates.amountPaid !== undefined && updates.amount !== undefined) {
      const amountPaid = updates.amountPaid;
      const totalAmount = updates.amount;
      
      if (amountPaid === 0) {
        updates.status = 'Not Paid Yet';
      } else if (amountPaid >= totalAmount) {
        updates.status = 'Paid';
      } else {
        updates.status = 'Partially Paid';
      }
    }
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePayment = useCallback((id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  // Repair Requests CRUD
  const addRepairRequest = useCallback((request: Omit<RepairRequest, 'id'>) => {
    const newRequest: RepairRequest = {
      ...request,
      id: Date.now().toString()
    };
    setRepairRequests(prev => [...prev, newRequest]);
    return newRequest;
  }, []);

  const updateRepairRequest = useCallback((id: string, updates: Partial<RepairRequest>) => {
    // Auto-set date resolved when status changes to completed
    if (updates.status === 'completed' && !updates.dateResolved) {
      updates.dateResolved = new Date().toISOString().split('T')[0];
    }
    setRepairRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRepairRequest = useCallback((id: string) => {
    setRepairRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  // Generate upcoming payment records
  const generateUpcomingPayments = useCallback((propertiesToProcess: Property[] = properties) => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const rentMonthString = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    propertiesToProcess.forEach(property => {
      // Check if payment record already exists for next month
      const existingPayment = payments.find(p => 
        p.propertyId === property.id && p.rentMonth === rentMonthString
      );
      
      if (!existingPayment && property.status === 'occupied') {
        const newPayment: Payment = {
          id: Date.now().toString() + property.id,
          propertyId: property.id,
          amount: property.rent,
          amountPaid: 0,
          date: '',
          status: 'Not Paid Yet',
          method: '',
          rentMonth: rentMonthString
        };
        setPayments(prev => [...prev, newPayment]);
      }
    });
  }, [properties, payments]);

  // Auto-generate upcoming payments on component mount
  React.useEffect(() => {
    generateUpcomingPayments();
  }, []);

  // Sync to Google Sheets
  const syncToGoogleSheets = useCallback(async () => {
    if (!googleSheetsService.isConnected()) {
      throw new Error('Google Sheets not connected');
    }

    setIsSyncing(true);
    try {
      const config = googleSheetsService.getConfig();
      if (!config?.spreadsheetId) {
        throw new Error('No spreadsheet selected');
      }

      // Ensure required sheets exist
      await googleSheetsService.createSheetsIfNeeded(config.spreadsheetId);
      
      // Sync all data
      await Promise.all([
        googleSheetsService.syncProperties(properties),
        googleSheetsService.syncTenants(tenants),
        googleSheetsService.syncPayments(payments),
        googleSheetsService.syncRepairRequests(repairRequests)
      ]);

      return {
        success: true,
        message: 'Data successfully synced to Google Sheets'
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: 'Failed to sync data to Google Sheets'
      };
    } finally {
      setIsSyncing(false);
    }
  }, [properties, tenants, payments, repairRequests]);

  // Pull from Google Sheets
  const pullFromGoogleSheets = useCallback(async () => {
    if (!googleSheetsService.isConnected()) {
      throw new Error('Google Sheets not connected');
    }

    setIsSyncing(true);
    try {
      const config = googleSheetsService.getConfig();
      if (!config?.spreadsheetId) {
        throw new Error('No spreadsheet selected');
      }

      // Pull all data from Google Sheets
      const data = await googleSheetsService.pullFromSheets();
      
      // Update local state with pulled data
      setProperties(data.properties);
      setTenants(data.tenants);
      setPayments(data.payments);
      setRepairRequests(data.repairRequests);

      return {
        success: true,
        message: 'Data successfully pulled from Google Sheets'
      };
    } catch (error) {
      console.error('Pull error:', error);
      return {
        success: false,
        message: 'Failed to pull data from Google Sheets'
      };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Bidirectional sync
  const syncWithGoogleSheets = useCallback(async () => {
    if (!googleSheetsService.isConnected()) {
      throw new Error('Google Sheets not connected');
    }

    setIsSyncing(true);
    try {
      const config = googleSheetsService.getConfig();
      if (!config?.spreadsheetId) {
        throw new Error('No spreadsheet selected');
      }

      // Ensure required sheets exist
      await googleSheetsService.createSheetsIfNeeded(config.spreadsheetId);
      
      // First pull any changes from Google Sheets
      const pulledData = await googleSheetsService.pullFromSheets();
      
      // Merge with local data (local data takes precedence for conflicts)
      const mergedProperties = [...properties];
      const mergedTenants = [...tenants];
      const mergedPayments = [...payments];
      const mergedRepairRequests = [...repairRequests];
      
      // Add any new items from Google Sheets that don't exist locally
      pulledData.properties.forEach(sheetProperty => {
        if (!mergedProperties.find(p => p.id === sheetProperty.id)) {
          mergedProperties.push(sheetProperty);
        }
      });
      
      pulledData.tenants.forEach(sheetTenant => {
        if (!mergedTenants.find(t => t.id === sheetTenant.id)) {
          mergedTenants.push(sheetTenant);
        }
      });
      
      pulledData.payments.forEach(sheetPayment => {
        if (!mergedPayments.find(p => p.id === sheetPayment.id)) {
          mergedPayments.push(sheetPayment);
        }
      });
      
      pulledData.repairRequests.forEach(sheetRequest => {
        if (!mergedRepairRequests.find(r => r.id === sheetRequest.id)) {
          mergedRepairRequests.push(sheetRequest);
        }
      });
      
      // Update local state
      setProperties(mergedProperties);
      setTenants(mergedTenants);
      setPayments(mergedPayments);
      setRepairRequests(mergedRepairRequests);
      
      // Push merged data back to Google Sheets
      await Promise.all([
        googleSheetsService.syncProperties(mergedProperties),
        googleSheetsService.syncTenants(mergedTenants),
        googleSheetsService.syncPayments(mergedPayments),
        googleSheetsService.syncRepairRequests(mergedRepairRequests)
      ]);

      return {
        success: true,
        message: 'Data successfully synced with Google Sheets'
      };
    } catch (error) {
      console.error('Bidirectional sync error:', error);
      return {
        success: false,
        message: 'Failed to sync with Google Sheets'
      };
    } finally {
      setIsSyncing(false);
    }
  }, [properties, tenants, payments, repairRequests]);
  return {
    // Data
    properties,
    tenants,
    payments,
    repairRequests,
    isSyncing,
    
    // Properties
    addProperty,
    updateProperty,
    deleteProperty,
    
    // Tenants
    addTenant,
    updateTenant,
    deleteTenant,
    
    // Payments
    addPayment,
    updatePayment,
    deletePayment,
    
    // Repair Requests
    addRepairRequest,
    updateRepairRequest,
    deleteRepairRequest,
    
    // Sync
    syncToGoogleSheets,
    pullFromGoogleSheets,
    syncWithGoogleSheets
  };
};