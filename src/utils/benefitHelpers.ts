// Benefit Utility Functions
// Phase 3B: Loyalty Benefits (Non-Monetary)

import { Zap, UserCheck, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type BenefitType = 'priority_processing' | 'dedicated_manager' | 'faster_sla';

export interface CustomerBenefit {
  id: string;
  customer_id: string;
  benefit_type: BenefitType;
  enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BenefitInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  badgeColor: string;
}

const BENEFIT_INFO: Record<BenefitType, BenefitInfo> = {
  priority_processing: {
    label: 'Priority Processing',
    description: 'Orders are prioritized in processing queues and float to the top of the Operations Hub.',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  dedicated_manager: {
    label: 'Dedicated Manager',
    description: 'Customer is assigned a dedicated account manager for personalized service.',
    icon: UserCheck,
    color: 'text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  faster_sla: {
    label: 'Faster SLA',
    description: 'SLA thresholds are reduced by 25% for expedited order fulfillment.',
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

/**
 * Get the display label for a benefit type
 */
export function getBenefitLabel(type: BenefitType): string {
  return BENEFIT_INFO[type]?.label ?? type;
}

/**
 * Get the description for a benefit type
 */
export function getBenefitDescription(type: BenefitType): string {
  return BENEFIT_INFO[type]?.description ?? '';
}

/**
 * Get the Lucide icon for a benefit type
 */
export function getBenefitIcon(type: BenefitType): LucideIcon {
  return BENEFIT_INFO[type]?.icon ?? Zap;
}

/**
 * Get the color class for a benefit type
 */
export function getBenefitColor(type: BenefitType): string {
  return BENEFIT_INFO[type]?.color ?? 'text-gray-600';
}

/**
 * Get the badge color class for a benefit type
 */
export function getBenefitBadgeColor(type: BenefitType): string {
  return BENEFIT_INFO[type]?.badgeColor ?? 'bg-gray-100 text-gray-800';
}

/**
 * Check if a customer has a specific benefit enabled
 */
export function hasBenefit(benefits: CustomerBenefit[], type: BenefitType): boolean {
  return benefits.some(b => b.benefit_type === type && b.enabled);
}

/**
 * Get all enabled benefits for a customer
 */
export function getEnabledBenefits(benefits: CustomerBenefit[]): CustomerBenefit[] {
  return benefits.filter(b => b.enabled);
}

/**
 * Get all benefit types
 */
export function getAllBenefitTypes(): BenefitType[] {
  return ['priority_processing', 'dedicated_manager', 'faster_sla'];
}

/**
 * Check if customer has priority processing (for queue sorting)
 */
export function hasPriorityProcessing(benefits: CustomerBenefit[]): boolean {
  return hasBenefit(benefits, 'priority_processing');
}

/**
 * Check if customer has faster SLA (for SLA calculation)
 */
export function hasFasterSLA(benefits: CustomerBenefit[]): boolean {
  return hasBenefit(benefits, 'faster_sla');
}

/**
 * Get SLA multiplier based on benefits (1.0 = normal, 0.75 = 25% faster)
 */
export function getSLAMultiplier(benefits: CustomerBenefit[]): number {
  return hasFasterSLA(benefits) ? 0.75 : 1.0;
}
