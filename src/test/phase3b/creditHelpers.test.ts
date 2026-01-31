/**
 * Phase 3B Credit Helpers Stress Tests
 * Section A: Credit Limit Enforcement & Edge Cases
 * 
 * Global Invariants Tested:
 * - Credit balance never exceeds limit
 * - No negative available credit
 * - Inactive/suspended credit cannot be used
 */

import { describe, it, expect } from 'vitest';
import {
  getCreditUtilization,
  getAvailableCredit,
  isCreditUsable,
  canCoverWithCredit,
  getNetTermsDays,
  getNetTermsLabel,
  formatCreditAmount,
  getCreditStatusColor,
  getUtilizationColor,
  type CreditTerms,
} from '@/utils/creditHelpers';
import {
  createMockCreditTerms,
  generateCreditUtilizationScenarios,
  assertCreditInvariant,
} from './testUtils.phase3b';

describe('Phase 3B: Credit Helpers', () => {
  // ============================================
  // A1. Credit Limit Enforcement
  // ============================================
  describe('A1. Credit Limit Enforcement', () => {
    describe('getCreditUtilization', () => {
      it('returns 0% for zero balance', () => {
        expect(getCreditUtilization(0, 5000)).toBe(0);
      });

      it('returns correct percentage for partial utilization', () => {
        expect(getCreditUtilization(2500, 5000)).toBe(50);
        expect(getCreditUtilization(1250, 5000)).toBe(25);
        expect(getCreditUtilization(3750, 5000)).toBe(75);
      });

      it('returns 100% when balance equals limit', () => {
        expect(getCreditUtilization(5000, 5000)).toBe(100);
      });

      it('caps at 100% even if balance exceeds limit (edge case)', () => {
        // This should never happen due to DB constraint, but helper is defensive
        expect(getCreditUtilization(6000, 5000)).toBe(100);
      });

      it('returns 0% for zero credit limit (prevents division by zero)', () => {
        expect(getCreditUtilization(0, 0)).toBe(0);
        expect(getCreditUtilization(100, 0)).toBe(0);
      });
    });

    describe('getAvailableCredit', () => {
      it('returns full limit when balance is zero', () => {
        expect(getAvailableCredit(5000, 0)).toBe(5000);
      });

      it('returns correct available for partial balance', () => {
        expect(getAvailableCredit(5000, 2000)).toBe(3000);
        expect(getAvailableCredit(5000, 4999)).toBe(1);
      });

      it('returns 0 when balance equals limit', () => {
        expect(getAvailableCredit(5000, 5000)).toBe(0);
      });

      it('never returns negative (defensive for impossible state)', () => {
        expect(getAvailableCredit(5000, 6000)).toBe(0);
        expect(getAvailableCredit(0, 100)).toBe(0);
      });
    });

    describe('canCoverWithCredit', () => {
      it('returns true when order is within available credit', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 0,
          status: 'active',
        });
        expect(canCoverWithCredit(1000, creditTerms)).toBe(true);
        expect(canCoverWithCredit(5000, creditTerms)).toBe(true);
      });

      it('returns true for exact limit amount', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 0,
          status: 'active',
        });
        expect(canCoverWithCredit(5000, creditTerms)).toBe(true);
      });

      it('returns false for limit + 1 (critical boundary)', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 0,
          status: 'active',
        });
        expect(canCoverWithCredit(5001, creditTerms)).toBe(false);
      });

      it('returns false when order exceeds available credit', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 4000,
          status: 'active',
        });
        expect(canCoverWithCredit(2000, creditTerms)).toBe(false);
        expect(canCoverWithCredit(1001, creditTerms)).toBe(false);
      });

      it('returns true when order exactly matches available credit', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 4000,
          status: 'active',
        });
        expect(canCoverWithCredit(1000, creditTerms)).toBe(true);
      });

      it('returns false for inactive credit', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 0,
          status: 'inactive',
        });
        expect(canCoverWithCredit(1000, creditTerms)).toBe(false);
      });

      it('returns false for suspended credit', () => {
        const creditTerms = createMockCreditTerms({
          credit_limit: 5000,
          current_balance: 0,
          status: 'suspended',
        });
        expect(canCoverWithCredit(1000, creditTerms)).toBe(false);
      });
    });
  });

  // ============================================
  // A2. Edge Cases
  // ============================================
  describe('A2. Edge Cases', () => {
    it('handles zero credit limit correctly', () => {
      const creditTerms = createMockCreditTerms({
        credit_limit: 0,
        current_balance: 0,
        status: 'active',
      });
      expect(getCreditUtilization(creditTerms.current_balance, creditTerms.credit_limit)).toBe(0);
      expect(getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance)).toBe(0);
      expect(isCreditUsable(creditTerms)).toBe(false); // Zero limit = not usable
    });

    it('handles null creditTerms in canCoverWithCredit', () => {
      expect(canCoverWithCredit(1000, null)).toBe(false);
    });

    it('validates all utilization scenarios correctly', () => {
      const scenarios = generateCreditUtilizationScenarios();
      
      scenarios.forEach(terms => {
        // Invariant check: balance should never exceed limit
        assertCreditInvariant(terms);
        
        const utilization = getCreditUtilization(terms.current_balance, terms.credit_limit);
        expect(utilization).toBeGreaterThanOrEqual(0);
        expect(utilization).toBeLessThanOrEqual(100);
      });
    });

    it('handles very large amounts without overflow', () => {
      const creditTerms = createMockCreditTerms({
        credit_limit: 1000000000, // 1 billion
        current_balance: 500000000, // 500 million
        status: 'active',
      });
      expect(getCreditUtilization(creditTerms.current_balance, creditTerms.credit_limit)).toBe(50);
      expect(getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance)).toBe(500000000);
    });

    it('handles decimal amounts correctly', () => {
      const creditTerms = createMockCreditTerms({
        credit_limit: 1000.50,
        current_balance: 500.25,
        status: 'active',
      });
      expect(getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance)).toBeCloseTo(500.25);
    });
  });

  // ============================================
  // A3. Partial Payment Isolation
  // ============================================
  describe('A3. Partial Payment Isolation', () => {
    it('credit calculation is independent of order payment fields', () => {
      // Credit balance should only be affected by invoices, not payments
      const creditTerms = createMockCreditTerms({
        credit_limit: 5000,
        current_balance: 2000,
        status: 'active',
      });
      
      // The credit calculation doesn't care about order payment status
      // It only looks at credit_limit and current_balance
      expect(canCoverWithCredit(3000, creditTerms)).toBe(true);
      expect(canCoverWithCredit(3001, creditTerms)).toBe(false);
    });

    it('available credit is computed purely from credit terms', () => {
      const creditTerms = createMockCreditTerms({
        credit_limit: 10000,
        current_balance: 3500,
        status: 'active',
      });
      
      // Should be 10000 - 3500 = 6500
      expect(getAvailableCredit(creditTerms.credit_limit, creditTerms.current_balance)).toBe(6500);
    });
  });

  // ============================================
  // A4. Suspension Logic
  // ============================================
  describe('A4. Suspension Logic', () => {
    describe('isCreditUsable', () => {
      it('returns true for active credit with positive limit', () => {
        const creditTerms = createMockCreditTerms({
          status: 'active',
          credit_limit: 5000,
        });
        expect(isCreditUsable(creditTerms)).toBe(true);
      });

      it('returns false for suspended credit', () => {
        const creditTerms = createMockCreditTerms({
          status: 'suspended',
          credit_limit: 5000,
          suspended_at: new Date().toISOString(),
          suspended_reason: 'Overdue invoices',
        });
        expect(isCreditUsable(creditTerms)).toBe(false);
      });

      it('returns false for inactive credit', () => {
        const creditTerms = createMockCreditTerms({
          status: 'inactive',
          credit_limit: 5000,
        });
        expect(isCreditUsable(creditTerms)).toBe(false);
      });

      it('returns false for null creditTerms', () => {
        expect(isCreditUsable(null)).toBe(false);
      });

      it('returns false for active credit with zero limit', () => {
        const creditTerms = createMockCreditTerms({
          status: 'active',
          credit_limit: 0,
        });
        expect(isCreditUsable(creditTerms)).toBe(false);
      });
    });

    it('suspended credit blocks all order coverage', () => {
      const creditTerms = createMockCreditTerms({
        status: 'suspended',
        credit_limit: 10000,
        current_balance: 0,
      });
      
      // Even with available credit, suspended status blocks usage
      expect(canCoverWithCredit(1, creditTerms)).toBe(false);
      expect(canCoverWithCredit(100, creditTerms)).toBe(false);
      expect(canCoverWithCredit(10000, creditTerms)).toBe(false);
    });

    it('inactive credit blocks all order coverage', () => {
      const creditTerms = createMockCreditTerms({
        status: 'inactive',
        credit_limit: 10000,
        current_balance: 0,
      });
      
      expect(canCoverWithCredit(1, creditTerms)).toBe(false);
    });
  });

  // ============================================
  // Net Terms Helpers
  // ============================================
  describe('Net Terms Helpers', () => {
    it('getNetTermsDays returns correct days', () => {
      expect(getNetTermsDays('net_7')).toBe(7);
      expect(getNetTermsDays('net_14')).toBe(14);
      expect(getNetTermsDays('net_30')).toBe(30);
    });

    it('getNetTermsLabel returns human-readable labels', () => {
      expect(getNetTermsLabel('net_7')).toBe('Net 7');
      expect(getNetTermsLabel('net_14')).toBe('Net 14');
      expect(getNetTermsLabel('net_30')).toBe('Net 30');
    });
  });

  // ============================================
  // Display Helpers
  // ============================================
  describe('Display Helpers', () => {
    it('formatCreditAmount formats currency correctly', () => {
      const formatted = formatCreditAmount(5000, 'GHS');
      expect(formatted).toContain('5,000');
    });

    it('getCreditStatusColor returns appropriate colors', () => {
      expect(getCreditStatusColor('active')).toContain('green');
      expect(getCreditStatusColor('suspended')).toContain('red');
      expect(getCreditStatusColor('inactive')).toContain('gray');
    });

    it('getUtilizationColor returns warning colors at thresholds', () => {
      expect(getUtilizationColor(50)).toContain('green');
      expect(getUtilizationColor(75)).toContain('yellow');
      expect(getUtilizationColor(90)).toContain('red');
      expect(getUtilizationColor(100)).toContain('red');
    });
  });

  // ============================================
  // Invariant Stress Tests
  // ============================================
  describe('Invariant Stress Tests', () => {
    it('assertCreditInvariant passes for valid credit terms', () => {
      const creditTerms = createMockCreditTerms({
        credit_limit: 5000,
        current_balance: 4000,
      });
      expect(() => assertCreditInvariant(creditTerms)).not.toThrow();
    });

    it('assertCreditInvariant passes when balance equals limit', () => {
      const creditTerms = createMockCreditTerms({
        credit_limit: 5000,
        current_balance: 5000,
      });
      expect(() => assertCreditInvariant(creditTerms)).not.toThrow();
    });

    it('assertCreditInvariant throws for invalid state', () => {
      // This state should never occur due to DB constraints
      const invalidTerms: CreditTerms = {
        ...createMockCreditTerms(),
        credit_limit: 5000,
        current_balance: 5001,
      };
      expect(() => assertCreditInvariant(invalidTerms)).toThrow('INVARIANT VIOLATION');
    });
  });
});
