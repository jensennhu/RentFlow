// src/hooks/useData.ts
import { useState, useCallback, useEffect } from 'react';
import { Property, Tenant, Payment, RepairRequest } from '../types';
import { supabaseService } from '../services/supabaseService';

// Mock data for dev only
import {
  properties as mockProperties,
  tenants as mockTenants,
  payments as mockPayments,
  repairRequests as mockRepairRequests,
} from '../data/mockData';

const isDev = import.meta.env.MODE === 'development';
const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';

export const useData = () => {
  // -----------------------
  // State
  // -----------------------
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // -----------------------
  // Load initial data
  // -----------------------
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      if (useSupabase) {
        try {
          // Test connection first
          const isConnected = await supabaseService.testConnection();
          if (!isConnected) {
            console.warn('Supabase connection failed, using mock data');
            if (isDev) {
              setProperties(mockProperties);
              setTenants(mockTenants);
              setPayments(mockPayments);
              setRepairRequests(mockRepairRequests);
            }
          } else {
            // Load data from Supabase
            const data = await supabaseService.syncAllData();
            setProperties(data.properties);
            setTenants(data.tenants);
            setPayments(data.payments);
            setRepairRequests(data.repairRequests);
          }
        } catch (error) {
          console.error('Error loading data from Supabase:', error);
          if (isDev) {
            console.log('Falling back to mock data');
            setProperties(mockProperties);
            setTenants(mockTenants);
            setPayments(mockPayments);
            setRepairRequests(mockRepairRequests);
          }
        }
      } else if (isDev) {
        // Use mock data in development when Supabase is disabled
        setProperties(mockProperties);
        setTenants(mockTenants);
        setPayments(mockPayments);
        setRepairRequests(mockRepairRequests);
      }
      
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // -----------------------
  // Helpers
  // -----------------------
  const formatRentMonth = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // -----------------------
  // Payments Generation
  // -----------------------
  const generatePaymentsForMonth = useCallback(
    async (
      targetDate: Date = new Date(),
      propertiesToProcess: Property[] = properties,
      forceCreate: boolean = false
    ) => {
      const rentMonthString = formatRentMonth(
        new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      );

      let generatedCount = 0;
      const newPayments: Payment[] = [];

      for (const property of propertiesToProcess) {
        const existingPayment = payments.find(
          (p) => p.propertyId === property.id && p.rentMonth === rentMonthString
        );

        if (!existingPayment && (property.status === 'occupied' || forceCreate)) {
          const tenant = tenants.find((t) => t.propertyId === property.id);
          const rentAmount = tenant?.rentAmount ?? property.rent;

          const newPayment: Omit<Payment, 'id'> = {
            propertyId: property.id,
            tenantId: tenant?.id || '',
            amount: rentAmount,
            amountPaid: 0,
            date: '',
            status: 'Not Paid Yet',
            method: '',
            rentMonth: rentMonthString,
          };

          if (useSupabase) {
            try {
              const createdPayment = await supabaseService.createPayment(newPayment);
              newPayments.push(createdPayment);
              generatedCount++;
            } catch (error) {
              console.error('Error creating payment in Supabase:', error);
            }
          } else {
            // Local-only mode
            const localPayment: Payment = {
              ...newPayment,
              id: Date.now().toString() + property.id + Math.random().toString(36).slice(2, 9),
            };
            newPayments.push(localPayment);
            generatedCount++;
          }
        }
      }

      if (newPayments.length > 0) {
        setPayments((prev) => [...prev, ...newPayments]);
      }

      return { generated: generatedCount, month: rentMonthString };
    },
    [properties, tenants, payments, useSupabase]
  );

  const generateCurrentAndNextMonth = useCallback(async () => {
    const now = new Date();
    const currentResults = await generatePaymentsForMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
    const nextResults = await generatePaymentsForMonth(
      new Date(now.getFullYear(), now.getMonth() + 1, 1)
    );

    return {
      current: currentResults,
      next: nextResults,
      totalGenerated: currentResults.generated + nextResults.generated,
    };
  }, [generatePaymentsForMonth]);

  const generatePaymentsForSpecificMonth = useCallback(
    async (month: number, year: number, forceCreate: boolean = false) => {
      const targetDate = new Date(year, month - 1, 1);
      return await generatePaymentsForMonth(targetDate, properties, forceCreate);
    },
    [generatePaymentsForMonth, properties]
  );

  const generatePaymentsForRange = useCallback(
    async (startMonth: number, startYear: number, endMonth: number, endYear: number) => {
      const results: Awaited<ReturnType<typeof generatePaymentsForMonth>>[] = [];
      let currentDate = new Date(startYear, startMonth - 1, 1);
      const endDate = new Date(endYear, endMonth - 1, 1);

      while (currentDate <= endDate) {
        results.push(await generatePaymentsForMonth(currentDate, properties, false));
        currentDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1
        );
      }

      return results;
    },
    [generatePaymentsForMonth, properties]
  );

  const generateUpcomingMonths = useCallback(
    async (monthsAhead: number = 6) => {
      const now = new Date();
      const results: Awaited<ReturnType<typeof generatePaymentsForMonth>>[] = [];

      for (let i = 0; i < monthsAhead; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        results.push(await generatePaymentsForMonth(targetDate, properties, false));
      }

      return results;
    },
    [generatePaymentsForMonth, properties]
  );

  // -----------------------
  // Properties CRUD
  // -----------------------
  const addProperty = useCallback(async (property: Omit<Property, 'id'>) => {
    if (useSupabase) {
      try {
        const newProperty = await supabaseService.createProperty(property);
        setProperties((prev) => [...prev, newProperty]);
        return newProperty;
      } catch (error) {
        console.error('Error creating property:', error);
        throw error;
      }
    } else {
      // Local-only mode
      const newProperty: Property = { ...property, id: Date.now().toString() };
      setProperties((prev) => [...prev, newProperty]);
      return newProperty;
    }
  }, [useSupabase]);

  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    if (useSupabase) {
      try {
        const updatedProperty = await supabaseService.updateProperty(id, updates);
        setProperties((prev) =>
          prev.map((p) => (p.id === id ? updatedProperty : p))
        );
        return updatedProperty;
      } catch (error) {
        console.error('Error updating property:', error);
        throw error;
      }
    } else {
      // Local-only mode
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    }
  }, [useSupabase]);

  const deleteProperty = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deleteProperty(id);
        setProperties((prev) => prev.filter((p) => p.id !== id));
        setTenants((prev) => prev.filter((t) => t.propertyId !== id));
        setPayments((prev) => prev.filter((p) => p.propertyId !== id));
      } catch (error) {
        console.error('Error deleting property:', error);
        throw error;
      }
    } else {
      // Local-only mode
      setProperties((prev) => prev.filter((p) => p.id !== id));
      setTenants((prev) => prev.filter((t) => t.propertyId !== id));
      setPayments((prev) => prev.filter((p) => p.propertyId !== id));
    }
  }, [useSupabase]);

  // -----------------------
  // Tenants CRUD
  // -----------------------
  const addTenant = useCallback(async (tenant: Omit<Tenant, 'id'>) => {
    const leaseEndDate = new Date(tenant.leaseEnd);
    const renewalDate = new Date(
      leaseEndDate.getFullYear(),
      leaseEndDate.getMonth() - 1,
      1
    );

    const tenantWithRenewal: Omit<Tenant, 'id'> = {
      ...tenant,
      leaseRenewal: renewalDate.toISOString().split('T')[0],
    };

    if (useSupabase) {
      try {
        const newTenant = await supabaseService.createTenant(tenantWithRenewal);
        setTenants((prev) => [...prev, newTenant]);

        // Mark property occupied
        await updateProperty(tenant.propertyId, { status: 'occupied' });
        
        return newTenant;
      } catch (error) {
        console.error('Error creating tenant:', error);
        throw error;
      }
    } else {
      // Local-only mode
      const newTenant: Tenant = {
        ...tenantWithRenewal,
        id: Date.now().toString(),
      };

      setTenants((prev) => [...prev, newTenant]);

      // Mark property occupied
      setProperties((prev) =>
        prev.map((p) =>
          p.id === tenant.propertyId ? { ...p, status: 'occupied' } : p
        )
      );

      return newTenant;
    }
  }, [useSupabase, updateProperty]);

  const updateTenant = useCallback(async (id: string, updates: Partial<Tenant>) => {
    const updatesWithRenewal = { ...updates };
    if (updates.leaseEnd) {
      const leaseEndDate = new Date(updates.leaseEnd);
      const renewalDate = new Date(
        leaseEndDate.getFullYear(),
        leaseEndDate.getMonth() - 1,
        1
      );
      updatesWithRenewal.leaseRenewal = renewalDate.toISOString().split('T')[0];
    }

    if (useSupabase) {
      try {
        const updatedTenant = await supabaseService.updateTenant(id, updatesWithRenewal);
        setTenants((prev) => prev.map((t) => (t.id === id ? updatedTenant : t)));
        return updatedTenant;
      } catch (error) {
        console.error('Error updating tenant:', error);
        throw error;
      }
    } else {
      // Local-only mode
      setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatesWithRenewal } : t)));
    }
  }, [useSupabase]);

  const deleteTenant = useCallback(
    async (id: string) => {
      const tenant = tenants.find((t) => t.id === id);
      
      if (useSupabase) {
        try {
          await supabaseService.deleteTenant(id);
          setTenants((prev) => prev.filter((t) => t.id !== id));

          if (tenant) {
            await updateProperty(tenant.propertyId, { status: 'vacant' });
          }
        } catch (error) {
          console.error('Error deleting tenant:', error);
          throw error;
        }
      } else {
        // Local-only mode
        setTenants((prev) => prev.filter((t) => t.id !== id));

        if (tenant) {
          setProperties((prev) =>
            prev.map((p) =>
              p.id === tenant.propertyId ? { ...p, status: 'vacant' } : p
            )
          );
        }
      }
    },
    [tenants, useSupabase, updateProperty]
  );

  // -----------------------
  // Payments CRUD
  // -----------------------
  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    if (useSupabase) {
      try {
        const newPayment = await supabaseService.createPayment(payment);
        setPayments((prev) => [...prev, newPayment]);
        return newPayment;
      } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
      }
    } else {
      // Local-only mode
      const newPayment: Payment = { ...payment, id: Date.now().toString() };
      setPayments((prev) => [...prev, newPayment]);
      return newPayment;
    }
  }, [useSupabase]);

  const updatePayment = useCallback(async (id: string, updates: Partial<Payment>) => {
    const updatesWithStatus = { ...updates };
    if (updates.amountPaid !== undefined && updates.amount !== undefined) {
      if (updates.amountPaid === 0) {
        updatesWithStatus.status = 'Not Paid Yet';
      } else if (updates.amountPaid >= updates.amount) {
        updatesWithStatus.status = 'Paid';
      } else {
        updatesWithStatus.status = 'Partially Paid';
      }
    }

    if (useSupabase) {
      try {
        const updatedPayment = await supabaseService.updatePayment(id, updatesWithStatus);
        setPayments((prev) => prev.map((p) => (p.id === id ? updatedPayment : p)));
        return updatedPayment;
      } catch (error) {
        console.error('Error updating payment:', error);
        throw error;
      }
    } else {
      // Local-only mode
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatesWithStatus } : p)));
    }
  }, [useSupabase]);

  const deletePayment = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deletePayment(id);
        setPayments((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
      }
    } else {
      // Local-only mode
      setPayments((prev) => prev.filter((p) => p.id !== id));
    }
  }, [useSupabase]);

  // -----------------------
  // Repair Requests CRUD
  // -----------------------
  const addRepairRequest = useCallback(async (request: Omit<RepairRequest, 'id'>) => {
    if (useSupabase) {
      try {
        const newRequest = await supabaseService.createRepairRequest(request);
        setRepairRequests((prev) => [...prev, newRequest]);
        return newRequest;
      } catch (error) {
        console.error('Error creating repair request:', error);
        throw error;
      }
    } else {
      // Local-only mode
      const newRequest: RepairRequest = { ...request, id: Date.now().toString() };
      setRepairRequests((prev) => [...prev, newRequest]);
      return newRequest;
    }
  }, [useSupabase]);

  const updateRepairRequest = useCallback(
    async (id: string, updates: Partial<RepairRequest>) => {
    const updatesWithDate = { ...updates };
      if (updates.status === 'completed' && !updates.dateResolved) {
        updatesWithDate.dateResolved = new Date().toISOString().split('T')[0];
      }

      if (useSupabase) {
        try {
          const updatedRequest = await supabaseService.updateRepairRequest(id, updatesWithDate);
          setRepairRequests((prev) =>
            prev.map((r) => (r.id === id ? updatedRequest : r))
          );
          return updatedRequest;
        } catch (error) {
          console.error('Error updating repair request:', error);
          throw error;
        }
      } else {
        // Local-only mode
        setRepairRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...updatesWithDate } : r))
        );
      }
    },
    [useSupabase]
  );

  const deleteRepairRequest = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deleteRepairRequest(id);
        setRepairRequests((prev) => prev.filter((r) => r.id !== id));
      } catch (error) {
        console.error('Error deleting repair request:', error);
        throw error;
      }
    } else {
      // Local-only mode
      setRepairRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }, [useSupabase]);

  // -----------------------
  // Supabase Sync
  // -----------------------
  const syncWithSupabase = useCallback(async () => {
    if (!useSupabase) {
      throw new Error('Supabase not enabled');
    }
    
    setIsSyncing(true);

    try {
      const data = await supabaseService.syncAllData();

      setProperties(data.properties);
      setTenants(data.tenants);
      setPayments(data.payments);
      setRepairRequests(data.repairRequests);

      return { success: true, message: 'Data synced with Supabase successfully' };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync with Supabase',
      };
    } finally {
      setIsSyncing(false);
    }
  }, [useSupabase]);

  // Backward compatibility methods (now no-ops or redirects)
  const syncToGoogleSheets = useCallback(async () => {
    return { success: false, message: 'Google Sheets integration has been replaced with Supabase' };
  }, []);

  const pullFromGoogleSheets = useCallback(async () => {
    return { success: false, message: 'Google Sheets integration has been replaced with Supabase' };
  }, []);

  const syncWithGoogleSheets = useCallback(async () => {
    return syncWithSupabase();
  }, [syncWithSupabase]);

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
    isLoading,

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

    // Sync (Supabase)
    syncWithSupabase,
    
    // Backward compatibility (deprecated)
    syncToGoogleSheets,
    pullFromGoogleSheets,
    syncWithGoogleSheets,
  };
};