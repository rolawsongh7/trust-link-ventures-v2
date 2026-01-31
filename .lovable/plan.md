

# Phase 3B Stress Testing & Verification Plan

## Overview

This plan creates a comprehensive test suite to verify Phase 3B (Controlled Financial Leverage) behaves safely under edge cases, misuse, partial failures, and scale. The tests validate all global invariants without adding new features or refactoring existing logic.

---

## Current State Analysis

### Existing Test Infrastructure
| Component | Status |
|-----------|--------|
| `vitest.config.ts` | Configured with jsdom, globals, setup file |
| `src/test/setup.ts` | Basic mocks (matchMedia, ResizeObserver) |
| `src/test/testUtils.ts` | Mock factories for orders/payments from Phase 1.5 |
| Existing tests | 2 test files (`orderStatusErrors.test.ts`, `payment.test.ts`) |

### Phase 3B Components to Test
| Component | Purpose | Critical Invariants |
|-----------|---------|---------------------|
| `creditHelpers.ts` | Credit calculations | Balance never exceeds limit |
| `benefitHelpers.ts` | Benefit utilities | SLA multiplier applied correctly |
| `useFeatureFlags.ts` | Kill switch hooks | Instant disable/enable |
| `useCustomerCreditTerms.ts` | Credit management | RPC-only mutations |
| `useCustomerBenefits.ts` | Benefit toggles | Super admin only |
| Database RPCs | Secure operations | All have super_admin guards |

### Database Constraints Verified (Already in Migration)
```sql
-- Credit cannot exceed limit (enforced at DB level)
CONSTRAINT credit_balance_within_limit CHECK (current_balance <= credit_limit)

-- RPC functions check super_admin role before mutations
-- All mutations log to audit_logs with severity = 'high'
```

---

## Test Suite Architecture

### Test File Structure

```text
src/test/
├── setup.ts                           # Existing: Test setup
├── testUtils.ts                       # Existing: Phase 1.5 mocks
├── phase3b/
│   ├── testUtils.phase3b.ts           # New: Phase 3B mock factories
│   ├── creditHelpers.test.ts          # Section A: Credit unit tests
│   ├── benefitHelpers.test.ts         # Section C: Benefit unit tests
│   ├── featureFlags.test.ts           # Section G: Kill switch tests
│   ├── security.test.ts               # Section D: RLS/access tests
│   ├── audit.test.ts                  # Section E: Audit coverage tests
│   └── regression.test.ts             # Section F: Phase 1-2 regression tests
```

---

## Implementation Details

### Step 1: Phase 3B Test Utilities

**File: `src/test/phase3b/testUtils.phase3b.ts`**

```text
Mock Factories:
- createMockCreditTerms(overrides) → CreditTerms
- createMockCustomerBenefit(overrides) → CustomerBenefit
- createMockFeatureFlag(overrides) → FeatureFlag
- createMockLoyaltyData(overrides) → LoyaltyData
- createMockCreditEligibility(overrides) → CreditEligibility

Test Helpers:
- assertCreditInvariant(creditTerms) → validates balance <= limit
- assertAuditLogged(auditLogs, eventType) → validates log exists
- createMockRPCResponse(success, data?) → standard RPC response
```

---

### Step 2: Section A - Credit Terms Stress Tests

**File: `src/test/phase3b/creditHelpers.test.ts`**

```text
Test Groups:

A1. Credit Limit Enforcement
├── getCreditUtilization - returns 0-100% correctly
├── getAvailableCredit - never returns negative
├── canCoverWithCredit - respects exact limits
├── canCoverWithCredit - rejects limit+1 orders
├── canCoverWithCredit - returns false for inactive/suspended

A2. Edge Cases
├── Zero credit limit returns 0 utilization
├── Exact balance = limit returns 100% utilization
├── Negative amounts handled gracefully
├── Null/undefined creditTerms returns safe defaults

A3. Partial Payment Isolation
├── Credit balance independent of payment_records
├── canCoverWithCredit ignores order.payment_amount_confirmed
├── Credit status unaffected by order.payment_status

A4. Suspension Logic
├── isCreditUsable returns false when suspended
├── Suspended credit cannot cover any order
├── Inactive credit cannot cover any order
```

**Expected Test Count: ~15-20 unit tests**

---

### Step 3: Section B - Subscription Enforcement Tests

**File: `src/test/phase3b/subscriptionEnforcement.test.ts`**

```text
Test Groups:

B1. Banner Visibility
├── Shows banner for 'past_due' status
├── Shows banner for 'canceled' status
├── Hides banner for 'active' status
├── Hides banner when dismissed
├── Hides banner when enforcement disabled (kill switch)

B2. Non-Blocking Behavior
├── No order creation blocking (component doesn't block)
├── No payment flow blocking
├── Banner dismissal persists for session

B3. Kill Switch
├── Banner respects subscription_enforcement flag
├── Flag toggle immediately affects visibility
```

**Expected Test Count: ~8-10 unit tests**

---

### Step 4: Section C - Loyalty Benefits Tests

**File: `src/test/phase3b/benefitHelpers.test.ts`**

```text
Test Groups:

C1. Priority Processing
├── hasPriorityProcessing returns true when enabled
├── hasPriorityProcessing returns false when disabled
├── hasPriorityProcessing returns false when benefit missing
├── getEnabledBenefits filters correctly

C2. SLA Multiplier
├── getSLAMultiplier returns 0.75 with faster_sla
├── getSLAMultiplier returns 1.0 without faster_sla
├── Multiple benefits handled correctly
├── Empty benefits array returns 1.0

C3. Benefit Removal Edge Cases
├── hasBenefit returns false after disabled_at set
├── Disabling benefit doesn't affect other benefits
├── Re-enabling benefit works correctly
```

**Expected Test Count: ~12-15 unit tests**

---

### Step 5: Section D - RLS & Security Tests

**File: `src/test/phase3b/security.test.ts`**

```text
Test Groups:

D1. Customer Access Denied (RLS Simulation)
├── Mock customer context cannot insert credit terms
├── Mock customer context cannot update credit terms
├── Mock customer context cannot read other customer's credit
├── Mock customer context cannot modify benefits

D2. Admin (Non-Super) Access Limits
├── Admin can SELECT credit terms (read)
├── Admin cannot INSERT credit terms
├── Admin cannot UPDATE credit terms
├── Admin cannot toggle benefits

D3. RPC Guard Validation
├── approve_credit_terms returns unauthorized for non-super_admin
├── suspend_credit_terms returns unauthorized for non-super_admin
├── adjust_credit_limit returns unauthorized for non-super_admin
├── toggle_feature_flag returns unauthorized for non-super_admin
├── toggle_customer_benefit returns unauthorized for non-super_admin

D4. Kill Switch Guard
├── approve_credit_terms fails when credit_terms_global disabled
├── toggle_customer_benefit fails when loyalty_benefits_global disabled
```

**Expected Test Count: ~15-18 unit tests**

---

### Step 6: Section E - Audit & Observability Tests

**File: `src/test/phase3b/audit.test.ts`**

```text
Test Groups:

E1. Event Coverage (Mock RPC Responses)
├── credit_terms_approved logged with high severity
├── credit_terms_suspended logged with high severity
├── credit_terms_limit_changed logged with high severity
├── benefit_enabled logged with high severity
├── benefit_disabled logged with high severity
├── feature_flag_changed logged with high severity

E2. Event Data Completeness
├── Credit approval includes credit_limit, net_terms, approved_by
├── Credit suspension includes reason
├── Limit adjustment includes old_limit, new_limit, reason
├── Benefit toggle includes benefit_type, enabled

E3. Failure Logging
├── Failed authorization attempts should trigger logging
├── Eligibility failures logged (via RPC response check)
```

**Expected Test Count: ~12-15 unit tests**

---

### Step 7: Section F - Regression Tests

**File: `src/test/phase3b/regression.test.ts`**

```text
Test Groups:

F1. Payment Flow Unchanged
├── Payment status helpers unchanged (from payment.test.ts)
├── canShip logic unchanged
├── Balance calculation unchanged
├── payment_records table not affected by credit

F2. Order Status Unchanged
├── parseStatusTransitionError unchanged
├── canProceedToShipping unchanged
├── getBlockerReason unchanged

F3. SLA Logic Unchanged (Default)
├── calculateSLA returns same results without benefits
├── SLA_THRESHOLDS constant unchanged
├── getUrgencyScore unchanged without priority benefit

F4. Operations Queue Unchanged
├── sortByUrgency base behavior unchanged
├── filterActiveOrders unchanged
├── countBySLAStatus unchanged
```

**Expected Test Count: ~15-20 tests (can import existing)**

---

### Step 8: Section G - Kill Switch Validation Tests

**File: `src/test/phase3b/featureFlags.test.ts`**

```text
Test Groups:

G1. Flag Utilities
├── getFeatureLabel returns correct labels
├── getFeatureDescription returns correct descriptions
├── All 3 feature keys recognized

G2. useIsFeatureEnabled Hook Logic
├── Returns enabled=true when flag enabled
├── Returns enabled=false when flag disabled
├── Defaults to enabled=true when flag not found
├── Loading state handled correctly

G3. Kill Switch Effects
├── credit_terms_global=false → credit operations blocked
├── loyalty_benefits_global=false → benefit operations blocked
├── subscription_enforcement=false → banners hidden

G4. Reversibility
├── Re-enabling flag restores functionality
├── Flag toggle clears disabled_by, disabled_at, disabled_reason
```

**Expected Test Count: ~12-15 unit tests**

---

## Test Utilities Implementation

### Mock Credit Terms Factory

```typescript
export const createMockCreditTerms = (
  overrides: Partial<CreditTerms> = {}
): CreditTerms => ({
  id: 'test-credit-id',
  customer_id: 'test-customer-id',
  credit_limit: 5000,
  current_balance: 0,
  net_terms: 'net_14',
  status: 'active',
  approved_by: 'super-admin-id',
  approved_at: new Date().toISOString(),
  suspended_at: null,
  suspended_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
```

### Mock Customer Benefit Factory

```typescript
export const createMockCustomerBenefit = (
  overrides: Partial<CustomerBenefit> = {}
): CustomerBenefit => ({
  id: 'test-benefit-id',
  customer_id: 'test-customer-id',
  benefit_type: 'priority_processing',
  enabled: true,
  enabled_by: 'super-admin-id',
  enabled_at: new Date().toISOString(),
  disabled_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
```

### Credit Invariant Assertion

```typescript
export const assertCreditInvariant = (creditTerms: CreditTerms): void => {
  // Global invariant: current_balance NEVER exceeds credit_limit
  if (creditTerms.current_balance > creditTerms.credit_limit) {
    throw new Error(
      `INVARIANT VIOLATION: balance ${creditTerms.current_balance} ` +
      `exceeds limit ${creditTerms.credit_limit}`
    );
  }
};
```

---

## Files Summary

### New Files (8)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `src/test/phase3b/testUtils.phase3b.ts` | ~100 | Mock factories & assertions |
| `src/test/phase3b/creditHelpers.test.ts` | ~200 | Credit limit enforcement tests |
| `src/test/phase3b/subscriptionEnforcement.test.ts` | ~100 | Soft gating tests |
| `src/test/phase3b/benefitHelpers.test.ts` | ~150 | Loyalty benefit tests |
| `src/test/phase3b/security.test.ts` | ~200 | RLS/access control tests |
| `src/test/phase3b/audit.test.ts` | ~150 | Audit coverage tests |
| `src/test/phase3b/regression.test.ts` | ~200 | Phase 1-2 regression tests |
| `src/test/phase3b/featureFlags.test.ts` | ~150 | Kill switch tests |

### Modified Files (1)

| File | Changes |
|------|---------|
| `src/test/setup.ts` | Add any additional mocks if needed |

---

## Verification Checklist Mapping

### Financial Safety
| Requirement | Test File | Coverage |
|-------------|-----------|----------|
| Credit never exceeds limit | creditHelpers.test.ts | A1, A2 |
| Credit applied only to approved customers | security.test.ts | D3 |
| Payments reconcile correctly | regression.test.ts | F1 |
| Partial payment logic unchanged | regression.test.ts | F1 |

### Operational Safety
| Requirement | Test File | Coverage |
|-------------|-----------|----------|
| Operations queues still function | regression.test.ts | F4 |
| SLA logic unchanged unless benefit enabled | regression.test.ts | F3 |
| Bulk operations unaffected | regression.test.ts | F4 |

### Access Safety
| Requirement | Test File | Coverage |
|-------------|-----------|----------|
| RLS enforced via RPC only | security.test.ts | D1, D2, D3 |
| Customers cannot mutate credit data | security.test.ts | D1 |
| Super admin cannot bypass audit logs | audit.test.ts | E1, E2 |

---

## Running the Tests

Tests are run using Vitest:

```bash
# Run all Phase 3B tests
npx vitest run src/test/phase3b/

# Run specific test file
npx vitest run src/test/phase3b/creditHelpers.test.ts

# Run in watch mode for development
npx vitest src/test/phase3b/
```

---

## Expected Test Counts

| Section | Test File | Tests |
|---------|-----------|-------|
| A - Credit Terms | creditHelpers.test.ts | ~18 |
| B - Subscription | subscriptionEnforcement.test.ts | ~10 |
| C - Benefits | benefitHelpers.test.ts | ~14 |
| D - Security | security.test.ts | ~16 |
| E - Audit | audit.test.ts | ~14 |
| F - Regression | regression.test.ts | ~18 |
| G - Kill Switches | featureFlags.test.ts | ~14 |
| **Total** | | **~104 tests** |

---

## Success Criteria

Phase 3B stress testing is complete when:

1. All ~104 unit tests pass
2. Credit invariant (balance <= limit) never violated
3. Security tests confirm RLS/RPC guards work
4. Audit tests confirm high-severity logging
5. Regression tests confirm Phase 1-2 unchanged
6. Kill switch tests confirm instant disable/enable
7. No order/payment workflows affected

---

## Explicit Non-Goals

| Item | Status |
|------|--------|
| Integration tests requiring live Supabase | NOT INCLUDED (unit tests only) |
| E2E tests with real user sessions | NOT INCLUDED |
| Performance/load testing | NOT INCLUDED |
| UI component visual testing | NOT INCLUDED |

These are unit/logic tests that validate invariants without external dependencies.

