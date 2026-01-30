/**
 * A1: Payment State Calculation Unit Tests
 * Tests the canonical payment model utilities from src/types/payment.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isUnpaid,
  isPartiallyPaid,
  isFullyPaid,
  isOverpaid,
  canShip,
  getPaymentStatusLabel,
  getPaymentTypeLabel,
  PaymentStatus,
  PaymentType,
} from './payment';

describe('Payment Status Helpers', () => {
  describe('isUnpaid', () => {
    it('returns true only for unpaid status', () => {
      expect(isUnpaid('unpaid')).toBe(true);
      expect(isUnpaid('partially_paid')).toBe(false);
      expect(isUnpaid('fully_paid')).toBe(false);
      expect(isUnpaid('overpaid')).toBe(false);
    });
  });

  describe('isPartiallyPaid', () => {
    it('returns true only for partially_paid status', () => {
      expect(isPartiallyPaid('unpaid')).toBe(false);
      expect(isPartiallyPaid('partially_paid')).toBe(true);
      expect(isPartiallyPaid('fully_paid')).toBe(false);
      expect(isPartiallyPaid('overpaid')).toBe(false);
    });
  });

  describe('isFullyPaid', () => {
    it('returns true only for fully_paid status', () => {
      expect(isFullyPaid('unpaid')).toBe(false);
      expect(isFullyPaid('partially_paid')).toBe(false);
      expect(isFullyPaid('fully_paid')).toBe(true);
      expect(isFullyPaid('overpaid')).toBe(false);
    });
  });

  describe('isOverpaid', () => {
    it('returns true only for overpaid status', () => {
      expect(isOverpaid('unpaid')).toBe(false);
      expect(isOverpaid('partially_paid')).toBe(false);
      expect(isOverpaid('fully_paid')).toBe(false);
      expect(isOverpaid('overpaid')).toBe(true);
    });
  });

  describe('canShip', () => {
    it('returns true only for fully_paid or overpaid', () => {
      expect(canShip('unpaid')).toBe(false);
      expect(canShip('partially_paid')).toBe(false);
      expect(canShip('fully_paid')).toBe(true);
      expect(canShip('overpaid')).toBe(true);
    });

    it('prevents shipping for unpaid orders', () => {
      expect(canShip('unpaid')).toBe(false);
    });

    it('prevents shipping for partially paid orders', () => {
      expect(canShip('partially_paid')).toBe(false);
    });
  });

  describe('getPaymentStatusLabel', () => {
    it('returns correct labels for all statuses', () => {
      expect(getPaymentStatusLabel('unpaid')).toBe('Unpaid');
      expect(getPaymentStatusLabel('partially_paid')).toBe('Partially Paid');
      expect(getPaymentStatusLabel('fully_paid')).toBe('Fully Paid');
      expect(getPaymentStatusLabel('overpaid')).toBe('Overpaid');
    });

    it('returns the status as fallback for unknown status', () => {
      expect(getPaymentStatusLabel('unknown' as PaymentStatus)).toBe('unknown');
    });
  });

  describe('getPaymentTypeLabel', () => {
    it('returns correct labels for all payment types', () => {
      expect(getPaymentTypeLabel('deposit')).toBe('Deposit');
      expect(getPaymentTypeLabel('balance')).toBe('Balance');
      expect(getPaymentTypeLabel('adjustment')).toBe('Adjustment');
      expect(getPaymentTypeLabel('refund')).toBe('Refund');
    });

    it('returns the type as fallback for unknown type', () => {
      expect(getPaymentTypeLabel('unknown' as PaymentType)).toBe('unknown');
    });
  });
});

describe('Payment State Calculation Logic', () => {
  // Helper function to calculate status
  const calculateStatus = (totalAmount: number, amountPaid: number): PaymentStatus => {
    if (amountPaid === 0) return 'unpaid';
    if (amountPaid < totalAmount) return 'partially_paid';
    if (amountPaid === totalAmount) return 'fully_paid';
    return 'overpaid';
  };

  describe('Status Derivation Rules', () => {
    it('no payments → unpaid', () => {
      const totalAmount = 1000;
      const amountPaid = 0;
      const status = calculateStatus(totalAmount, amountPaid);
      
      expect(status).toBe('unpaid');
      expect(isUnpaid(status)).toBe(true);
    });

    it('partial payment → partially_paid', () => {
      const totalAmount = 1000;
      const amountPaid = 500;
      const status = calculateStatus(totalAmount, amountPaid);
      
      expect(status).toBe('partially_paid');
      expect(isPartiallyPaid(status)).toBe(true);
      expect(canShip(status)).toBe(false);
    });

    it('full payment → fully_paid', () => {
      const totalAmount = 1000;
      const amountPaid = 1000;
      const status = calculateStatus(totalAmount, amountPaid);
      
      expect(status).toBe('fully_paid');
      expect(isFullyPaid(status)).toBe(true);
      expect(canShip(status)).toBe(true);
    });

    it('overpayment → overpaid', () => {
      const totalAmount = 1000;
      const amountPaid = 1200;
      const status = calculateStatus(totalAmount, amountPaid);
      
      expect(status).toBe('overpaid');
      expect(isOverpaid(status)).toBe(true);
      expect(canShip(status)).toBe(true);
    });
  });

  describe('Balance Remaining Calculation', () => {
    it('calculates balance correctly for unpaid orders', () => {
      const totalAmount = 1000;
      const amountPaid = 0;
      const balanceRemaining = totalAmount - amountPaid;
      
      expect(balanceRemaining).toBe(1000);
    });

    it('calculates balance correctly for partial payments', () => {
      const totalAmount = 1000;
      const amountPaid = 300;
      const balanceRemaining = totalAmount - amountPaid;
      
      expect(balanceRemaining).toBe(700);
    });

    it('balance is zero for fully paid orders', () => {
      const totalAmount = 1000;
      const amountPaid = 1000;
      const balanceRemaining = totalAmount - amountPaid;
      
      expect(balanceRemaining).toBe(0);
    });

    it('balance is negative for overpaid orders', () => {
      const totalAmount = 1000;
      const amountPaid = 1200;
      const balanceRemaining = totalAmount - amountPaid;
      
      expect(balanceRemaining).toBe(-200);
    });
  });

  describe('Multiple Partial Payments', () => {
    it('cumulative partial payments update status correctly', () => {
      const totalAmount = 1000;
      
      // First partial payment
      let amountPaid = 300;
      let status = calculateStatus(totalAmount, amountPaid);
      expect(status).toBe('partially_paid');
      
      // Second partial payment
      amountPaid += 400; // Now 700
      status = calculateStatus(totalAmount, amountPaid);
      expect(status).toBe('partially_paid');
      expect(totalAmount - amountPaid).toBe(300); // Balance remaining
      
      // Final payment
      amountPaid += 300; // Now 1000
      status = calculateStatus(totalAmount, amountPaid);
      expect(status).toBe('fully_paid');
      expect(totalAmount - amountPaid).toBe(0);
    });
  });
});
