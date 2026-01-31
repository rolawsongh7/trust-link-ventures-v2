/**
 * Phase 3B Test Utilities
 * Mock factories and assertion helpers for credit, benefits, and feature flags
 */

import type { CreditTerms, CreditStatus, NetTerms, CreditEligibility } from '@/utils/creditHelpers';
import type { CustomerBenefit, BenefitType } from '@/utils/benefitHelpers';
import type { FeatureFlag, FeatureKey } from '@/hooks/useFeatureFlags';

// ============================================
// MOCK FACTORIES
// ============================================

/**
 * Create mock credit terms with sensible defaults
 */
export const createMockCreditTerms = (
  overrides: Partial<CreditTerms> = {}
): CreditTerms => ({
  id: 'test-credit-id',
  customer_id: 'test-customer-id',
  credit_limit: 5000,
  current_balance: 0,
  net_terms: 'net_14' as NetTerms,
  status: 'active' as CreditStatus,
  approved_by: 'super-admin-id',
  approved_at: new Date().toISOString(),
  suspended_at: null,
  suspended_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock customer benefit with sensible defaults
 */
export const createMockCustomerBenefit = (
  overrides: Partial<CustomerBenefit> = {}
): CustomerBenefit => ({
  id: 'test-benefit-id',
  customer_id: 'test-customer-id',
  benefit_type: 'priority_processing' as BenefitType,
  enabled: true,
  enabled_by: 'super-admin-id',
  enabled_at: new Date().toISOString(),
  disabled_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock feature flag with sensible defaults
 */
export const createMockFeatureFlag = (
  overrides: Partial<FeatureFlag> = {}
): FeatureFlag => ({
  id: 'test-flag-id',
  feature_key: 'credit_terms_global' as FeatureKey,
  enabled: true,
  disabled_by: null,
  disabled_at: null,
  disabled_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock loyalty data
 */
export interface MockLoyaltyData {
  customer_id: string;
  lifetime_orders: number;
  lifetime_revenue: number;
  loyalty_tier: 'bronze' | 'silver' | 'gold';
  last_order_at: string | null;
}

export const createMockLoyaltyData = (
  overrides: Partial<MockLoyaltyData> = {}
): MockLoyaltyData => ({
  customer_id: 'test-customer-id',
  lifetime_orders: 5,
  lifetime_revenue: 15000,
  loyalty_tier: 'silver',
  last_order_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock credit eligibility result
 */
export const createMockCreditEligibility = (
  overrides: Partial<CreditEligibility> = {}
): CreditEligibility => ({
  eligible: true,
  lifetime_orders: 5,
  loyalty_tier: 'silver',
  has_overdue_invoices: false,
  missing_requirements: [],
  ...overrides,
});

// ============================================
// RPC RESPONSE MOCKS
// ============================================

export interface MockRPCResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

/**
 * Create a successful RPC response
 */
export const createMockRPCSuccess = <T>(data?: T): MockRPCResponse<T> => ({
  success: true,
  data,
});

/**
 * Create a failed RPC response
 */
export const createMockRPCError = (
  error: string,
  message?: string
): MockRPCResponse => ({
  success: false,
  error,
  message: message || error,
});

// ============================================
// AUDIT LOG MOCKS
// ============================================

export interface MockAuditLog {
  id: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  action: string;
  event_data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'low' | 'medium' | 'high' | 'critical';
  user_id: string;
  created_at: string;
}

export const createMockAuditLog = (
  overrides: Partial<MockAuditLog> = {}
): MockAuditLog => ({
  id: 'test-audit-id',
  event_type: 'credit_terms_approved',
  resource_type: 'customer_credit_terms',
  resource_id: 'test-customer-id',
  action: 'approve',
  event_data: {},
  severity: 'high',
  user_id: 'super-admin-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

// ============================================
// INVARIANT ASSERTIONS
// ============================================

/**
 * Assert the critical credit invariant: balance never exceeds limit
 * This is the PRIMARY financial safety check for Phase 3B
 */
export const assertCreditInvariant = (creditTerms: CreditTerms): void => {
  if (creditTerms.current_balance > creditTerms.credit_limit) {
    throw new Error(
      `INVARIANT VIOLATION: current_balance (${creditTerms.current_balance}) ` +
      `exceeds credit_limit (${creditTerms.credit_limit})`
    );
  }
};

/**
 * Assert that an audit log exists for a specific event type
 */
export const assertAuditLogged = (
  auditLogs: MockAuditLog[],
  eventType: string,
  options?: {
    severity?: MockAuditLog['severity'];
    resourceId?: string;
    action?: string;
  }
): void => {
  const matchingLog = auditLogs.find(log => {
    if (log.event_type !== eventType) return false;
    if (options?.severity && log.severity !== options.severity) return false;
    if (options?.resourceId && log.resource_id !== options.resourceId) return false;
    if (options?.action && log.action !== options.action) return false;
    return true;
  });

  if (!matchingLog) {
    throw new Error(
      `AUDIT MISSING: Expected audit log for event_type="${eventType}" ` +
      `with options ${JSON.stringify(options)} not found`
    );
  }
};

/**
 * Assert that a benefit is active and usable
 */
export const assertBenefitActive = (
  benefits: CustomerBenefit[],
  benefitType: BenefitType
): void => {
  const benefit = benefits.find(b => b.benefit_type === benefitType);
  if (!benefit) {
    throw new Error(`BENEFIT MISSING: ${benefitType} not found in benefits array`);
  }
  if (!benefit.enabled) {
    throw new Error(`BENEFIT INACTIVE: ${benefitType} is not enabled`);
  }
};

// ============================================
// TEST SCENARIO GENERATORS
// ============================================

/**
 * Generate a set of credit terms at various utilization levels
 */
export const generateCreditUtilizationScenarios = (): CreditTerms[] => [
  createMockCreditTerms({ current_balance: 0, credit_limit: 5000 }), // 0%
  createMockCreditTerms({ current_balance: 1250, credit_limit: 5000 }), // 25%
  createMockCreditTerms({ current_balance: 2500, credit_limit: 5000 }), // 50%
  createMockCreditTerms({ current_balance: 3750, credit_limit: 5000 }), // 75%
  createMockCreditTerms({ current_balance: 4500, credit_limit: 5000 }), // 90%
  createMockCreditTerms({ current_balance: 5000, credit_limit: 5000 }), // 100%
];

/**
 * Generate a set of benefits with various enabled states
 */
export const generateBenefitScenarios = (): CustomerBenefit[] => [
  createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
  createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
  createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: false }),
];

/**
 * Generate all feature flags
 */
export const generateAllFeatureFlags = (): FeatureFlag[] => [
  createMockFeatureFlag({ feature_key: 'credit_terms_global', enabled: true }),
  createMockFeatureFlag({ feature_key: 'subscription_enforcement', enabled: true }),
  createMockFeatureFlag({ feature_key: 'loyalty_benefits_global', enabled: true }),
];
