import type { Order } from '@/hooks/useOrdersQuery';
import { differenceInDays, differenceInHours } from 'date-fns';

export type SLAStatus = 'on_track' | 'at_risk' | 'breached';

export interface SLAResult {
  status: SLAStatus;
  reason: string;
  daysInStage: number;
  hoursInStage: number;
  expectedDays: number;
}

// SLA thresholds (in days) per order status
export const SLA_THRESHOLDS: Record<string, number> = {
  pending_payment: 3,      // 3 days to receive payment
  order_confirmed: 1,      // 1 day to start processing after payment confirmed
  processing: 2,           // 2 days to complete processing
  ready_to_ship: 1,        // 1 day to dispatch
  shipped: 7,              // 7 days to deliver
  delivered: 0,            // Terminal state
  cancelled: 0,            // Terminal state
  delivery_failed: 1,      // 1 day to resolve failed delivery
};

// Terminal statuses that don't have SLA tracking
const TERMINAL_STATUSES = ['delivered', 'cancelled'];

/**
 * Get the timestamp when the order entered its current stage
 */
export function getStageEntryDate(order: Order): Date | null {
  const status = order.status;
  
  switch (status) {
    case 'pending_payment':
      return order.created_at ? new Date(order.created_at) : null;
    case 'order_confirmed':
      return order.payment_confirmed_at ? new Date(order.payment_confirmed_at) : 
             order.created_at ? new Date(order.created_at) : null;
    case 'processing':
      return order.processing_started_at ? new Date(order.processing_started_at) : 
             order.payment_confirmed_at ? new Date(order.payment_confirmed_at) : null;
    case 'ready_to_ship':
      return order.ready_to_ship_at ? new Date(order.ready_to_ship_at) : null;
    case 'shipped':
      return order.shipped_at ? new Date(order.shipped_at) : null;
    case 'delivered':
      return order.delivered_at ? new Date(order.delivered_at) : null;
    case 'delivery_failed':
      return order.failed_delivery_at ? new Date(order.failed_delivery_at) : null;
    case 'cancelled':
      return order.cancelled_at ? new Date(order.cancelled_at) : null;
    default:
      return order.updated_at ? new Date(order.updated_at) : null;
  }
}

/**
 * Calculate days spent in current stage
 */
export function getDaysInCurrentStage(order: Order): number {
  const entryDate = getStageEntryDate(order);
  if (!entryDate) return 0;
  
  return differenceInDays(new Date(), entryDate);
}

/**
 * Calculate hours spent in current stage (for more precision)
 */
export function getHoursInCurrentStage(order: Order): number {
  const entryDate = getStageEntryDate(order);
  if (!entryDate) return 0;
  
  return differenceInHours(new Date(), entryDate);
}

/**
 * Calculate SLA status for an order
 */
export function calculateSLA(order: Order): SLAResult {
  const status = order.status;
  
  // Terminal statuses are always on track (nothing to do)
  if (TERMINAL_STATUSES.includes(status)) {
    return {
      status: 'on_track',
      reason: status === 'delivered' ? 'Order completed' : 'Order cancelled',
      daysInStage: 0,
      hoursInStage: 0,
      expectedDays: 0,
    };
  }
  
  const expectedDays = SLA_THRESHOLDS[status] ?? 2; // Default 2 days if status unknown
  const daysInStage = getDaysInCurrentStage(order);
  const hoursInStage = getHoursInCurrentStage(order);
  
  // Calculate percentage of SLA consumed
  const percentConsumed = daysInStage / expectedDays;
  
  // Determine SLA status
  let slaStatus: SLAStatus;
  let reason: string;
  
  if (daysInStage > expectedDays) {
    slaStatus = 'breached';
    reason = `${daysInStage} days in ${formatStatus(status)} (expected ${expectedDays})`;
  } else if (percentConsumed >= 0.75) {
    slaStatus = 'at_risk';
    reason = `${daysInStage} of ${expectedDays} days used - action needed soon`;
  } else {
    slaStatus = 'on_track';
    reason = `${expectedDays - daysInStage} days remaining`;
  }
  
  return {
    status: slaStatus,
    reason,
    daysInStage,
    hoursInStage,
    expectedDays,
  };
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if an order is at risk or breached
 */
export function isOrderAtRisk(order: Order): boolean {
  const sla = calculateSLA(order);
  return sla.status === 'at_risk' || sla.status === 'breached';
}

/**
 * Check if an order is breached (past SLA)
 */
export function isOrderBreached(order: Order): boolean {
  const sla = calculateSLA(order);
  return sla.status === 'breached';
}

/**
 * Get urgency score for sorting (higher = more urgent)
 */
export function getUrgencyScore(order: Order): number {
  const sla = calculateSLA(order);
  
  // Breached orders get highest priority
  if (sla.status === 'breached') {
    return 1000 + sla.daysInStage;
  }
  
  // At-risk orders get medium priority
  if (sla.status === 'at_risk') {
    return 500 + sla.daysInStage;
  }
  
  // On-track orders get lower priority, but older ones rank higher
  return sla.daysInStage;
}

/**
 * Sort orders by urgency (most urgent first)
 */
export function sortByUrgency(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));
}

/**
 * Filter orders that are not in terminal states
 */
export function filterActiveOrders(orders: Order[]): Order[] {
  return orders.filter(order => !TERMINAL_STATUSES.includes(order.status));
}

/**
 * Count orders by SLA status
 */
export function countBySLAStatus(orders: Order[]): Record<SLAStatus, number> {
  const activeOrders = filterActiveOrders(orders);
  
  return activeOrders.reduce((acc, order) => {
    const sla = calculateSLA(order);
    acc[sla.status]++;
    return acc;
  }, { on_track: 0, at_risk: 0, breached: 0 });
}
