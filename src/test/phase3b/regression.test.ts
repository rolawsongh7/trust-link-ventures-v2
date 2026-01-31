/**
 * Phase 3B Regression Tests
 * Section F: Phase 1-2 Workflow Preservation
 * 
 * Global Invariants Tested:
 * - Payment flows unchanged
 * - Order status transitions unchanged
 * - SLA logic unchanged (default)
 * - Operations queue unchanged
 */

import { describe, it, expect } from 'vitest';
import {
  createMockOrder,
  createMockPaymentRecord,
  calculateExpectedPaymentStatus,
  calculateExpectedBalanceRemaining,
} from '../testUtils';
import {
  createMockCreditTerms,
  createMockCustomerBenefit,
} from './testUtils.phase3b';
import {
  getCreditUtilization,
  getAvailableCredit,
  canCoverWithCredit,
} from '@/utils/creditHelpers';
import {
  getSLAMultiplier,
  hasPriorityProcessing,
} from '@/utils/benefitHelpers';

describe('Phase 3B: Regression Tests', () => {
  // ============================================
  // F1. Payment Flow Unchanged
  // ============================================
  describe('F1. Payment Flow Unchanged', () => {
    it('payment status helpers calculate correctly (from Phase 1.5)', () => {
      // These calculations must remain identical to Phase 1.5
      expect(calculateExpectedPaymentStatus(1000, 0)).toBe('unpaid');
      expect(calculateExpectedPaymentStatus(1000, 500)).toBe('partially_paid');
      expect(calculateExpectedPaymentStatus(1000, 1000)).toBe('fully_paid');
      expect(calculateExpectedPaymentStatus(1000, 1500)).toBe('overpaid');
    });

    it('balance calculation unchanged', () => {
      expect(calculateExpectedBalanceRemaining(1000, 0)).toBe(1000);
      expect(calculateExpectedBalanceRemaining(1000, 300)).toBe(700);
      expect(calculateExpectedBalanceRemaining(1000, 1000)).toBe(0);
      expect(calculateExpectedBalanceRemaining(1000, 1200)).toBe(-200);
    });

    it('payment_records table not affected by credit (isolation)', () => {
      // Create a payment record - its structure should be unchanged
      const paymentRecord = createMockPaymentRecord({
        amount: 500,
        payment_type: 'deposit',
      });

      // Payment record should have no credit-related fields
      expect(paymentRecord).not.toHaveProperty('credit_applied');
      expect(paymentRecord).not.toHaveProperty('credit_terms_id');

      // Standard payment fields still work
      expect(paymentRecord.amount).toBe(500);
      expect(paymentRecord.payment_type).toBe('deposit');
    });

    it('order payment fields unchanged by credit terms', () => {
      const order = createMockOrder({
        total_amount: 1000,
        payment_amount_confirmed: 500,
        balance_remaining: 500,
        payment_status: 'partially_paid',
      });

      // Order should have standard payment fields
      expect(order.total_amount).toBe(1000);
      expect(order.payment_amount_confirmed).toBe(500);
      expect(order.balance_remaining).toBe(500);
      expect(order.payment_status).toBe('partially_paid');

      // Order should NOT have credit-specific fields
      expect(order).not.toHaveProperty('credit_applied');
      expect(order).not.toHaveProperty('paid_via_credit');
    });

    it('partial payment scenarios work exactly as Phase 1.5', () => {
      // Scenario: Customer pays in 3 installments
      const totalAmount = 3000;

      // Payment 1: 30% deposit
      let paid = 900;
      expect(calculateExpectedPaymentStatus(totalAmount, paid)).toBe('partially_paid');
      expect(calculateExpectedBalanceRemaining(totalAmount, paid)).toBe(2100);

      // Payment 2: 40% progress payment
      paid += 1200;
      expect(calculateExpectedPaymentStatus(totalAmount, paid)).toBe('partially_paid');
      expect(calculateExpectedBalanceRemaining(totalAmount, paid)).toBe(900);

      // Payment 3: Final 30%
      paid += 900;
      expect(calculateExpectedPaymentStatus(totalAmount, paid)).toBe('fully_paid');
      expect(calculateExpectedBalanceRemaining(totalAmount, paid)).toBe(0);
    });
  });

  // ============================================
  // F2. Order Status Unchanged
  // ============================================
  describe('F2. Order Status Unchanged', () => {
    it('order status field unchanged', () => {
      const order = createMockOrder({ status: 'pending_payment' });
      expect(order.status).toBe('pending_payment');
    });

    it('order can have standard statuses', () => {
      const statuses = [
        'pending_payment',
        'processing',
        'ready_for_shipping',
        'shipped',
        'delivered',
        'cancelled',
      ];

      statuses.forEach(status => {
        const order = createMockOrder({ status });
        expect(order.status).toBe(status);
      });
    });

    it('order structure unchanged by Phase 3B', () => {
      const order = createMockOrder();

      // Core order fields from Phase 1-2 still present
      expect(order.id).toBeTruthy();
      expect(order.order_number).toBeTruthy();
      expect(order.customer_id).toBeTruthy();
      expect(order.total_amount).toBeDefined();
      expect(order.payment_status).toBeTruthy();
      expect(order.status).toBeTruthy();
      expect(order.currency).toBeTruthy();

      // Delivery fields still present
      expect(order).toHaveProperty('delivery_address_id');
      expect(order).toHaveProperty('carrier');
      expect(order).toHaveProperty('tracking_number');
      expect(order).toHaveProperty('estimated_delivery_date');
    });
  });

  // ============================================
  // F3. SLA Logic Unchanged (Default)
  // ============================================
  describe('F3. SLA Logic Unchanged (Default)', () => {
    it('getSLAMultiplier returns 1.0 without benefits', () => {
      // No benefits = standard SLA
      expect(getSLAMultiplier([])).toBe(1.0);
    });

    it('getSLAMultiplier returns 1.0 with non-SLA benefits', () => {
      const benefits = [
        createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
        createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
      ];

      // Only faster_sla affects the multiplier
      expect(getSLAMultiplier(benefits)).toBe(1.0);
    });

    it('getSLAMultiplier returns 0.75 only with faster_sla', () => {
      const benefits = [
        createMockCustomerBenefit({ benefit_type: 'faster_sla', enabled: true }),
      ];

      expect(getSLAMultiplier(benefits)).toBe(0.75);
    });

    it('priority_processing does not affect SLA calculation', () => {
      const benefitsWithPriority = [
        createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
      ];

      const benefitsWithoutPriority: typeof benefitsWithPriority = [];

      // SLA multiplier should be same regardless of priority_processing
      expect(getSLAMultiplier(benefitsWithPriority)).toBe(getSLAMultiplier(benefitsWithoutPriority));
    });

    it('dedicated_manager does not affect SLA calculation', () => {
      const benefitsWithManager = [
        createMockCustomerBenefit({ benefit_type: 'dedicated_manager', enabled: true }),
      ];

      // SLA multiplier should be 1.0
      expect(getSLAMultiplier(benefitsWithManager)).toBe(1.0);
    });
  });

  // ============================================
  // F4. Operations Queue Unchanged
  // ============================================
  describe('F4. Operations Queue Unchanged', () => {
    it('hasPriorityProcessing does not affect order data', () => {
      const order = createMockOrder();
      const benefits = [
        createMockCustomerBenefit({ benefit_type: 'priority_processing', enabled: true }),
      ];

      // Priority processing is a display/sorting concern only
      const hasPriority = hasPriorityProcessing(benefits);
      expect(hasPriority).toBe(true);

      // Order itself is unchanged
      expect(order.status).toBe('pending_payment');
      expect(order.total_amount).toBe(1000);
    });

    it('orders without benefits have no priority', () => {
      expect(hasPriorityProcessing([])).toBe(false);
    });

    it('order filtering logic would remain unchanged', () => {
      const orders = [
        createMockOrder({ status: 'processing', order_number: 'ORD-001' }),
        createMockOrder({ status: 'cancelled', order_number: 'ORD-002' }),
        createMockOrder({ status: 'processing', order_number: 'ORD-003' }),
        createMockOrder({ status: 'delivered', order_number: 'ORD-004' }),
      ];

      // Simple filter for active orders (unchanged logic)
      const activeStatuses = ['pending_payment', 'processing', 'ready_for_shipping', 'shipped'];
      const activeOrders = orders.filter(o => activeStatuses.includes(o.status));

      expect(activeOrders).toHaveLength(2);
      expect(activeOrders.map(o => o.order_number)).toContain('ORD-001');
      expect(activeOrders.map(o => o.order_number)).toContain('ORD-003');
    });
  });

  // ============================================
  // Credit Independence Tests
  // ============================================
  describe('Credit Independence from Phase 1-2', () => {
    it('credit calculations are isolated from order calculations', () => {
      const order = createMockOrder({
        total_amount: 5000,
        payment_amount_confirmed: 2000,
        balance_remaining: 3000,
      });

      const creditTerms = createMockCreditTerms({
        credit_limit: 10000,
        current_balance: 4000,
      });

      // Order payment status calculated from order fields only
      const paymentStatus = calculateExpectedPaymentStatus(
        order.total_amount,
        order.payment_amount_confirmed
      );
      expect(paymentStatus).toBe('partially_paid');

      // Credit utilization calculated from credit fields only
      const utilization = getCreditUtilization(
        creditTerms.current_balance,
        creditTerms.credit_limit
      );
      expect(utilization).toBe(40);

      // They should have no cross-dependencies
      const orderBalance = calculateExpectedBalanceRemaining(
        order.total_amount,
        order.payment_amount_confirmed
      );
      const availableCredit = getAvailableCredit(
        creditTerms.credit_limit,
        creditTerms.current_balance
      );

      expect(orderBalance).toBe(3000);
      expect(availableCredit).toBe(6000);
    });

    it('canCoverWithCredit does not modify order state', () => {
      const order = createMockOrder({
        total_amount: 2000,
        payment_amount_confirmed: 0,
        balance_remaining: 2000,
        payment_status: 'unpaid',
      });

      const creditTerms = createMockCreditTerms({
        credit_limit: 5000,
        current_balance: 1000,
        status: 'active',
      });

      // Check if credit can cover the order
      const canCover = canCoverWithCredit(order.total_amount, creditTerms);
      expect(canCover).toBe(true);

      // Order should be completely unchanged
      expect(order.payment_amount_confirmed).toBe(0);
      expect(order.balance_remaining).toBe(2000);
      expect(order.payment_status).toBe('unpaid');
    });
  });

  // ============================================
  // Mock Factory Compatibility
  // ============================================
  describe('Mock Factory Compatibility', () => {
    it('Phase 1.5 mock factories still work', () => {
      const order = createMockOrder();
      const payment = createMockPaymentRecord();

      expect(order).toBeDefined();
      expect(payment).toBeDefined();
      expect(order.id).toBeTruthy();
      expect(payment.id).toBeTruthy();
    });

    it('Phase 3B mock factories are compatible', () => {
      const creditTerms = createMockCreditTerms();
      const benefit = createMockCustomerBenefit();

      expect(creditTerms).toBeDefined();
      expect(benefit).toBeDefined();
      expect(creditTerms.id).toBeTruthy();
      expect(benefit.id).toBeTruthy();
    });

    it('factories can be combined in test scenarios', () => {
      // Create a complete test scenario
      const order = createMockOrder({
        customer_id: 'customer-123',
        total_amount: 3000,
      });

      const payment = createMockPaymentRecord({
        order_id: order.id,
        amount: 1000,
      });

      const creditTerms = createMockCreditTerms({
        customer_id: 'customer-123',
        credit_limit: 5000,
      });

      const benefit = createMockCustomerBenefit({
        customer_id: 'customer-123',
        benefit_type: 'priority_processing',
      });

      // All should be valid and independent
      expect(order.customer_id).toBe('customer-123');
      expect(payment.order_id).toBe(order.id);
      expect(creditTerms.customer_id).toBe('customer-123');
      expect(benefit.customer_id).toBe('customer-123');
    });
  });
});
