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
    return newProperty;
  }, []);

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    // Also remove associated tenants
    setTenants(prev => prev.filter(t => t.propertyId !== id));
  }, []);

  // Tenants CRUD
  const addTenant = useCallback((tenant: Omit<Tenant, 'id'>) => {
    const newTenant: Tenant = {
      ...tenant,
      id: Date.now().toString()
    };
    setTenants(prev => [...prev, newTenant]);
    // Update property status to occupied
    setProperties(prev => prev.map(p => 
      p.id === tenant.propertyId ? { ...p, status: 'occupied' as const } : p
    ));
    return newTenant;
  }, []);

  const updateTenant = useCallback((id: string, updates: Partial<Tenant>) => {
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
    // Remove associated payments
    setPayments(prev => prev.filter(p => p.tenantId !== id));
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
    setRepairRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRepairRequest = useCallback((id: string) => {
    setRepairRequests(prev => prev.filter(r => r.id !== id));
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
    syncToGoogleSheets
  };
};