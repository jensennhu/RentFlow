import { z } from 'zod';

export const PropertySchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipcode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  rent: z.string().transform(val => parseInt(val)).refine(val => val > 0, 'Rent must be positive'),
  status: z.enum(['vacant', 'occupied', 'maintenance'])
});

export const TenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\d\s()+-]+$/, 'Invalid phone number'),
  propertyId: z.string().min(1, 'Property selection is required'),
  leaseStart: z.string().min(1, 'Lease start date is required'),
  leaseEnd: z.string().min(1, 'Lease end date is required'),
  rentAmount: z.string().transform(val => parseInt(val)).refine(val => val > 0, 'Rent amount must be positive')
});

export const PaymentSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  amount: z.string().transform(val => parseInt(val)).refine(val => val > 0, 'Amount must be positive'),
  amountPaid: z.string().transform(val => parseInt(val)).refine(val => val >= 0, 'Amount paid cannot be negative'),
  rentMonth: z.string().min(1, 'Rent month is required'),
  date: z.string().optional(),
  method: z.string().optional()
});