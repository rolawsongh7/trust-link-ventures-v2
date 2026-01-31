/**
 * Phase 3B Benefit Helpers Stress Tests
 * Section C: Loyalty Benefits (Non-Monetary)
 * 
 * Global Invariants Tested:
 * - SLA multiplier correctly applied
 * - Benefits only affect enabled customers
 * - No financial impact (non-monetary only)
 */

import { describe, it, expect } from 'vitest';
import {
  getBenefitLabel,
  getBenefitDescription,
  getBenefitColor,
  getBenefitBadgeColor,
  hasBenefit,
  getEnabledBenefits,
  getAllBenefitTypes,
  hasPriorityProcessing,
  hasFasterSLA,
  getSLAMultiplier,
  type CustomerBenefit,
  type BenefitType,
} from '@/utils/benefitHelpers';
import {
  createMockCustomerBenefit,
  generateBenefitScenarios,
  assertBenefitActive,
} from './testUtils.phase3b';

describe('Phase 3B: Benefit Helpers', () => {
  // ============================================
  // C1. Priority Processing
  // ============================================
  describe('C1. Priority Processing', () => {
    describe('hasPriorityProcessing', () => {
      it('returns true when priority_processing is enabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
        ];
        expect(hasPriorityProcessing(benefits)).toBe(true);
      });

      it('returns false when priority_processing is disabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: false }),
        ];
        expect(hasPriorityProcessing(benefits)).toBe(false);
      });

      it('returns false when priority_processing is missing', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
        ];
        expect(hasPriorityProcessing(benefits)).toBe(false);
      });

      it('returns false for empty benefits array', () => {
        expect(hasPriorityProcessing([])).toBe(false);
      });
    });

    describe('getEnabledBenefits', () => {
      it('filters only enabled benefits', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: false }),
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
        ];
        
        const enabled = getEnabledBenefits(benefits);
        expect(enabled).toHaveLength(2);
        expect(enabled.map(b => b.benefit_type)).toContain('priority_processing');
        expect(enabled.map(b => b.benefit_type)).toContain('faster_sla');
        expect(enabled.map(b => b.benefit_type)).not.toContain('dedicated_manager');
      });

      it('returns empty array when no benefits enabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: false }),
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: false }),
        ];
        
        expect(getEnabledBenefits(benefits)).toHaveLength(0);
      });

      it('returns all when all enabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
        ];
        
        expect(getEnabledBenefits(benefits)).toHaveLength(3);
      });
    });
  });

  // ============================================
  // C2. SLA Multiplier
  // ============================================
  describe('C2. SLA Multiplier', () => {
    describe('getSLAMultiplier', () => {
      it('returns 0.75 when faster_sla is enabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
        ];
        expect(getSLAMultiplier(benefits)).toBe(0.75);
      });

      it('returns 1.0 when faster_sla is disabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: false }),
        ];
        expect(getSLAMultiplier(benefits)).toBe(1.0);
      });

      it('returns 1.0 when faster_sla is missing', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
        ];
        expect(getSLAMultiplier(benefits)).toBe(1.0);
      });

      it('returns 1.0 for empty benefits array', () => {
        expect(getSLAMultiplier([])).toBe(1.0);
      });

      it('correctly handles multiple benefits with faster_sla', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
        ];
        expect(getSLAMultiplier(benefits)).toBe(0.75);
      });
    });

    describe('hasFasterSLA', () => {
      it('returns true when faster_sla is enabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
        ];
        expect(hasFasterSLA(benefits)).toBe(true);
      });

      it('returns false when faster_sla is disabled', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: false }),
        ];
        expect(hasFasterSLA(benefits)).toBe(false);
      });
    });
  });

  // ============================================
  // C3. Benefit Removal Edge Cases
  // ============================================
  describe('C3. Benefit Removal Edge Cases', () => {
    it('hasBenefit returns false after disabled_at set (enabled=false)', () => {
      const benefits = [
        createMockCustomerBenefit({
          benefit_type: 'priority_processing',
          enabled: false,
          disabled_at: new Date().toISOString(),
        }),
      ];
      expect(hasBenefit(benefits, 'priority_processing')).toBe(false);
    });

    it('disabling one benefit does not affect others', () => {
      const benefits = [
        createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
        createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: false }),
        createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
      ];
      
      expect(hasBenefit(benefits, 'priority_processing')).toBe(true);
      expect(hasBenefit(benefits, 'dedicated_manager')).toBe(false);
      expect(hasBenefit(benefits, 'faster_sla')).toBe(true);
    });

    it('re-enabling benefit works correctly', () => {
      // Simulates: was disabled, then re-enabled
      const benefits = [
        createMockCustomerBenefit({
          benefit_type: 'priority_processing',
          enabled: true, // Re-enabled
          enabled_at: new Date().toISOString(),
          disabled_at: null, // Cleared when re-enabled
        }),
      ];
      
      expect(hasBenefit(benefits, 'priority_processing')).toBe(true);
      expect(hasPriorityProcessing(benefits)).toBe(true);
    });

    it('benefit state is determined by enabled flag, not timestamps', () => {
      // Even if enabled_at < disabled_at, we trust the enabled flag
      const benefits = [
        createMockCustomerBenefit({
          benefit_type: 'faster_sla',
          enabled: true,
          enabled_at: '2024-01-01T00:00:00Z',
          disabled_at: '2024-01-02T00:00:00Z', // After enabled_at
        }),
      ];
      
      // enabled=true is the source of truth
      expect(hasBenefit(benefits, 'faster_sla')).toBe(true);
    });
  });

  // ============================================
  // Benefit Display Helpers
  // ============================================
  describe('Benefit Display Helpers', () => {
    describe('getBenefitLabel', () => {
      it('returns correct labels for all benefit types', () => {
        expect(getBenefitLabel('priority_processing')).toBe('Priority Processing');
        expect(getBenefitLabel('dedicated_manager')).toBe('Dedicated Manager');
        expect(getBenefitLabel('faster_sla')).toBe('Faster SLA');
      });
    });

    describe('getBenefitDescription', () => {
      it('returns non-empty descriptions for all benefit types', () => {
        const types = getAllBenefitTypes();
        types.forEach(type => {
          const description = getBenefitDescription(type);
          expect(description).toBeTruthy();
          expect(description.length).toBeGreaterThan(10);
        });
      });

      it('priority_processing mentions queue priority', () => {
        const desc = getBenefitDescription('priority_processing');
        expect(desc.toLowerCase()).toContain('priorit');
      });

      it('faster_sla mentions 25% reduction', () => {
        const desc = getBenefitDescription('faster_sla');
        expect(desc).toContain('25%');
      });
    });

    describe('getBenefitColor', () => {
      it('returns color classes for all benefit types', () => {
        const types = getAllBenefitTypes();
        types.forEach(type => {
          const color = getBenefitColor(type);
          expect(color).toContain('text-');
        });
      });
    });

    describe('getBenefitBadgeColor', () => {
      it('returns badge color classes for all benefit types', () => {
        const types = getAllBenefitTypes();
        types.forEach(type => {
          const color = getBenefitBadgeColor(type);
          expect(color).toContain('bg-');
          expect(color).toContain('text-');
        });
      });
    });
  });

  // ============================================
  // Generic Benefit Checks
  // ============================================
  describe('Generic Benefit Checks', () => {
    describe('hasBenefit', () => {
      it('returns true for any enabled benefit', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
        ];
        expect(hasBenefit(benefits, 'dedicated_manager')).toBe(true);
      });

      it('returns false for non-existent benefit type', () => {
        const benefits = [
          createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
        ];
        expect(hasBenefit(benefits, 'faster_sla')).toBe(false);
      });
    });

    describe('getAllBenefitTypes', () => {
      it('returns all three benefit types', () => {
        const types = getAllBenefitTypes();
        expect(types).toHaveLength(3);
        expect(types).toContain('priority_processing');
        expect(types).toContain('dedicated_manager');
        expect(types).toContain('faster_sla');
      });
    });
  });

  // ============================================
  // Assertion Helpers
  // ============================================
  describe('Assertion Helpers', () => {
    it('assertBenefitActive passes for enabled benefit', () => {
      const benefits = [
        createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
      ];
      expect(() => assertBenefitActive(benefits, 'priority_processing')).not.toThrow();
    });

    it('assertBenefitActive throws for disabled benefit', () => {
      const benefits = [
        createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: false }),
      ];
      expect(() => assertBenefitActive(benefits, 'priority_processing')).toThrow('BENEFIT INACTIVE');
    });

    it('assertBenefitActive throws for missing benefit', () => {
      const benefits: CustomerBenefit[] = [];
      expect(() => assertBenefitActive(benefits, 'priority_processing')).toThrow('BENEFIT MISSING');
    });
  });

  // ============================================
  // Scenario Tests
  // ============================================
  describe('Scenario Tests', () => {
    it('generateBenefitScenarios creates valid test data', () => {
      const scenarios = generateBenefitScenarios();
      expect(scenarios.length).toBeGreaterThan(0);
      
      scenarios.forEach(benefit => {
        expect(benefit.id).toBeTruthy();
        expect(benefit.customer_id).toBeTruthy();
        expect(getAllBenefitTypes()).toContain(benefit.benefit_type);
        expect(typeof benefit.enabled).toBe('boolean');
      });
    });
  });
});
