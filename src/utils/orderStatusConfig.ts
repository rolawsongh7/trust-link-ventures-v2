import { 
  Clock, 
  CreditCard, 
  CheckCircle, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  MapPin,
  Ban
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface OrderStatusConfig {
  label: string;
  customerLabel: string;
  icon: LucideIcon;
  className: string;
  borderClass: string;
  description: string;
  customerHint?: string;
  group: 'active' | 'completed' | 'cancelled';
}

export const orderStatusConfig: Record<string, OrderStatusConfig> = {
  order_confirmed: {
    label: 'Order Confirmed',
    customerLabel: 'Order Placed',
    icon: CheckCircle,
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-400))]',
    borderClass: 'border-l-[hsl(var(--tl-maritime-500))]',
    description: 'Your order has been confirmed',
    customerHint: 'We have received your order and will begin processing it shortly.',
    group: 'active',
  },
  pending_payment: {
    label: 'Pending Payment',
    customerLabel: 'Payment Required',
    icon: CreditCard,
    className: 'bg-[hsl(var(--tl-warning-bg))] text-[hsl(var(--tl-warning-text))] border border-[hsl(var(--tl-warning))]',
    borderClass: 'border-l-[hsl(var(--tl-warning))]',
    description: 'Awaiting payment confirmation',
    customerHint: 'Please upload your proof of payment to proceed with your order.',
    group: 'active',
  },
  payment_received: {
    label: 'Payment Received',
    customerLabel: 'Payment Confirmed',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    borderClass: 'border-l-[hsl(var(--tl-success))]',
    description: 'Payment has been confirmed',
    customerHint: 'Your payment has been verified. We are preparing your order.',
    group: 'active',
  },
  processing: {
    label: 'Processing',
    customerLabel: 'Being Prepared',
    icon: Loader2,
    className: 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    borderClass: 'border-l-purple-500',
    description: 'Order is being processed',
    customerHint: 'Your order is being prepared for shipment.',
    group: 'active',
  },
  ready_to_ship: {
    label: 'Ready to Ship',
    customerLabel: 'Ready for Dispatch',
    icon: Package,
    className: 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
    borderClass: 'border-l-indigo-500',
    description: 'Order is packed and ready',
    customerHint: 'Your order is packed and waiting to be picked up by the courier.',
    group: 'active',
  },
  shipped: {
    label: 'Shipped',
    customerLabel: 'On the Way',
    icon: Truck,
    className: 'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
    borderClass: 'border-l-orange-500',
    description: 'Order has been shipped',
    customerHint: 'Your order is on its way! Track your delivery using the tracking number.',
    group: 'active',
  },
  delivered: {
    label: 'Delivered',
    customerLabel: 'Delivered',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    borderClass: 'border-l-[hsl(var(--tl-success))]',
    description: 'Order has been delivered',
    customerHint: 'Your order has been successfully delivered. Thank you for your business!',
    group: 'completed',
  },
  cancelled: {
    label: 'Cancelled',
    customerLabel: 'Cancelled',
    icon: XCircle,
    className: 'bg-[hsl(var(--tl-danger-bg))] text-[hsl(var(--tl-danger-text))] border border-[hsl(var(--tl-danger))]',
    borderClass: 'border-l-[hsl(var(--tl-danger))]',
    description: 'Order has been cancelled',
    customerHint: 'This order has been cancelled. Contact support if you have questions.',
    group: 'cancelled',
  },
  delivery_failed: {
    label: 'Delivery Failed',
    customerLabel: 'Delivery Issue',
    icon: AlertTriangle,
    className: 'bg-[hsl(var(--tl-danger-bg))] text-[hsl(var(--tl-danger-text))] border border-[hsl(var(--tl-danger))]',
    borderClass: 'border-l-[hsl(var(--tl-danger))]',
    description: 'Delivery attempt failed',
    customerHint: 'There was an issue with delivery. Please verify your address or contact support.',
    group: 'active',
  },
  on_hold: {
    label: 'On Hold',
    customerLabel: 'On Hold',
    icon: Clock,
    className: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-600',
    borderClass: 'border-l-slate-500',
    description: 'Order is temporarily on hold',
    customerHint: 'Your order is temporarily on hold. We will contact you with more information.',
    group: 'active',
  },
  delivery_confirmation_pending: {
    label: 'Pending Confirmation',
    customerLabel: 'Delivery Pending',
    icon: MapPin,
    className: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    borderClass: 'border-l-amber-500',
    description: 'Awaiting delivery confirmation',
    customerHint: 'Your order delivery is pending confirmation. We will update you shortly.',
    group: 'active',
  },
  payment_rejected: {
    label: 'Payment Rejected',
    customerLabel: 'Payment Issue',
    icon: Ban,
    className: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    borderClass: 'border-l-red-500',
    description: 'Payment proof was rejected',
    customerHint: 'There was an issue with your payment proof. Please check the details and resubmit.',
    group: 'active',
  },
};

// Default config for unknown statuses
const defaultConfig: OrderStatusConfig = {
  label: 'Unknown',
  customerLabel: 'Processing',
  icon: Clock,
  className: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-600',
  borderClass: 'border-l-slate-400',
  description: 'Status unknown',
  customerHint: 'Please contact support for more information about your order.',
  group: 'active',
};

export function getOrderStatusConfig(status: string): OrderStatusConfig {
  return orderStatusConfig[status] || defaultConfig;
}

export function getOrderStatusLabel(status: string, customerFacing = true): string {
  const config = getOrderStatusConfig(status);
  return customerFacing ? config.customerLabel : config.label;
}

export function getOrderStatusIcon(status: string) {
  return getOrderStatusConfig(status).icon;
}

// Filter options for the customer orders page
export const orderStatusFilterOptions = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending_payment', label: 'Payment Required' },
  { value: 'payment_rejected', label: 'Payment Issue' },
  { value: 'order_confirmed', label: 'Order Placed' },
  { value: 'payment_received', label: 'Payment Confirmed' },
  { value: 'processing', label: 'Being Prepared' },
  { value: 'ready_to_ship', label: 'Ready for Dispatch' },
  { value: 'shipped', label: 'On the Way' },
  { value: 'delivery_confirmation_pending', label: 'Delivery Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'delivery_failed', label: 'Delivery Issue' },
];
