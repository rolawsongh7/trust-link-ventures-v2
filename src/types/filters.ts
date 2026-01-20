export interface SearchFilters {
  customer: string;
  orderNumber: string;
  status: string[];
  dateRange: { from: Date; to: Date } | null;
  amountRange: { min: number; max: number } | null;
  origin: 'all' | 'auto' | 'manual';
  currency: string[];
}

export interface QuoteSearchFilters {
  customer: string;
  quoteNumber: string;
  status: string[];
  dateRange: { from: Date; to: Date } | null;
  amountRange: { min: number; max: number } | null;
}

export const ORDER_STATUSES = [
  'order_confirmed',
  'pending_payment',
  'payment_received',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivery_confirmation_pending',
  'delivered',
  'cancelled',
  'delivery_failed'
] as const;

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'converted'
] as const;

export interface InvoiceSearchFilters {
  searchTerm: string;
  status: string[];
  invoiceType: string[];
  dateRange: { from: Date; to: Date } | null;
  timePeriod: 'all' | 'week' | 'month' | 'quarter' | 'year';
  amountRange: { min: number; max: number } | null;
  currency: string[];
}

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'paid',
  'cancelled'
] as const;

export const INVOICE_TYPES = [
  'proforma',
  'commercial',
  'packing_list'
] as const;
