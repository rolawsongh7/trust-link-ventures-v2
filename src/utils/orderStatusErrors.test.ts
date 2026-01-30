/**
 * B1: Order State Machine Error Parsing Unit Tests
 * Tests error parsing and blocker reason utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseStatusTransitionError,
  getBlockerReason,
  canProceedToShipping,
} from './orderStatusErrors';

describe('parseStatusTransitionError', () => {
  describe('Payment verification errors', () => {
    it('parses "Cannot start processing without verified payment"', () => {
      const error = { message: 'Cannot start processing without verified payment' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Payment Required');
      expect(result.description).toContain('verified deposit');
      expect(result.action).toBe('verify-payment');
      expect(result.actionLabel).toBe('Verify Payment');
    });

    it('parses "payment must be verified" message', () => {
      const error = { message: 'Order payment must be verified before processing' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Payment Required');
      expect(result.action).toBe('verify-payment');
    });

    it('parses "verified deposit" requirement', () => {
      const error = { message: 'Requires verified deposit to proceed' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Payment Required');
      expect(result.action).toBe('verify-payment');
    });
  });

  describe('Full payment errors', () => {
    it('parses "Cannot ship until fully paid" with balance extraction', () => {
      const error = { message: 'Cannot ship until fully paid. Balance: 500.00' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Balance Payment Required');
      expect(result.description).toContain('500.00');
      expect(result.action).toBe('request-balance');
      expect(result.actionLabel).toBe('Request Balance Payment');
    });

    it('parses balance remaining error', () => {
      const error = { message: 'Order has balance remaining. Cannot proceed.' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Balance Payment Required');
      expect(result.action).toBe('request-balance');
    });

    it('parses fully paid requirement', () => {
      const error = { message: 'Order must be fully paid before shipping' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Balance Payment Required');
      expect(result.action).toBe('request-balance');
    });
  });

  describe('Delivery address errors', () => {
    it('parses "Cannot ship without delivery address"', () => {
      const error = { message: 'Cannot ship without delivery address' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Address Required');
      expect(result.description).toContain('delivery address');
      expect(result.action).toBe('request-address');
      expect(result.actionLabel).toBe('Request Address');
    });

    it('parses confirmed delivery address requirement', () => {
      const error = { message: 'Requires confirmed delivery address' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Address Required');
      expect(result.action).toBe('request-address');
    });
  });

  describe('Invalid transition errors', () => {
    it('parses "Invalid order status transition"', () => {
      const error = { message: 'Invalid order status transition from pending to shipped' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Invalid Status Change');
      expect(result.action).toBe('view-order');
    });

    it('parses status transition error', () => {
      // Note: The matcher looks for "status transition" substring
      const error = { message: 'Invalid status transition: cannot proceed' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Invalid Status Change');
    });
  });

  describe('Tracking/carrier errors', () => {
    it('parses tracking requirement error', () => {
      // Note: The matcher looks for "tracking" substring (lowercase)
      const error = { message: 'Please provide tracking information before shipping' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Tracking Details Required');
      expect(result.description).toContain('carrier and tracking');
    });

    it('parses carrier requirement error', () => {
      const error = { message: 'Please select a carrier before shipping' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Tracking Details Required');
    });
  });

  describe('Default fallback', () => {
    it('returns default for unknown errors', () => {
      const error = { message: 'Something unexpected happened' };
      const result = parseStatusTransitionError(error);
      
      expect(result.title).toBe('Status Update Failed');
      expect(result.description).toBe('Something unexpected happened');
      expect(result.action).toBeUndefined();
    });

    it('handles null error gracefully', () => {
      const result = parseStatusTransitionError(null);
      
      expect(result.title).toBe('Status Update Failed');
    });

    it('handles undefined error gracefully', () => {
      const result = parseStatusTransitionError(undefined);
      
      expect(result.title).toBe('Status Update Failed');
    });

    it('handles error with details property', () => {
      const error = { details: 'Error from details field' };
      const result = parseStatusTransitionError(error);
      
      expect(result.description).toBe('Error from details field');
    });
  });
});

describe('getBlockerReason', () => {
  describe('Payment blockers', () => {
    it('returns balance message for processing + partially_paid', () => {
      const order = {
        status: 'processing',
        payment_status: 'partially_paid' as const,
        balance_remaining: 500,
        currency: 'GHS',
        delivery_address_id: 'addr-123',
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('balance payment');
      expect(reason).toContain('GHS');
      expect(reason).toContain('500');
    });

    it('returns "cannot proceed" for payment_received + not fully paid', () => {
      const order = {
        status: 'payment_received',
        payment_status: 'partially_paid' as const,
        balance_remaining: 300,
        delivery_address_id: 'addr-123',
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('fully paid');
    });

    it('returns "waiting for proof" for pending_payment + unpaid', () => {
      const order = {
        status: 'pending_payment',
        payment_status: 'unpaid' as const,
        balance_remaining: 1000,
        delivery_address_id: null,
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('payment proof');
    });

    it('returns waiting message for pending_payment + null payment_status', () => {
      const order = {
        status: 'pending_payment',
        payment_status: null,
        balance_remaining: 1000,
        delivery_address_id: null,
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('payment proof');
    });
  });

  describe('Address blockers', () => {
    it('returns address message for processing without delivery_address', () => {
      const order = {
        status: 'processing',
        payment_status: 'fully_paid' as const,
        balance_remaining: 0,
        delivery_address_id: null,
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('delivery address');
    });

    it('returns address message for ready_to_ship without delivery_address', () => {
      const order = {
        status: 'ready_to_ship',
        payment_status: 'fully_paid' as const,
        balance_remaining: 0,
        delivery_address_id: null,
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('delivery address');
    });
  });

  describe('No blockers', () => {
    it('returns null when no blockers', () => {
      const order = {
        status: 'processing',
        payment_status: 'fully_paid' as const,
        balance_remaining: 0,
        delivery_address_id: 'addr-123',
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toBeNull();
    });

    it('returns null for completed orders', () => {
      const order = {
        status: 'delivered',
        payment_status: 'fully_paid' as const,
        balance_remaining: 0,
        delivery_address_id: 'addr-123',
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toBeNull();
    });

    it('returns null for cancelled orders', () => {
      const order = {
        status: 'cancelled',
        payment_status: 'unpaid' as const,
        balance_remaining: 1000,
        delivery_address_id: null,
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toBeNull();
    });
  });

  describe('Currency handling', () => {
    it('uses provided currency in balance message', () => {
      const order = {
        status: 'processing',
        payment_status: 'partially_paid' as const,
        balance_remaining: 250,
        currency: 'USD',
        delivery_address_id: 'addr-123',
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('USD');
    });

    it('defaults to GHS when currency not provided', () => {
      const order = {
        status: 'processing',
        payment_status: 'partially_paid' as const,
        balance_remaining: 250,
        delivery_address_id: 'addr-123',
      };
      
      const reason = getBlockerReason(order);
      
      expect(reason).toContain('GHS');
    });
  });
});

describe('canProceedToShipping', () => {
  describe('Payment requirements', () => {
    it('returns allowed=false without full payment (unpaid)', () => {
      const result = canProceedToShipping({
        payment_status: 'unpaid',
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Requires full payment');
    });

    it('returns allowed=false without full payment (partially_paid)', () => {
      const result = canProceedToShipping({
        payment_status: 'partially_paid',
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Requires full payment');
    });

    it('allows shipping when fully_paid', () => {
      const result = canProceedToShipping({
        payment_status: 'fully_paid',
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('allows shipping when overpaid', () => {
      const result = canProceedToShipping({
        payment_status: 'overpaid',
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('Address requirements', () => {
    it('returns allowed=false without delivery address', () => {
      const result = canProceedToShipping({
        payment_status: 'fully_paid',
        delivery_address_id: null,
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Requires delivery address');
    });

    it('returns allowed=false with undefined delivery address', () => {
      const result = canProceedToShipping({
        payment_status: 'fully_paid',
        delivery_address_id: undefined,
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Requires delivery address');
    });
  });

  describe('Combined requirements', () => {
    it('returns allowed=true when both conditions met', () => {
      const result = canProceedToShipping({
        payment_status: 'fully_paid',
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('returns multiple reasons when both missing', () => {
      const result = canProceedToShipping({
        payment_status: 'unpaid',
        delivery_address_id: null,
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toHaveLength(2);
      expect(result.reasons).toContain('Requires full payment');
      expect(result.reasons).toContain('Requires delivery address');
    });

    it('returns only address reason when paid but no address', () => {
      const result = canProceedToShipping({
        payment_status: 'fully_paid',
        delivery_address_id: null,
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons).toContain('Requires delivery address');
    });

    it('returns only payment reason when has address but not paid', () => {
      const result = canProceedToShipping({
        payment_status: 'partially_paid',
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons).toContain('Requires full payment');
    });
  });

  describe('Null/undefined payment status', () => {
    it('treats null payment_status as unpaid', () => {
      const result = canProceedToShipping({
        payment_status: null,
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Requires full payment');
    });

    it('treats undefined payment_status as unpaid', () => {
      const result = canProceedToShipping({
        payment_status: undefined,
        delivery_address_id: 'addr-123',
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Requires full payment');
    });
  });
});
