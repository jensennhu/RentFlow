// src/hooks/useData.ts
import { useState, useCallback, useEffect } from 'react';
import { Property, Tenant, Payment, RepairRequest, Expense } from '../types';
import { supabaseService } from '../services/supabaseService';

// Mock data for dev only

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
              setExpenses(mockExpenses);
            }
          } else {
            // Load data from Supabase
            const data = await supabaseService.syncAllData();
            setProperties(data.properties);
            setTenants(data.tenants);
            setPayments(data.payments);
            setRepairRequests(data.repairRequests);
            setExpenses(data.expenses);
          }
        } catch (error) {
          console.error('Error loading data from Supabase:', error);
          if (isDev) {
            console.log('Falling back to mock data');
            setProperties(mockProperties);
            setTenants(mockTenants);
            setPayments(mockPayments);
            setRepairRequests(mockRepairRequests);
            setExpenses(mockExpenses);
          }
        }
      } else if (isDev) {
        // Use mock data in development when Supabase is disabled
        setProperties(mockProperties);
        setTenants(mockTenants);
        setPayments(mockPayments);
        setRepairRequests(mockRepairRequests);
        setExpenses(mockExpenses);
      }
      
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // -----------------------
  // Sync with Supabase
  // -----------------------
  const syncWithSupabase = useCallback(async () => {
    if (!useSupabase) {
      return { success: false, message: 'Supabase is not enabled' };
    }

    setIsSyncing(true);
    try {
      const data = await supabaseService.syncAllData();
      setProperties(data.properties);
      setTenants(data.tenants);
      setPayments(data.payments);
      setRepairRequests(data.repairRequests);
      setExpenses(data.expenses);
      return { success: true, message: 'Data synced successfully' };
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to sync data' 
      };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // -----------------------
  // Properties CRUD
  // -----------------------
  const addProperty = useCallback(async (property: Omit<Property, 'id'>) => {
    if (useSupabase) {
      try {
        const newProperty = await supabaseService.addProperty(property);
        setProperties(prev => [...prev, newProperty]);
      } catch (error) {
        console.error('Error adding property:', error);
        throw error;
      }
    } else {
      const newProperty = { ...property, id: Date.now().toString() };
      setProperties(prev => [...prev, newProperty]);
    }
  }, []);

  const updateProperty = useCallback(async (id: string, property: Partial<Property>) => {
    if (useSupabase) {
      try {
        const updatedProperty = await supabaseService.updateProperty(id, property);
        setProperties(prev => prev.map(p => p.id === id ? updatedProperty : p));
      } catch (error) {
        console.error('Error updating property:', error);
        throw error;
      }
    } else {
      setProperties(prev => prev.map(p => p.id === id ? { ...p, ...property } : p));
    }
  }, []);

  const deleteProperty = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deleteProperty(id);
        setProperties(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting property:', error);
        throw error;
      }
    } else {
      setProperties(prev => prev.filter(p => p.id !== id));
    }
  }, []);

  // -----------------------
  // Tenants CRUD
  // -----------------------
  const addTenant = useCallback(async (tenant: Omit<Tenant, 'id'>) => {
    if (useSupabase) {
      try {
        const newTenant = await supabaseService.addTenant(tenant);
        setTenants(prev => [...prev, newTenant]);
      } catch (error) {
        console.error('Error adding tenant:', error);
        throw error;
      }
    } else {
      const newTenant = { ...tenant, id: Date.now().toString() };
      setTenants(prev => [...prev, newTenant]);
    }
  }, []);

  const updateTenant = useCallback(async (id: string, tenant: Partial<Tenant>) => {
    if (useSupabase) {
      try {
        const updatedTenant = await supabaseService.updateTenant(id, tenant);
        setTenants(prev => prev.map(t => t.id === id ? updatedTenant : t));
      } catch (error) {
        console.error('Error updating tenant:', error);
        throw error;
      }
    } else {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, ...tenant } : t));
    }
  }, []);

  const deleteTenant = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deleteTenant(id);
        setTenants(prev => prev.filter(t => t.id !== id));
      } catch (error) {
        console.error('Error deleting tenant:', error);
        throw error;
      }
    } else {
      setTenants(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  // -----------------------
  // Payments CRUD
  // -----------------------
  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    if (useSupabase) {
      try {
        const newPayment = await supabaseService.addPayment(payment);
        setPayments(prev => [...prev, newPayment]);
      } catch (error) {
        console.error('Error adding payment:', error);
        throw error;
      }
    } else {
      const newPayment = { ...payment, id: Date.now().toString() };
      setPayments(prev => [...prev, newPayment]);
    }
  }, []);

  const updatePayment = useCallback(async (id: string, payment: Partial<Payment>) => {
    if (useSupabase) {
      try {
        const updatedPayment = await supabaseService.updatePayment(id, payment);
        setPayments(prev => prev.map(p => p.id === id ? updatedPayment : p));
      } catch (error) {
        console.error('Error updating payment:', error);
        throw error;
      }
    } else {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, ...payment } : p));
    }
  }, []);

  const deletePayment = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deletePayment(id);
        setPayments(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
      }
    } else {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
  }, []);

  // -----------------------
  // Repair Requests CRUD
  // -----------------------
  const addRepairRequest = useCallback(async (request: Omit<RepairRequest, 'id'>) => {
    if (useSupabase) {
      try {
        const newRequest = await supabaseService.addRepairRequest(request);
        setRepairRequests(prev => [...prev, newRequest]);
      } catch (error) {
        console.error('Error adding repair request:', error);
        throw error;
      }
    } else {
      const newRequest = { ...request, id: Date.now().toString() };
      setRepairRequests(prev => [...prev, newRequest]);
    }
  }, []);

  const updateRepairRequest = useCallback(async (id: string, request: Partial<RepairRequest>) => {
    if (useSupabase) {
      try {
        const updatedRequest = await supabaseService.updateRepairRequest(id, request);
        setRepairRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
      } catch (error) {
        console.error('Error updating repair request:', error);
        throw error;
      }
    } else {
      setRepairRequests(prev => prev.map(r => r.id === id ? { ...r, ...request } : r));
    }
  }, []);

  const deleteRepairRequest = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deleteRepairRequest(id);
        setRepairRequests(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error('Error deleting repair request:', error);
        throw error;
      }
    } else {
      setRepairRequests(prev => prev.filter(r => r.id !== id));
    }
  }, []);

  // -----------------------
  // Expenses CRUD
  // -----------------------
  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    if (useSupabase) {
      try {
        const newExpense = await supabaseService.addExpense(expense);
        setExpenses(prev => [...prev, newExpense]);
      } catch (error) {
        console.error('Error adding expense:', error);
        throw error;
      }
    } else {
      const newExpense = { ...expense, id: Date.now().toString() };
      setExpenses(prev => [...prev, newExpense]);
    }
  }, []);

  const updateExpense = useCallback(async (id: string, expense: Partial<Expense>) => {
    if (useSupabase) {
      try {
        const updatedExpense = await supabaseService.updateExpense(id, expense);
        setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      } catch (error) {
        console.error('Error updating expense:', error);
        throw error;
      }
    } else {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...expense } : e));
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await supabaseService.deleteExpense(id);
        setExpenses(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error('Error deleting expense:', error);
        throw error;
      }
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  }, []);

  return {
    // State
    properties,
    tenants,
    payments,
    repairRequests,
    expenses,
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
    
    // Expenses
    addExpense,
    updateExpense,
    deleteExpense,
    
    // Sync
    syncWithSupabase,
  };
};