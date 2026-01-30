/**
 * Shared test utilities and mocks for Phase 1.5 verification tests
 */

import { vi } from 'vitest';

// Mock order factory for consistent test data
export const createMockOrder = (overrides: Partial<MockOrder> = {}): MockOrder => ({
  id: 'test-order-id',
  order_number: 'ORD-TEST-001',
  customer_id: 'test-customer-id',
  total_amount: 1000,
  payment_amount_confirmed: 0,
  balance_remaining: 1000,
  payment_status: 'unpaid',
  status: 'pending_payment',
  currency: 'GHS',
  delivery_address_id: null,
  carrier: null,
  tracking_number: null,
  estimated_delivery_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export interface MockOrder {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  payment_amount_confirmed: number;
  balance_remaining: number;
  payment_status: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid';
  status: string;
  currency: string;
  delivery_address_id: string | null;
  carrier: string | null;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

// Mock payment record factory
export const createMockPaymentRecord = (overrides: Partial<MockPaymentRecord> = {}): MockPaymentRecord => ({
  id: 'test-payment-id',
  order_id: 'test-order-id',
  amount: 500,
  payment_type: 'deposit',
  payment_date: new Date().toISOString(),
  payment_method: 'bank_transfer',
  payment_reference: 'REF-001',
  verified_at: null,
  verified_by: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

export interface MockPaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_type: 'deposit' | 'balance' | 'adjustment' | 'refund';
  payment_date: string;
  payment_method: string;
  payment_reference: string;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
});

// Calculate expected payment status based on amounts
export const calculateExpectedPaymentStatus = (
  totalAmount: number,
  amountPaid: number
): 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid' => {
  if (amountPaid === 0) return 'unpaid';
  if (amountPaid < totalAmount) return 'partially_paid';
  if (amountPaid === totalAmount) return 'fully_paid';
  return 'overpaid';
};

// Calculate expected balance remaining
export const calculateExpectedBalanceRemaining = (
  totalAmount: number,
  amountPaid: number
): number => {
  return totalAmount - amountPaid;
};
