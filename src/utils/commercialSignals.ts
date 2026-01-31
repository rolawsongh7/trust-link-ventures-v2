/**
 * Phase 3A: Commercial Signals Utility
 * 
 * Read-only intelligence functions for surfacing valuable customer patterns.
 * These are informational only - no discounts, credits, or automation.
 */

import type { LoyaltyData, LoyaltyTier } from './loyaltyHelpers';

export interface CommercialSignals {
  repeatBuyer: boolean;
  highValue: boolean;
  highFrequency: boolean;
  creditCandidate: boolean;
}

export interface OrderSummary {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status?: string;
}

// Thresholds for signal detection
const REPEAT_BUYER_THRESHOLD = 2; // ≥ 2 orders
const HIGH_VALUE_REVENUE_THRESHOLD = 25000; // Total revenue
const HIGH_VALUE_AOV_THRESHOLD = 5000; // Average order value
const HIGH_FREQUENCY_ORDERS = 3; // Orders in time window
const HIGH_FREQUENCY_DAYS = 90; // Time window in days

/**
 * Check if customer is a repeat buyer
 * Repeat buyer = has made 2+ orders
 */
export function isRepeatBuyer(loyaltyData: LoyaltyData | null): boolean {
  if (!loyaltyData) return false;
  return loyaltyData.lifetime_orders >= REPEAT_BUYER_THRESHOLD;
}

/**
 * Check if customer is high value
 * High value = lifetime revenue > 25k OR average order value > 5k
 */
export function isHighValueCustomer(loyaltyData: LoyaltyData | null): boolean {
  if (!loyaltyData) return false;
  
  const { lifetime_revenue, lifetime_orders } = loyaltyData;
  
  // Check lifetime revenue
  if (lifetime_revenue >= HIGH_VALUE_REVENUE_THRESHOLD) {
    return true;
  }
  
  // Check average order value
  if (lifetime_orders > 0) {
    const avgOrderValue = lifetime_revenue / lifetime_orders;
    if (avgOrderValue >= HIGH_VALUE_AOV_THRESHOLD) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if customer has high order frequency
 * High frequency = 3+ orders in last 90 days
 */
export function isHighFrequencyCustomer(
  loyaltyData: LoyaltyData | null,
  recentOrders: OrderSummary[]
): boolean {
  if (!loyaltyData || !recentOrders) return false;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - HIGH_FREQUENCY_DAYS);
  
  const recentOrderCount = recentOrders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= cutoffDate;
  }).length;
  
  return recentOrderCount >= HIGH_FREQUENCY_ORDERS;
}

/**
 * Check if customer is a potential credit candidate
 * Credit candidate = Gold tier + Repeat buyer + Good payment history
 * 
 * NOTE: This is for Phase 3B preparation only. Not acted upon in Phase 3A.
 */
export function isCreditCandidate(
  loyaltyData: LoyaltyData | null,
  recentOrders: OrderSummary[]
): boolean {
  if (!loyaltyData) return false;
  
  // Must be Gold tier
  if (loyaltyData.loyalty_tier !== 'gold') {
    return false;
  }
  
  // Must be repeat buyer
  if (!isRepeatBuyer(loyaltyData)) {
    return false;
  }
  
  // Check payment history - no late payments
  // Look for orders with payment issues
  const hasPaymentIssues = recentOrders.some(order => {
    const paymentStatus = order.payment_status;
    return paymentStatus === 'overdue' || paymentStatus === 'failed';
  });
  
  return !hasPaymentIssues;
}

/**
 * Get all commercial signals for a customer
 */
export function getCommercialSignals(
  loyaltyData: LoyaltyData | null,
  recentOrders: OrderSummary[] = []
): CommercialSignals {
  return {
    repeatBuyer: isRepeatBuyer(loyaltyData),
    highValue: isHighValueCustomer(loyaltyData),
    highFrequency: isHighFrequencyCustomer(loyaltyData, recentOrders),
    creditCandidate: isCreditCandidate(loyaltyData, recentOrders),
  };
}

/**
 * Get signal badge color classes
 */
export function getSignalColor(signal: keyof CommercialSignals): string {
  const colors: Record<keyof CommercialSignals, string> = {
    repeatBuyer: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
    highValue: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400',
    highFrequency: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
    creditCandidate: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  };
  return colors[signal];
}

/**
 * Get signal labels for display
 */
export function getSignalLabel(signal: keyof CommercialSignals): string {
  const labels: Record<keyof CommercialSignals, string> = {
    repeatBuyer: 'Repeat Buyer',
    highValue: 'High Value',
    highFrequency: 'Frequent',
    creditCandidate: 'Credit Candidate',
  };
  return labels[signal];
}

/**
 * Get signal tooltips
 */
export function getSignalTooltip(signal: keyof CommercialSignals): string {
  const tooltips: Record<keyof CommercialSignals, string> = {
    repeatBuyer: 'Customer has made 2+ orders',
    highValue: 'Lifetime revenue exceeds threshold or high average order value',
    highFrequency: '3+ orders in the last 90 days',
    creditCandidate: 'Qualifies for credit consideration (Gold tier, repeat buyer, good payment history)',
  };
  return tooltips[signal];
}
