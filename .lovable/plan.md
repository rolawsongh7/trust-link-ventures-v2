
# Phase 1.5 Verification Test Suite Plan

## Overview

This plan creates a deterministic test suite to verify the correctness of Phase 1.5 (Money Flows & Ops Stabilization) before proceeding to Phase 2.

---

## Prerequisites: Testing Infrastructure Setup

The project does not currently have Vitest configured. We need to add testing infrastructure first.

### New Files to Create
| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration with jsdom environment |
| `src/test/setup.ts` | Test setup with matchMedia mock |
| `src/test/testUtils.ts` | Shared test utilities and mocks |

### Package Updates
Add to `devDependencies`:
- `@testing-library/jest-dom: ^6.6.0`
- `@testing-library/react: ^16.0.0`
- `jsdom: ^20.0.3`
- `vitest: ^3.2.4`

### TypeScript Config Update
Add `"vitest/globals"` to `tsconfig.app.json` types array.

---

## Test Suite Structure

```text
src/test/
  setup.ts                          # Global test setup
  testUtils.ts                      # Shared mocks and helpers
  
src/types/
  payment.test.ts                   # A1: Payment type unit tests
  
src/utils/
  orderStatusErrors.test.ts         # B1: Error parsing unit tests
  
src/test/integration/
  paymentStateTrigger.test.ts       # A2: DB trigger integration tests
  orderStateMachine.test.ts         # B2: Status transition tests
  rlsPolicies.test.ts               # C1: RLS policy verification
  
supabase/functions/
  notify-payment-proof-uploaded/
    index.test.ts                   # D1: Notification accuracy tests
  send-balance-payment-request/
    index.test.ts                   # D2: Balance request tests
```

---

## A. Money Flow Tests (CRITICAL)

### A1. Payment State Calculation (Unit Tests)

**File:** `src/types/payment.test.ts`

Test the canonical payment model utilities:

```typescript
describe('Payment Status Helpers', () => {
  test('isUnpaid returns true only for unpaid status')
  test('isPartiallyPaid returns true only for partially_paid status')
  test('isFullyPaid returns true only for fully_paid status')
  test('isOverpaid returns true only for overpaid status')
  test('canShip returns true only for fully_paid or overpaid')
  test('getPaymentStatusLabel returns correct labels')
  test('getPaymentTypeLabel returns correct labels for all types')
})
```

### A2. Payment Status Trigger (Integration Tests)

**File:** `src/test/integration/paymentStateTrigger.test.ts`

Verify database trigger calculates payment_status correctly:

```typescript
describe('update_order_payment_status trigger', () => {
  test('No payments → unpaid, balance_remaining = total')
  test('Partial payment → partially_paid, balance_remaining calculated')
  test('Multiple partial payments → partially_paid, cumulative')
  test('Full payment → fully_paid, balance_remaining = 0')
  test('Overpayment → overpaid, negative balance_remaining')
  test('Status cannot be manually overridden (trigger recalculates)')
})
```

**Test Method:** Use Supabase client to create test orders and verify trigger behavior.

---

## B. Order State Machine Tests

### B1. Error Parsing (Unit Tests)

**File:** `src/utils/orderStatusErrors.test.ts`

Test the error parser and blocker reason utilities:

```typescript
describe('parseStatusTransitionError', () => {
  test('Parses "Cannot start processing without verified payment"')
  test('Parses "Cannot ship until fully paid" with balance extraction')
  test('Parses "Cannot ship without delivery address"')
  test('Parses "Invalid order status transition"')
  test('Parses tracking/carrier requirement errors')
  test('Returns default for unknown errors')
})

describe('getBlockerReason', () => {
  test('Returns balance message for processing + partially_paid')
  test('Returns address message for processing without delivery_address')
  test('Returns "cannot proceed" for payment_received + not fully paid')
  test('Returns "waiting for proof" for pending_payment + unpaid')
  test('Returns null when no blockers')
})

describe('canProceedToShipping', () => {
  test('Returns allowed=false without full payment')
  test('Returns allowed=false without delivery address')
  test('Returns allowed=true when both conditions met')
  test('Returns multiple reasons when both missing')
})
```

### B2. Status Transition Validation (Integration Tests)

**File:** `src/test/integration/orderStateMachine.test.ts`

Verify `validate_order_status_transition` trigger:

```typescript
describe('Order Status Transitions', () => {
  describe('Valid Transitions', () => {
    test('pending_payment → processing (with partial payment)')
    test('payment_received → processing')
    test('processing → ready_to_ship (with full payment + address)')
    test('ready_to_ship → shipped (with carrier, tracking, ETA)')
  })
  
  describe('Invalid Transitions - Payment Guards', () => {
    test('BLOCKS pending_payment → processing without any payment')
    test('BLOCKS ready_to_ship without full payment')
    test('BLOCKS shipped without full payment')
  })
  
  describe('Invalid Transitions - Address Guards', () => {
    test('BLOCKS ready_to_ship without delivery address')
    test('BLOCKS shipped without delivery address')
  })
  
  describe('Invalid Transitions - Shipping Data Guards', () => {
    test('BLOCKS shipped without carrier')
    test('BLOCKS shipped without tracking_number')
    test('BLOCKS shipped without estimated_delivery_date')
  })
  
  describe('Error Message Clarity', () => {
    test('Payment error includes balance amount')
    test('Address error includes clear action hint')
    test('Tracking error includes required fields')
  })
})
```

---

## C. Admin ↔ Customer Parity Tests

### C1. RLS Policy Verification

**File:** `src/test/integration/rlsPolicies.test.ts`

Test payment_records RLS policies:

```typescript
describe('payment_records RLS', () => {
  describe('Customer Access', () => {
    test('Customer can SELECT own payment records')
    test('Customer CANNOT SELECT other customers payment records')
    test('Customer CANNOT INSERT payment records')
    test('Customer CANNOT UPDATE payment records')
    test('Customer CANNOT DELETE payment records')
  })
  
  describe('Admin Access', () => {
    test('Admin can SELECT all payment records')
    test('Admin can INSERT payment records')
    test('Admin can UPDATE payment records')
    test('Admin can DELETE payment records')
  })
})
```

### C2. Payment Summary Consistency

```typescript
describe('Payment Summary Consistency', () => {
  test('PaymentSummaryCard calculates totalPaid from verified records only')
  test('balanceRemaining = max(0, totalAmount - totalPaid)')
  test('Customer and Admin see identical payment totals')
})
```

---

## D. Notification Accuracy Tests

### D1. Payment Proof Uploaded Notifications

**File:** `supabase/functions/notify-payment-proof-uploaded/index.test.ts`

```typescript
describe('notify-payment-proof-uploaded', () => {
  test('Deposit notification includes "Deposit" language')
  test('Balance notification includes "Balance" language')
  test('Notification includes correct order number')
  test('Balance notification shows remaining amount')
  test('Creates notifications for all admin users')
})
```

### D2. Balance Payment Request Notifications

**File:** `supabase/functions/send-balance-payment-request/index.test.ts`

```typescript
describe('send-balance-payment-request', () => {
  test('Email includes correct balance amount')
  test('Email includes payment reference instructions')
  test('Throws error if no balance remaining')
  test('Creates user_notifications entry with balance metadata')
  test('Logs to email_logs table')
})
```

---

## E. Audit Log Integrity Tests

```typescript
describe('Payment Audit Logging', () => {
  test('payment_verified event logged with amount_verified')
  test('deposit_verified event includes balance_remaining')
  test('full_payment_verified event includes total_paid')
  test('Audit includes previous_status and new_status')
  test('mismatch_override flag captured when applicable')
})
```

---

## F. Regression Tests

```typescript
describe('Phase 1 Regression', () => {
  test('Admin can query orders without RLS errors')
  test('Customer can query own orders')
  test('Quote conversion still creates orders')
  test('Invoice generation still works')
  test('Customer cannot see other customers data')
})
```

---

## G. Failure Mode Tests

```typescript
describe('Failure Modes', () => {
  test('Duplicate payment proof upload handled gracefully')
  test('RPC failure during verification shows clear error')
  test('Network failure during upload shows retry message')
  test('Invalid file type rejected with clear message')
})
```

---

## Implementation Order

1. **Setup Infrastructure** (vitest.config.ts, setup.ts, testUtils.ts, package.json)
2. **Unit Tests First** (payment.test.ts, orderStatusErrors.test.ts)
3. **Integration Tests** (paymentStateTrigger.test.ts, orderStateMachine.test.ts, rlsPolicies.test.ts)
4. **Edge Function Tests** (notify-payment-proof-uploaded, send-balance-payment-request)
5. **Run Full Suite** and generate verdict

---

## Test Execution Plan

### Run Order
1. Unit tests (fast, no DB required)
2. Integration tests (requires DB, uses test data with rollback)
3. Edge function tests (uses Deno test runner)

### Output Format

```text
╔════════════════════════════════════════════════════╗
║         PHASE 1.5 VERIFICATION RESULTS             ║
╠════════════════════════════════════════════════════╣
║ Total Tests:     XX                                ║
║ Passed:          XX  ✓                             ║
║ Failed:          XX  ✗                             ║
║ Skipped:         XX  ○                             ║
╠════════════════════════════════════════════════════╣
║ VERDICT:  ✅ READY FOR PHASE 2                     ║
║      OR:  ❌ BLOCKED                               ║
╚════════════════════════════════════════════════════╝
```

If blocked, include:
- Test name
- Expected vs actual
- Recommended fix

---

## Technical Notes

### Test Data Strategy
- Use dedicated test customer ID (will not affect production)
- Use database transactions with rollback where possible
- Mock external services (Resend email, PDF generation)

### Mocking Strategy
- Mock `supabase.functions.invoke` for edge function calls
- Mock `Resend` in edge function tests
- Use `vi.mock` for external dependencies

---

## Files Summary

### New Files (8)
| File | Lines | Purpose |
|------|-------|---------|
| `vitest.config.ts` | ~20 | Vitest configuration |
| `src/test/setup.ts` | ~15 | Global test setup |
| `src/test/testUtils.ts` | ~50 | Shared mocks and helpers |
| `src/types/payment.test.ts` | ~80 | Payment utility unit tests |
| `src/utils/orderStatusErrors.test.ts` | ~120 | Error parser unit tests |
| `src/test/integration/paymentStateTrigger.test.ts` | ~100 | Trigger integration tests |
| `src/test/integration/orderStateMachine.test.ts` | ~150 | Status transition tests |
| `src/test/integration/rlsPolicies.test.ts` | ~100 | RLS verification tests |

### Modified Files (2)
| File | Changes |
|------|---------|
| `package.json` | Add vitest, testing-library devDependencies |
| `tsconfig.app.json` | Add "vitest/globals" to types |

---

## Success Criteria

Phase 1.5 is READY FOR PHASE 2 when:

1. All unit tests pass (payment helpers, error parsing)
2. All integration tests pass (triggers, state machine, RLS)
3. Edge function tests confirm notification accuracy
4. No regression in existing admin/customer flows
5. Audit logs contain required payment events

Phase 1.5 is BLOCKED if:

- Any payment state calculation is incorrect
- Order gets stuck in unexplainable state
- Admin and customer see different payment totals
- RLS allows unauthorized data access
- Notifications contain incorrect amounts
