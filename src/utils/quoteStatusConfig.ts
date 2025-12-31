import { 
  Clock, 
  FileText, 
  FileCheck, 
  CheckCircle, 
  XCircle, 
  Package, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface QuoteStatusConfig {
  label: string;
  customerLabel: string;
  icon: LucideIcon;
  className: string;
  borderClass: string;
  description: string;
  customerHint?: string;
  group: 'active' | 'completed' | 'cancelled';
}

export const quoteStatusConfig: Record<string, QuoteStatusConfig> = {
  draft: {
    label: 'Draft',
    customerLabel: 'Draft',
    icon: FileText,
    className: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-600',
    borderClass: 'border-l-slate-500',
    description: 'Quote request is still a draft',
    customerHint: 'This quote request is still being prepared.',
    group: 'active',
  },
  pending: {
    label: 'Pending Review',
    customerLabel: 'Under Review',
    icon: Clock,
    className: 'bg-[hsl(var(--tl-warning-bg))] text-[hsl(var(--tl-warning-text))] border border-[hsl(var(--tl-warning))]',
    borderClass: 'border-l-[hsl(var(--tl-warning))]',
    description: 'Your request is being reviewed',
    customerHint: 'Our team is reviewing your quote request and will respond shortly.',
    group: 'active',
  },
  processing: {
    label: 'Processing',
    customerLabel: 'In Progress',
    icon: Loader2,
    className: 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    borderClass: 'border-l-purple-500',
    description: 'Quote is being prepared',
    customerHint: 'Your quote is being prepared by our team.',
    group: 'active',
  },
  quoted: {
    label: 'Quote Sent',
    customerLabel: 'Quote Ready',
    icon: FileCheck,
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-400))]',
    borderClass: 'border-l-[hsl(var(--tl-maritime-500))]',
    description: 'A quote is ready for your review',
    customerHint: 'A quote has been prepared for you. Please review and accept or decline.',
    group: 'active',
  },
  approved: {
    label: 'Approved',
    customerLabel: 'Accepted',
    icon: CheckCircle,
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    borderClass: 'border-l-[hsl(var(--tl-success))]',
    description: 'You have accepted this quote',
    customerHint: 'You have accepted this quote. An order will be created shortly.',
    group: 'completed',
  },
  rejected: {
    label: 'Rejected',
    customerLabel: 'Declined',
    icon: XCircle,
    className: 'bg-[hsl(var(--tl-danger-bg))] text-[hsl(var(--tl-danger-text))] border border-[hsl(var(--tl-danger))]',
    borderClass: 'border-l-[hsl(var(--tl-danger))]',
    description: 'This quote was declined',
    customerHint: 'This quote was declined. You can request a new quote if needed.',
    group: 'cancelled',
  },
  converted: {
    label: 'Converted',
    customerLabel: 'Order Created',
    icon: Package,
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    borderClass: 'border-l-emerald-500',
    description: 'This quote has become an order',
    customerHint: 'This quote has been converted to an order. View your orders for details.',
    group: 'completed',
  },
  completed: {
    label: 'Completed',
    customerLabel: 'Completed',
    icon: CheckCircle,
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    borderClass: 'border-l-[hsl(var(--tl-success))]',
    description: 'This quote has been fulfilled',
    customerHint: 'This quote process has been completed.',
    group: 'completed',
  },
  expired: {
    label: 'Expired',
    customerLabel: 'Expired',
    icon: AlertTriangle,
    className: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-600',
    borderClass: 'border-l-slate-500',
    description: 'This quote has expired',
    customerHint: 'This quote has expired. Please request a new quote if still interested.',
    group: 'cancelled',
  },
};

// Default config for unknown statuses
const defaultConfig: QuoteStatusConfig = {
  label: 'Unknown',
  customerLabel: 'Processing',
  icon: Clock,
  className: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-600',
  borderClass: 'border-l-slate-400',
  description: 'Status unknown',
  customerHint: 'Please contact support for more information about your quote.',
  group: 'active',
};

export function getQuoteStatusConfig(status: string): QuoteStatusConfig {
  return quoteStatusConfig[status] || defaultConfig;
}

export function getQuoteStatusLabel(status: string, customerFacing = true): string {
  const config = getQuoteStatusConfig(status);
  return customerFacing ? config.customerLabel : config.label;
}

export function getQuoteStatusIcon(status: string) {
  return getQuoteStatusConfig(status).icon;
}

// Filter options for the customer quotes page - uses same values as existing code
export const quoteStatusFilterOptions = [
  { value: 'all', label: 'All Quotes' },
  { value: 'pending', label: 'Under Review' },
  { value: 'quoted', label: 'Quote Ready' },
  { value: 'approved', label: 'Accepted' },
  { value: 'converted', label: 'Order Created' },
  { value: 'rejected', label: 'Declined' },
];
