// Payment Status and Types for the Partial Payment Workflow

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid';

export type PaymentType = 'deposit' | 'balance' | 'adjustment' | 'refund';

export interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  proof_url?: string;
  verified_at?: string;
  verified_by?: string;
  recorded_by?: string;
  created_at: string;
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  balanceRemaining: number;
  paymentStatus: PaymentStatus;
  payments: PaymentRecord[];
  lastPaymentDate?: string;
}

// Helper functions for payment status checks
export const isUnpaid = (status: PaymentStatus): boolean => status === 'unpaid';
export const isPartiallyPaid = (status: PaymentStatus): boolean => status === 'partially_paid';
export const isFullyPaid = (status: PaymentStatus): boolean => status === 'fully_paid';
export const isOverpaid = (status: PaymentStatus): boolean => status === 'overpaid';

// Check if shipping is allowed based on payment status
export const canShip = (paymentStatus: PaymentStatus): boolean => {
  return paymentStatus === 'fully_paid' || paymentStatus === 'overpaid';
};

// Get payment status label for display
export const getPaymentStatusLabel = (status: PaymentStatus): string => {
  const labels: Record<PaymentStatus, string> = {
    unpaid: 'Unpaid',
    partially_paid: 'Partially Paid',
    fully_paid: 'Fully Paid',
    overpaid: 'Overpaid',
  };
  return labels[status] || status;
};

// Get payment type label for display
export const getPaymentTypeLabel = (type: PaymentType): string => {
  const labels: Record<PaymentType, string> = {
    deposit: 'Deposit',
    balance: 'Balance',
    adjustment: 'Adjustment',
    refund: 'Refund',
  };
  return labels[type] || type;
};
