/**
 * Phase 3A: Loyalty Tier Calculation Helpers
 * 
 * Tier Rules (Read-Only, Informational):
 * - Bronze: < 3 orders
 * - Silver: ≥ 3 orders
 * - Gold: ≥ 10 orders OR lifetime_revenue > 50,000
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface LoyaltyData {
  lifetime_orders: number;
  lifetime_revenue: number;
  last_order_at: string | null;
  loyalty_tier: LoyaltyTier;
}

// Revenue threshold for Gold tier (in base currency)
const GOLD_REVENUE_THRESHOLD = 50000;

/**
 * Calculate the loyalty tier based on order count and revenue
 * This is the source of truth for tier calculation
 */
export function calculateLoyaltyTier(
  lifetimeOrders: number,
  lifetimeRevenue: number
): LoyaltyTier {
  // Gold: ≥ 10 orders OR high revenue
  if (lifetimeOrders >= 10 || lifetimeRevenue >= GOLD_REVENUE_THRESHOLD) {
    return 'gold';
  }
  
  // Silver: ≥ 3 orders
  if (lifetimeOrders >= 3) {
    return 'silver';
  }
  
  // Bronze: < 3 orders (default)
  return 'bronze';
}

/**
 * Get the badge color classes for a tier
 * Uses semantic design system tokens
 */
export function getTierColor(tier: LoyaltyTier): string {
  const colors: Record<LoyaltyTier, string> = {
    bronze: 'bg-amber-600/10 text-amber-700 border-amber-600/30 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    silver: 'bg-slate-400/10 text-slate-600 border-slate-400/30 dark:bg-slate-300/10 dark:text-slate-300 dark:border-slate-400/30',
    gold: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:bg-yellow-400/10 dark:text-yellow-400 dark:border-yellow-500/30',
  };
  return colors[tier];
}

/**
 * Get the icon color for a tier (for Lucide icons)
 */
export function getTierIconColor(tier: LoyaltyTier): string {
  const colors: Record<LoyaltyTier, string> = {
    bronze: 'text-amber-600 dark:text-amber-400',
    silver: 'text-slate-500 dark:text-slate-300',
    gold: 'text-yellow-600 dark:text-yellow-400',
  };
  return colors[tier];
}

/**
 * Get a human-readable description for each tier
 */
export function getTierDescription(tier: LoyaltyTier): string {
  const descriptions: Record<LoyaltyTier, string> = {
    bronze: 'New customer (< 3 orders)',
    silver: 'Returning customer (3+ orders)',
    gold: 'Valued customer (10+ orders or high volume)',
  };
  return descriptions[tier];
}

/**
 * Get the tier label for display
 */
export function getTierLabel(tier: LoyaltyTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Check if a customer qualifies as a "Trusted Customer" (for customer portal display)
 * Only Gold tier customers see this badge
 */
export function isTrustedCustomer(tier: LoyaltyTier): boolean {
  return tier === 'gold';
}

/**
 * Get progress towards next tier
 * Returns percentage (0-100) or null if already at highest tier
 */
export function getTierProgress(lifetimeOrders: number): { 
  nextTier: LoyaltyTier | null; 
  progress: number; 
  ordersNeeded: number;
} | null {
  if (lifetimeOrders >= 10) {
    return null; // Already at Gold
  }
  
  if (lifetimeOrders >= 3) {
    // Silver → Gold: need 10 orders
    return {
      nextTier: 'gold',
      progress: ((lifetimeOrders - 3) / 7) * 100,
      ordersNeeded: 10 - lifetimeOrders,
    };
  }
  
  // Bronze → Silver: need 3 orders
  return {
    nextTier: 'silver',
    progress: (lifetimeOrders / 3) * 100,
    ordersNeeded: 3 - lifetimeOrders,
  };
}
