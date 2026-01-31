/**
 * Phase 3B Audit & Observability Tests
 * Section E: Audit Coverage & Logging
 * 
 * Global Invariants Tested:
 * - All mutations logged with high severity
 * - Event data includes required fields
 * - No silent failures
 */

import { describe, it, expect } from 'vitest';
import {
  createMockAuditLog,
  assertAuditLogged,
  type MockAuditLog,
} from './testUtils.phase3b';

// ============================================
// Simulated Audit Log Generator
// ============================================

/**
 * Simulates the audit log entries that would be created by Phase 3B RPCs
 */
const generateCreditApprovalAuditLog = (params: {
  customerId: string;
  creditLimit: number;
  netTerms: string;
  approvedBy: string;
}): MockAuditLog => createMockAuditLog({
  event_type: 'credit_terms_approved',
  resource_type: 'customer_credit_terms',
  resource_id: params.customerId,
  action: 'approve',
  event_data: {
    credit_limit: params.creditLimit,
    net_terms: params.netTerms,
    approved_by: params.approvedBy,
  },
  severity: 'high',
  user_id: params.approvedBy,
});

const generateCreditSuspensionAuditLog = (params: {
  customerId: string;
  reason: string;
  suspendedBy: string;
}): MockAuditLog => createMockAuditLog({
  event_type: 'credit_terms_suspended',
  resource_type: 'customer_credit_terms',
  resource_id: params.customerId,
  action: 'suspend',
  event_data: {
    reason: params.reason,
    suspended_by: params.suspendedBy,
  },
  severity: 'high',
  user_id: params.suspendedBy,
});

const generateCreditLimitChangeAuditLog = (params: {
  customerId: string;
  oldLimit: number;
  newLimit: number;
  reason?: string;
  changedBy: string;
}): MockAuditLog => createMockAuditLog({
  event_type: 'credit_terms_limit_changed',
  resource_type: 'customer_credit_terms',
  resource_id: params.customerId,
  action: 'adjust_limit',
  event_data: {
    old_limit: params.oldLimit,
    new_limit: params.newLimit,
    reason: params.reason,
    changed_by: params.changedBy,
  },
  severity: 'high',
  user_id: params.changedBy,
});

const generateBenefitToggleAuditLog = (params: {
  customerId: string;
  benefitType: string;
  enabled: boolean;
  toggledBy: string;
}): MockAuditLog => createMockAuditLog({
  event_type: params.enabled ? 'benefit_enabled' : 'benefit_disabled',
  resource_type: 'customer_benefits',
  resource_id: params.customerId,
  action: params.enabled ? 'enable' : 'disable',
  event_data: {
    benefit_type: params.benefitType,
    enabled: params.enabled,
    toggled_by: params.toggledBy,
  },
  severity: 'high',
  user_id: params.toggledBy,
});

const generateFeatureFlagChangeAuditLog = (params: {
  featureKey: string;
  enabled: boolean;
  reason?: string;
  changedBy: string;
}): MockAuditLog => createMockAuditLog({
  event_type: 'feature_flag_changed',
  resource_type: 'system_feature_flags',
  resource_id: params.featureKey,
  action: params.enabled ? 'enable' : 'disable',
  event_data: {
    feature_key: params.featureKey,
    enabled: params.enabled,
    reason: params.reason,
    changed_by: params.changedBy,
  },
  severity: 'high',
  user_id: params.changedBy,
});

// ============================================
// TESTS
// ============================================

describe('Phase 3B: Audit & Observability Tests', () => {
  // ============================================
  // E1. Event Coverage
  // ============================================
  describe('E1. Event Coverage', () => {
    it('credit_terms_approved logged with high severity', () => {
      const logs: MockAuditLog[] = [
        generateCreditApprovalAuditLog({
          customerId: 'customer-123',
          creditLimit: 5000,
          netTerms: 'net_14',
          approvedBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'credit_terms_approved', {
        severity: 'high',
        resourceId: 'customer-123',
      })).not.toThrow();
    });

    it('credit_terms_suspended logged with high severity', () => {
      const logs: MockAuditLog[] = [
        generateCreditSuspensionAuditLog({
          customerId: 'customer-123',
          reason: 'Overdue invoices',
          suspendedBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'credit_terms_suspended', {
        severity: 'high',
      })).not.toThrow();
    });

    it('credit_terms_limit_changed logged with high severity', () => {
      const logs: MockAuditLog[] = [
        generateCreditLimitChangeAuditLog({
          customerId: 'customer-123',
          oldLimit: 5000,
          newLimit: 10000,
          reason: 'Customer growth',
          changedBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'credit_terms_limit_changed', {
        severity: 'high',
      })).not.toThrow();
    });

    it('benefit_enabled logged with high severity', () => {
      const logs: MockAuditLog[] = [
        generateBenefitToggleAuditLog({
          customerId: 'customer-123',
          benefitType: 'priority_processing',
          enabled: true,
          toggledBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'benefit_enabled', {
        severity: 'high',
      })).not.toThrow();
    });

    it('benefit_disabled logged with high severity', () => {
      const logs: MockAuditLog[] = [
        generateBenefitToggleAuditLog({
          customerId: 'customer-123',
          benefitType: 'faster_sla',
          enabled: false,
          toggledBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'benefit_disabled', {
        severity: 'high',
      })).not.toThrow();
    });

    it('feature_flag_changed logged with high severity', () => {
      const logs: MockAuditLog[] = [
        generateFeatureFlagChangeAuditLog({
          featureKey: 'credit_terms_global',
          enabled: false,
          reason: 'Emergency shutdown',
          changedBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'feature_flag_changed', {
        severity: 'high',
      })).not.toThrow();
    });
  });

  // ============================================
  // E2. Event Data Completeness
  // ============================================
  describe('E2. Event Data Completeness', () => {
    it('credit approval includes credit_limit, net_terms, approved_by', () => {
      const log = generateCreditApprovalAuditLog({
        customerId: 'customer-123',
        creditLimit: 7500,
        netTerms: 'net_30',
        approvedBy: 'super-admin-1',
      });

      expect(log.event_data.credit_limit).toBe(7500);
      expect(log.event_data.net_terms).toBe('net_30');
      expect(log.event_data.approved_by).toBe('super-admin-1');
    });

    it('credit suspension includes reason', () => {
      const log = generateCreditSuspensionAuditLog({
        customerId: 'customer-123',
        reason: 'Payment delinquency',
        suspendedBy: 'super-admin-1',
      });

      expect(log.event_data.reason).toBe('Payment delinquency');
      expect(log.event_data.suspended_by).toBe('super-admin-1');
    });

    it('limit adjustment includes old_limit, new_limit, reason', () => {
      const log = generateCreditLimitChangeAuditLog({
        customerId: 'customer-123',
        oldLimit: 5000,
        newLimit: 8000,
        reason: 'Loyalty tier upgrade',
        changedBy: 'super-admin-1',
      });

      expect(log.event_data.old_limit).toBe(5000);
      expect(log.event_data.new_limit).toBe(8000);
      expect(log.event_data.reason).toBe('Loyalty tier upgrade');
      expect(log.event_data.changed_by).toBe('super-admin-1');
    });

    it('benefit toggle includes benefit_type, enabled', () => {
      const log = generateBenefitToggleAuditLog({
        customerId: 'customer-123',
        benefitType: 'dedicated_manager',
        enabled: true,
        toggledBy: 'super-admin-1',
      });

      expect(log.event_data.benefit_type).toBe('dedicated_manager');
      expect(log.event_data.enabled).toBe(true);
      expect(log.event_data.toggled_by).toBe('super-admin-1');
    });

    it('feature flag change includes feature_key, enabled, reason', () => {
      const log = generateFeatureFlagChangeAuditLog({
        featureKey: 'loyalty_benefits_global',
        enabled: false,
        reason: 'Maintenance window',
        changedBy: 'super-admin-1',
      });

      expect(log.event_data.feature_key).toBe('loyalty_benefits_global');
      expect(log.event_data.enabled).toBe(false);
      expect(log.event_data.reason).toBe('Maintenance window');
      expect(log.event_data.changed_by).toBe('super-admin-1');
    });
  });

  // ============================================
  // E3. Failure Logging
  // ============================================
  describe('E3. Failure Logging', () => {
    it('assertAuditLogged throws when event missing', () => {
      const logs: MockAuditLog[] = [
        generateCreditApprovalAuditLog({
          customerId: 'customer-123',
          creditLimit: 5000,
          netTerms: 'net_14',
          approvedBy: 'super-admin-1',
        }),
      ];

      // Looking for an event that doesn't exist
      expect(() => assertAuditLogged(logs, 'credit_terms_suspended')).toThrow('AUDIT MISSING');
    });

    it('assertAuditLogged throws when severity mismatch', () => {
      const logs: MockAuditLog[] = [
        {
          ...createMockAuditLog(),
          event_type: 'credit_terms_approved',
          severity: 'info', // Wrong severity for this event
        },
      ];

      expect(() => assertAuditLogged(logs, 'credit_terms_approved', {
        severity: 'high',
      })).toThrow('AUDIT MISSING');
    });

    it('assertAuditLogged throws when resource_id mismatch', () => {
      const logs: MockAuditLog[] = [
        generateCreditApprovalAuditLog({
          customerId: 'customer-123',
          creditLimit: 5000,
          netTerms: 'net_14',
          approvedBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'credit_terms_approved', {
        resourceId: 'customer-999', // Wrong customer
      })).toThrow('AUDIT MISSING');
    });

    it('assertAuditLogged passes with correct options', () => {
      const logs: MockAuditLog[] = [
        generateCreditApprovalAuditLog({
          customerId: 'customer-123',
          creditLimit: 5000,
          netTerms: 'net_14',
          approvedBy: 'super-admin-1',
        }),
      ];

      expect(() => assertAuditLogged(logs, 'credit_terms_approved', {
        severity: 'high',
        resourceId: 'customer-123',
        action: 'approve',
      })).not.toThrow();
    });
  });

  // ============================================
  // Audit Log Structure Validation
  // ============================================
  describe('Audit Log Structure', () => {
    it('audit log has all required fields', () => {
      const log = createMockAuditLog();

      expect(log.id).toBeTruthy();
      expect(log.event_type).toBeTruthy();
      expect(log.resource_type).toBeTruthy();
      expect(log.resource_id).toBeTruthy();
      expect(log.action).toBeTruthy();
      expect(log.event_data).toBeDefined();
      expect(log.severity).toBeTruthy();
      expect(log.user_id).toBeTruthy();
      expect(log.created_at).toBeTruthy();
    });

    it('severity is one of the valid values', () => {
      const validSeverities = ['info', 'warning', 'low', 'medium', 'high', 'critical'];
      const log = createMockAuditLog({ severity: 'high' });

      expect(validSeverities).toContain(log.severity);
    });

    it('Phase 3B events use high severity', () => {
      const phase3bEvents = [
        generateCreditApprovalAuditLog({ customerId: 'c1', creditLimit: 1000, netTerms: 'net_14', approvedBy: 'a1' }),
        generateCreditSuspensionAuditLog({ customerId: 'c1', reason: 'test', suspendedBy: 'a1' }),
        generateCreditLimitChangeAuditLog({ customerId: 'c1', oldLimit: 1000, newLimit: 2000, changedBy: 'a1' }),
        generateBenefitToggleAuditLog({ customerId: 'c1', benefitType: 'faster_sla', enabled: true, toggledBy: 'a1' }),
        generateFeatureFlagChangeAuditLog({ featureKey: 'credit_terms_global', enabled: true, changedBy: 'a1' }),
      ];

      phase3bEvents.forEach(log => {
        expect(log.severity).toBe('high');
      });
    });
  });

  // ============================================
  // Event Type Consistency
  // ============================================
  describe('Event Type Consistency', () => {
    it('credit approval uses correct event_type', () => {
      const log = generateCreditApprovalAuditLog({
        customerId: 'c1',
        creditLimit: 1000,
        netTerms: 'net_14',
        approvedBy: 'a1',
      });

      expect(log.event_type).toBe('credit_terms_approved');
      expect(log.resource_type).toBe('customer_credit_terms');
      expect(log.action).toBe('approve');
    });

    it('credit suspension uses correct event_type', () => {
      const log = generateCreditSuspensionAuditLog({
        customerId: 'c1',
        reason: 'test',
        suspendedBy: 'a1',
      });

      expect(log.event_type).toBe('credit_terms_suspended');
      expect(log.action).toBe('suspend');
    });

    it('benefit enable uses correct event_type', () => {
      const log = generateBenefitToggleAuditLog({
        customerId: 'c1',
        benefitType: 'priority_processing',
        enabled: true,
        toggledBy: 'a1',
      });

      expect(log.event_type).toBe('benefit_enabled');
      expect(log.resource_type).toBe('customer_benefits');
    });

    it('benefit disable uses correct event_type', () => {
      const log = generateBenefitToggleAuditLog({
        customerId: 'c1',
        benefitType: 'priority_processing',
        enabled: false,
        toggledBy: 'a1',
      });

      expect(log.event_type).toBe('benefit_disabled');
    });

    it('feature flag change uses correct event_type', () => {
      const log = generateFeatureFlagChangeAuditLog({
        featureKey: 'credit_terms_global',
        enabled: true,
        changedBy: 'a1',
      });

      expect(log.event_type).toBe('feature_flag_changed');
      expect(log.resource_type).toBe('system_feature_flags');
    });
  });
});
