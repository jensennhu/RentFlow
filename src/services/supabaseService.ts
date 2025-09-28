// src/services/supabaseService.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Property, Tenant, Payment, RepairRequest } from '../types';

// Database types that match your Supabase schema
export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          address: string;
          city: string;
          state: string;
          zipcode: string;
          rent: number;
          status: 'vacant' | 'occupied' | 'maintenance';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          property_id: string | null;
          lease_start: string;
          lease_end: string;
          rent_amount: number;
          payment_method: 'Zelle' | 'Direct Deposit' | 'Cash' | '' | null;
          lease_type: 'Yearly' | 'Monthly' | '' | null;
          lease_renewal: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          property_id: string | null;
          tenant_id: string | null;
          rent_month: string;
          amount: number;
          amount_paid: number;
          payment_date: string | null;
          status: 'Not Paid Yet' | 'Partially Paid' | 'Paid';
          method: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      repair_requests: {
        Row: {
          id: string;
          tenant_id: string | null;
          property_id: string | null;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'in-progress' | 'completed';
          date_submitted: string;
          date_resolved: string | null;
          category: string | null;
          close_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['repair_requests']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['repair_requests']['Insert']>;
      };
    };
  };
}

class SupabaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
      );
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  // Connection test
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('properties').select('count', { count: 'exact', head: true });
      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  // Properties CRUD
  async getProperties(): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }

    return (data || []).map(this.mapPropertyFromDB);
  }

  async createProperty(property: Omit<Property, 'id'>): Promise<Property> {
    const { data, error } = await this.supabase
      .from('properties')
      .insert([this.mapPropertyToDB(property)])
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      throw new Error(`Failed to create property: ${error.message}`);
    }

    return this.mapPropertyFromDB(data);
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const { data, error } = await this.supabase
      .from('properties')
      .update(this.mapPropertyToDB(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating property:', error);
      throw new Error(`Failed to update property: ${error.message}`);
    }

    return this.mapPropertyFromDB(data);
  }

  async deleteProperty(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting property:', error);
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  // Tenants CRUD
  async getTenants(): Promise<Tenant[]> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      throw new Error(`Failed to fetch tenants: ${error.message}`);
    }

    return (data || []).map(this.mapTenantFromDB);
  }

  async createTenant(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
    const { data, error } = await this.supabase
      .from('tenants')
      .insert([this.mapTenantToDB(tenant)])
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      throw new Error(`Failed to create tenant: ${error.message}`);
    }

    return this.mapTenantFromDB(data);
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await this.supabase
      .from('tenants')
      .update(this.mapTenantToDB(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tenant:', error);
      throw new Error(`Failed to update tenant: ${error.message}`);
    }

    return this.mapTenantFromDB(data);
  }

  async deleteTenant(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tenant:', error);
      throw new Error(`Failed to delete tenant: ${error.message}`);
    }
  }

  // Payments CRUD
  async getPayments(): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }

    return (data || []).map(this.mapPaymentFromDB);
  }

  async createPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .insert([this.mapPaymentToDB(payment)])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    return this.mapPaymentFromDB(data);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const { data, error } = await this.supabase
      .from('payments')
      .update(this.mapPaymentToDB(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      throw new Error(`Failed to update payment: ${error.message}`);
    }

    return this.mapPaymentFromDB(data);
  }

  async deletePayment(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment:', error);
      throw new Error(`Failed to delete payment: ${error.message}`);
    }
  }

  // Repair Requests CRUD
  async getRepairRequests(): Promise<RepairRequest[]> {
    const { data, error } = await this.supabase
      .from('repair_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching repair requests:', error);
      throw new Error(`Failed to fetch repair requests: ${error.message}`);
    }

    return (data || []).map(this.mapRepairRequestFromDB);
  }

  async createRepairRequest(request: Omit<RepairRequest, 'id'>): Promise<RepairRequest> {
    const { data, error } = await this.supabase
      .from('repair_requests')
      .insert([this.mapRepairRequestToDB(request)])
      .select()
      .single();

    if (error) {
      console.error('Error creating repair request:', error);
      throw new Error(`Failed to create repair request: ${error.message}`);
    }

    return this.mapRepairRequestFromDB(data);
  }

  async updateRepairRequest(id: string, updates: Partial<RepairRequest>): Promise<RepairRequest> {
    const { data, error } = await this.supabase
      .from('repair_requests')
      .update(this.mapRepairRequestToDB(updates))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating repair request:', error);
      throw new Error(`Failed to update repair request: ${error.message}`);
    }

    return this.mapRepairRequestFromDB(data);
  }

  async deleteRepairRequest(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('repair_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting repair request:', error);
      throw new Error(`Failed to delete repair request: ${error.message}`);
    }
  }

  // Bulk sync operations
  async syncAllData(): Promise<{
    properties: Property[];
    tenants: Tenant[];
    payments: Payment[];
    repairRequests: RepairRequest[];
  }> {
    try {
      const [properties, tenants, payments, repairRequests] = await Promise.all([
        this.getProperties(),
        this.getTenants(),
        this.getPayments(),
        this.getRepairRequests(),
      ]);

      return { properties, tenants, payments, repairRequests };
    } catch (error) {
      console.error('Error syncing all data:', error);
      throw new Error(`Failed to sync data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper mapping functions
  private mapPropertyFromDB(dbProperty: Database['public']['Tables']['properties']['Row']): Property {
    return {
      id: dbProperty.id,
      address: dbProperty.address,
      city: dbProperty.city,
      state: dbProperty.state,
      zipcode: dbProperty.zipcode,
      rent: Number(dbProperty.rent),
      status: dbProperty.status,
    };
  }

  private mapPropertyToDB(property: Partial<Property>): Partial<Database['public']['Tables']['properties']['Insert']> {
    const mapped: any = {};
    if (property.address !== undefined) mapped.address = property.address;
    if (property.city !== undefined) mapped.city = property.city;
    if (property.state !== undefined) mapped.state = property.state;
    if (property.zipcode !== undefined) mapped.zipcode = property.zipcode;
    if (property.rent !== undefined) mapped.rent = property.rent;
    if (property.status !== undefined) mapped.status = property.status;
    return mapped;
  }

  private mapTenantFromDB(dbTenant: Database['public']['Tables']['tenants']['Row']): Tenant {
    return {
      id: dbTenant.id,
      name: dbTenant.name,
      email: dbTenant.email || '',
      phone: dbTenant.phone || '',
      propertyId: dbTenant.property_id || '',
      leaseStart: dbTenant.lease_start,
      leaseEnd: dbTenant.lease_end,
      rentAmount: Number(dbTenant.rent_amount),
      paymentMethod: (dbTenant.payment_method as Tenant['paymentMethod']) || '',
      leaseType: (dbTenant.lease_type as Tenant['leaseType']) || '',
      leaseRenewal: dbTenant.lease_renewal || '',
    };
  }

  private mapTenantToDB(tenant: Partial<Tenant>): Partial<Database['public']['Tables']['tenants']['Insert']> {
    const mapped: any = {};
    if (tenant.name !== undefined) mapped.name = tenant.name;
    if (tenant.email !== undefined) mapped.email = tenant.email || null;
    if (tenant.phone !== undefined) mapped.phone = tenant.phone || null;
    if (tenant.propertyId !== undefined) mapped.property_id = tenant.propertyId || null;
    if (tenant.leaseStart !== undefined) mapped.lease_start = tenant.leaseStart;
    if (tenant.leaseEnd !== undefined) mapped.lease_end = tenant.leaseEnd;
    if (tenant.rentAmount !== undefined) mapped.rent_amount = tenant.rentAmount;
    if (tenant.paymentMethod !== undefined) mapped.payment_method = tenant.paymentMethod || null;
    if (tenant.leaseType !== undefined) mapped.lease_type = tenant.leaseType || null;
    if (tenant.leaseRenewal !== undefined) mapped.lease_renewal = tenant.leaseRenewal || null;
    return mapped;
  }

  private mapPaymentFromDB(dbPayment: Database['public']['Tables']['payments']['Row']): Payment {
    return {
      id: dbPayment.id,
      propertyId: dbPayment.property_id || '',
      tenantId: dbPayment.tenant_id || '',
      rentMonth: dbPayment.rent_month,
      amount: Number(dbPayment.amount),
      amountPaid: Number(dbPayment.amount_paid),
      date: dbPayment.payment_date || '',
      paymentDate: dbPayment.payment_date || '',
      status: dbPayment.status,
      method: dbPayment.method || '',
    };
  }

  private mapPaymentToDB(payment: Partial<Payment>): Partial<Database['public']['Tables']['payments']['Insert']> {
    const mapped: any = {};
    if (payment.propertyId !== undefined) mapped.property_id = payment.propertyId || null;
    if (payment.tenantId !== undefined) mapped.tenant_id = payment.tenantId || null;
    if (payment.rentMonth !== undefined) mapped.rent_month = payment.rentMonth;
    if (payment.amount !== undefined) mapped.amount = payment.amount;
    if (payment.amountPaid !== undefined) mapped.amount_paid = payment.amountPaid;
    if (payment.date !== undefined || payment.paymentDate !== undefined) {
      mapped.payment_date = payment.paymentDate || payment.date || null;
    }
    if (payment.status !== undefined) mapped.status = payment.status;
    if (payment.method !== undefined) mapped.method = payment.method || null;
    return mapped;
  }

  private mapRepairRequestFromDB(dbRepair: Database['public']['Tables']['repair_requests']['Row']): RepairRequest {
    return {
      id: dbRepair.id,
      tenantId: dbRepair.tenant_id || '',
      propertyId: dbRepair.property_id || '',
      title: dbRepair.title,
      description: dbRepair.description || '',
      priority: dbRepair.priority,
      status: dbRepair.status,
      dateSubmitted: dbRepair.date_submitted,
      dateResolved: dbRepair.date_resolved || undefined,
      category: dbRepair.category || '',
      closeNotes: dbRepair.close_notes || undefined,
    };
  }

  private mapRepairRequestToDB(request: Partial<RepairRequest>): Partial<Database['public']['Tables']['repair_requests']['Insert']> {
    const mapped: any = {};
    if (request.tenantId !== undefined) mapped.tenant_id = request.tenantId || null;
    if (request.propertyId !== undefined) mapped.property_id = request.propertyId || null;
    if (request.title !== undefined) mapped.title = request.title;
    if (request.description !== undefined) mapped.description = request.description || null;
    if (request.priority !== undefined) mapped.priority = request.priority;
    if (request.status !== undefined) mapped.status = request.status;
    if (request.dateSubmitted !== undefined) mapped.date_submitted = request.dateSubmitted;
    if (request.dateResolved !== undefined) mapped.date_resolved = request.dateResolved || null;
    if (request.category !== undefined) mapped.category = request.category || null;
    if (request.closeNotes !== undefined) mapped.close_notes = request.closeNotes || null;
    return mapped;
  }

  // Get the Supabase client for direct access if needed
  getClient(): SupabaseClient<Database> {
    return this.supabase;
  }
}

export const supabaseService = new SupabaseService();