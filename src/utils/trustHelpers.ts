/**
 * Phase 5.1: Customer Trust & Tiering Helpers
 * 
 * Trust tiers evaluate customer reliability based on behavior signals.
 * This is separate from loyalty tiers (volume-based).
 */

export type TrustTier = 'new' | 'verified' | 'trusted' | 'preferred' | 'restricted';

export interface TrustProfile {
  id: string;
  customer_id: string;
  trust_tier: TrustTier;
  score: number;
  last_evaluated_at: string | null;
  evaluation_version: number;
  manual_override: boolean;
  override_reason: string | null;
  override_by: string | null;
  override_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustHistory {
  id: string;
  customer_id: string;
  previous_tier: TrustTier | null;
  new_tier: TrustTier;
  previous_score: number | null;
  new_score: number;
  change_reason: string;
  changed_by: string | null;
  is_manual_override: boolean;
  created_at: string;
}

export interface TrustEvaluationResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  customer_id?: string;
  tier?: string;
  score?: number;
  signals?: {
    completed_orders: number;
    on_time_payments: number;
    late_payments: number;
    unresolved_disputes: number;
    resolved_disputes: number;
  };
}

/**
 * Trust Tier Configuration
 * Defines display properties and eligibilities for each tier
 */
export const TRUST_TIER_CONFIG: Record<TrustTier, {
  label: string;
  description: string;
  customerLabel: string; // Simplified label for customer-facing display
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  eligibilities: string[];
}> = {
  new: {
    label: 'New',
    description: 'New customer with no order history yet',
    customerLabel: 'New Account',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    iconColor: 'text-slate-500',
    eligibilities: []
  },
  verified: {
    label: 'Verified',
    description: 'Completed at least one order with on-time payment',
    customerLabel: 'Verified',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-600',
    iconColor: 'text-blue-500',
    eligibilities: ['Standard payment terms']
  },
  trusted: {
    label: 'Trusted',
    description: 'Consistent payment history, reliable customer',
    customerLabel: 'Trusted',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-600',
    iconColor: 'text-green-500',
    eligibilities: ['Priority processing', 'Extended payment terms eligible']
  },
  preferred: {
    label: 'Preferred',
    description: 'High volume, excellent payment record',
    customerLabel: 'Preferred',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-600',
    iconColor: 'text-purple-500',
    eligibilities: ['Credit terms eligible', 'Priority processing', 'Subscription eligible']
  },
  restricted: {
    label: 'Restricted',
    description: 'Payment issues or unresolved disputes',
    customerLabel: 'Account Review Required',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-600',
    iconColor: 'text-red-500',
    eligibilities: ['Upfront payment only']
  }
};

/**
 * Get trust tier configuration
 */
export function getTrustTierConfig(tier: TrustTier) {
  return TRUST_TIER_CONFIG[tier] || TRUST_TIER_CONFIG.new;
}

/**
 * Get tier label
 */
export function getTrustTierLabel(tier: TrustTier): string {
  return getTrustTierConfig(tier).label;
}

/**
 * Get customer-facing tier label (simplified, no "restricted" language)
 */
export function getTrustTierCustomerLabel(tier: TrustTier): string {
  return getTrustTierConfig(tier).customerLabel;
}

/**
 * Get tier description
 */
export function getTrustTierDescription(tier: TrustTier): string {
  return getTrustTierConfig(tier).description;
}

/**
 * Get tier color class
 */
export function getTrustTierColor(tier: TrustTier): string {
  return getTrustTierConfig(tier).color;
}

/**
 * Get tier background color class
 */
export function getTrustTierBgColor(tier: TrustTier): string {
  return getTrustTierConfig(tier).bgColor;
}

/**
 * Get tier border color class
 */
export function getTrustTierBorderColor(tier: TrustTier): string {
  return getTrustTierConfig(tier).borderColor;
}

/**
 * Get tier icon color class
 */
export function getTrustTierIconColor(tier: TrustTier): string {
  return getTrustTierConfig(tier).iconColor;
}

/**
 * Get tier eligibilities
 */
export function getTrustTierEligibilities(tier: TrustTier): string[] {
  return getTrustTierConfig(tier).eligibilities;
}

/**
 * Check if tier is eligible for a specific benefit
 */
export function isTierEligible(tier: TrustTier, benefit: 'credit' | 'priority' | 'subscription'): boolean {
  switch (benefit) {
    case 'credit':
      return tier === 'preferred';
    case 'priority':
      return tier === 'trusted' || tier === 'preferred';
    case 'subscription':
      return tier === 'preferred';
    default:
      return false;
  }
}

/**
 * Get score display color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-purple-600 dark:text-purple-400';
  if (score >= 65) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-blue-600 dark:text-blue-400';
  if (score >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Format score as percentage
 */
export function formatScore(score: number): string {
  return `${score}%`;
}

/**
 * Get tier order for sorting (higher = better)
 */
export function getTierOrder(tier: TrustTier): number {
  const order: Record<TrustTier, number> = {
    restricted: 0,
    new: 1,
    verified: 2,
    trusted: 3,
    preferred: 4
  };
  return order[tier] ?? 1;
}

/**
 * Compare two tiers (returns positive if a > b, negative if a < b)
 */
export function compareTiers(a: TrustTier, b: TrustTier): number {
  return getTierOrder(a) - getTierOrder(b);
}

/**
 * Check if trust profile has manual override
 */
export function hasManualOverride(profile: TrustProfile | null): boolean {
  return profile?.manual_override === true;
}

/**
 * Default trust profile for customers without one
 */
export function getDefaultTrustProfile(customerId: string): Partial<TrustProfile> {
  return {
    customer_id: customerId,
    trust_tier: 'new',
    score: 50,
    manual_override: false
  };
}
