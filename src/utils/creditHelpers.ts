// Credit Terms Utility Functions
// Phase 3B: Controlled Financial Leverage

export type NetTerms = 'net_7' | 'net_14' | 'net_30';
export type CreditStatus = 'inactive' | 'active' | 'suspended';

export interface CreditTerms {
  id: string;
  customer_id: string;
  credit_limit: number;
  current_balance: number;
  net_terms: NetTerms;
  status: CreditStatus;
  approved_by: string | null;
  approved_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditEligibility {
  eligible: boolean;
  lifetime_orders: number;
  loyalty_tier: string;
  has_overdue_invoices: boolean;
  missing_requirements: string[];
}

/**
 * Get the number of days for net terms
 */
export function getNetTermsDays(terms: NetTerms): number {
  switch (terms) {
    case 'net_7':
      return 7;
    case 'net_14':
      return 14;
    case 'net_30':
      return 30;
    default:
      return 14;
  }
}

/**
 * Get human-readable label for net terms
 */
export function getNetTermsLabel(terms: NetTerms): string {
  switch (terms) {
    case 'net_7':
      return 'Net 7';
    case 'net_14':
      return 'Net 14';
    case 'net_30':
      return 'Net 30';
    default:
      return 'Net 14';
  }
}

/**
 * Get net terms description
 */
export function getNetTermsDescription(terms: NetTerms): string {
  const days = getNetTermsDays(terms);
  return `Payment due within ${days} days of invoice`;
}

/**
 * Calculate credit utilization percentage
 */
export function getCreditUtilization(currentBalance: number, creditLimit: number): number {
  if (creditLimit <= 0) return 0;
  return Math.min(100, Math.round((currentBalance / creditLimit) * 100));
}

/**
 * Get available credit (limit - balance)
 */
export function getAvailableCredit(creditLimit: number, currentBalance: number): number {
  return Math.max(0, creditLimit - currentBalance);
}

/**
 * Format credit amount for display
 */
export function formatCreditAmount(amount: number, currency: string = 'GHS'): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get color class for credit status badge
 */
export function getCreditStatusColor(status: CreditStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'suspended':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'inactive':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

/**
 * Get color class for credit utilization
 */
export function getUtilizationColor(utilization: number): string {
  if (utilization >= 90) {
    return 'text-red-600 dark:text-red-400';
  } else if (utilization >= 75) {
    return 'text-yellow-600 dark:text-yellow-400';
  } else {
    return 'text-green-600 dark:text-green-400';
  }
}

/**
 * Get progress bar color for utilization
 */
export function getUtilizationProgressColor(utilization: number): string {
  if (utilization >= 90) {
    return 'bg-red-500';
  } else if (utilization >= 75) {
    return 'bg-yellow-500';
  } else {
    return 'bg-green-500';
  }
}

/**
 * Check if credit terms are usable
 */
export function isCreditUsable(creditTerms: CreditTerms | null): boolean {
  if (!creditTerms) return false;
  return creditTerms.status === 'active' && creditTerms.credit_limit > 0;
}

/**
 * Check if an order amount can be covered by available credit
 */
export function canCoverWithCredit(
  orderAmount: number,
  creditTerms: CreditTerms | null
): boolean {
  if (!creditTerms || !isCreditUsable(creditTerms)) return false;
  const available = getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance);
  return available >= orderAmount;
}
