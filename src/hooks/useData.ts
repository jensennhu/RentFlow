import { useState, useCallback, useEffect } from 'react';
import { Property, Tenant, Payment, RepairRequest } from '../types';
import { googleSheetsService } from '../services/googleSheets';

// Optional: load mock data in dev
import {
  properties as mockProperties,
  tenants as mockTenants,
  payments as mockPayments,
  repairRequests as mockRepairRequests,
} from '../data/mockData';

const isDev = process.env.NODE_ENV === 'development';

export const useData = () => {
  // Empty state by default
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load mock data only in dev if Sheets is not connected
  useEffect(() => {
    if (isDev && !googleSheetsService.isConnected()) {
      setProperties(mockProperties);
      setTenants(mockTenants);
      setPayments(mockPayments);
      setRepairRequests(mockRepairRequests);
    }
  }, []);

  // -----------------------
  // Payments Generation
  // -----------------------
  const generatePaymentsForMonth = useCallback((
    targetDate: Date = new Date(),
    propertiesToProcess: Property[] = properties,
    forceCreate: boolean = false
  ) => {
    const targetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const rentMonthString = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let generatedCount = 0;
    const newPayments: Payment[] = [];

    propertiesToProcess.forEach(property => {
      const existingPayment = payments.find(
        p => p.propertyId === property.id && p.rentMonth === rentMonthString
      );

      if (!existingPayment && (property.status === 'occupied' || forceCreate)) {
        const tenant = tenants.find(t => t.propertyId === property.id);
        const rentAmount = tenant?.rentAmount || property.rent;

        const newPayment: Payment = {
          id: Date.now().toString() + property.id + Math.random().toString(36).substr(2, 9),
          propertyId: property.id,
          amount: rentAmount,
          amountPaid: 0,
          date: '',
          status: 'Not Paid Yet',
          method: '',
          rentMonth: rentMonthString,
        };

        newPayments.push(newPayment);
        generatedCount++;
      }
    });

    if (newPayments.length > 0) {
      setPayments(prev => [...prev, ...newPayments]);
    }

    return { generated: generatedCount, month: rentMonthString };
  }, [properties, tenants, payments]);

  const generateCurrentAndNextMonth = useCallback(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const currentResults = generatePaymentsForMonth(currentMonth);
    const nextResults = generatePaymentsForMonth(nextMonth);

    return {
      current: currentResults,
      next: nextResults,
      totalGenerated: currentResults.generated + nextResults.generated,
    };
  }, [generatePaymentsForMonth]);

  const generatePaymentsForSpecificMonth = useCallback((month: number, year: number, forceCreate: boolean = false) => {
    const targetDate = new Date(year, month - 1, 1);
    return generatePaymentsForMonth(targetDate, properties, forceCreate);
  }, [generatePaymentsForMonth, properties]);

  const generatePaymentsForRange = useCallback((startMonth: number, startYear: number, endMonth: number, endYear: number) => {
    const results = [];
    let currentDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth - 1, 1);

    while (currentDate <= endDate) {
      const result = generatePaymentsForMonth(currentDate, properties, false);
      results.push(result);
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    return results;
  }, [generatePaymentsForMonth, properties]);

  const generateUpcomingMonths = useCallback((monthsAhead: number = 6) => {
    const now = new Date();
    const results = [];

    for (let i = 0; i < monthsAhead; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const result = generatePaymentsForMonth(targetDate, properties, false);
      results.push(result);
    }

    return results;
  }, [generatePaymentsForMonth, properties]);

  // -----------------------
  // Properties CRUD
  // -----------------------
  const addProperty = useCallback((property: Omit<Property, 'id'>) => {
    const newProperty: Property = { ...property, id: Date.now().toString() };
    setProperties(prev => [...prev, newProperty]);
    return newProperty;
  }, []);

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    setTenants(prev => prev.filter(t => t.propertyId !== id));
    setPayments(prev => prev.filter(p => p.propertyId !== id));
  }, []);

  // -----------------------
  // Tenants CRUD
  // -----------------------
  const addTenant = useCallback((tenant: Omit<Tenant, 'id'>) => {
    const leaseEndDate = new Date(tenant.leaseEnd);
    const renewalDate = new Date(leaseEndDate.getFullYear(), leaseEndDate.getMonth() - 1, 0);

    const newTenant: Tenant = {
      ...tenant,
      id: Date.now().toString(),
      leaseRenewal: renewalDate.toISOString().split('T')[0],
    };
    setTenants(prev => [...prev, newTenant]);

    setProperties(prev => prev.map(p =>
      p.id === tenant.propertyId ? { ...p, status: 'occupied' } : p
    ));

    return newTenant;
  }, []);

  const updateTenant = useCallback((id: string, updates: Partial<Tenant>) => {
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
    if (tenant) {
      setProperties(prev => prev.map(p =>
        p.id === tenant.propertyId ? { ...p, status: 'vacant' } : p
      ));
    }
  }, [tenants]);

  // -----------------------
  // Payments CRUD
  // -----------------------
  const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
    const newPayment: Payment = { ...payment, id: Date.now().toString() };
    setPayments(prev => [...prev, newPayment]);
    return newPayment;
  }, []);

  const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    if (updates.amountPaid !== undefined && updates.amount !== undefined) {
      const { amountPaid, amount } = updates;
      if (amountPaid === 0) {
        updates.status = 'Not Paid Yet';
      } else if (amountPaid >= amount) {
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

  // -----------------------
  // Repair Requests CRUD
  // -----------------------
  const addRepairRequest = useCallback((request: Omit<RepairRequest, 'id'>) => {
    const newRequest: RepairRequest = { ...request, id: Date.now().toString() };
    setRepairRequests(prev => [...prev, newRequest]);
    return newRequest;
  }, []);

  const updateRepairRequest = useCallback((id: string, updates: Partial<RepairRequest>) => {
    if (updates.status === 'completed' && !updates.dateResolved) {
      updates.dateResolved = new Date().toISOString().split('T')[0];
    }
    setRepairRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRepairRequest = useCallback((id: string) => {
    setRepairRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  // -----------------------
  // Google Sheets Sync
  // -----------------------
  const syncToGoogleSheets = useCallback(async () => {
    if (!googleSheetsService.isConnected()) throw new Error('Google Sheets not connected');
    setIsSyncing(true);

    try {
      const config = googleSheetsService.getConfig();
      if (!config?.spreadsheetId) throw new Error('No spreadsheet selected');

      await googleSheetsService.createSheetsIfNeeded(config.spreadsheetId);

      await Promise.all([
        googleSheetsService.syncProperties(properties),
        googleSheetsService.syncTenants(tenants),
        googleSheetsService.syncPayments(payments),
        googleSheetsService.syncRepairRequests(repairRequests),
      ]);

      return { success: true, message: 'Data synced to Google Sheets' };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to sync' };
    } finally {
      setIsSyncing(false);
    }
  }, [properties, tenants, payments, repairRequests]);

  const pullFromGoogleSheets = useCallback(async () => {
    if (!googleSheetsService.isConnected()) throw new Error('Google Sheets not connected');
    setIsSyncing(true);

    try {
      const config = googleSheetsService.getConfig();
      if (!config?.spreadsheetId) throw new Error('No spreadsheet selected');

      const data = await googleSheetsService.pullFromSheets();

      // Always replace state completely (mock data cleared)
      setProperties(data.properties);
      setTenants(data.tenants);
      setPayments(data.payments);
      setRepairRequests(data.repairRequests);

      return { success: true, message: 'Data pulled from Google Sheets' };
    } catch (error) {
      console.error('Pull error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to pull' };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const syncWithGoogleSheets = useCallback(async () => {
    if (!googleSheetsService.isConnected()) throw new Error('Google Sheets not connected');
    setIsSyncing(true);

    try {
      const config = googleSheetsService.getConfig();
      if (!config?.spreadsheetId) throw new Error('No spreadsheet selected');

      await googleSheetsService.createSheetsIfNeeded(config.spreadsheetId);

      const pulledData = await googleSheetsService.pullFromSheets();

      // Always replace with pulled data first (no merging with mock)
      setProperties(pulledData.properties);
      setTenants(pulledData.tenants);
      setPayments(pulledData.payments);
      setRepairRequests(pulledData.repairRequests);

      // Push updated data back
      await Promise.all([
        googleSheetsService.syncProperties(pulledData.properties),
        googleSheetsService.syncTenants(pulledData.tenants),
        googleSheetsService.syncPayments(pulledData.payments),
        googleSheetsService.syncRepairRequests(pulledData.repairRequests),
      ]);

      return { success: true, message: 'Data synced with Google Sheets' };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to sync' };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // -----------------------
  // Return API
  // -----------------------
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

    // Payment Generators
    generatePaymentsForMonth,
    generatePaymentsForSpecificMonth,
    generatePaymentsForRange,
    generateCurrentAndNextMonth,
    generateUpcomingMonths,

    // Sync
    syncToGoogleSheets,
    pullFromGoogleSheets,
    syncWithGoogleSheets,
  };
};
