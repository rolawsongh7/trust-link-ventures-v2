

# Phase 3A — Revenue Foundations Implementation Plan

## Executive Summary

This plan introduces **predictable, repeat revenue foundations** through three additive-only systems: Tenant Subscriptions, Customer Loyalty Tracking, and Commercial Signals. All implementations are informational-only with zero impact on existing order, quote, or payment workflows.

---

## Current State Analysis

### Existing Infrastructure
| Component | Status | Relevance |
|-----------|--------|-----------|
| `customers` table | Exists | Contains customer data, will reference for loyalty |
| `orders` table | Exists | Source for loyalty calculations |
| `audit_logs` table | Exists | Pattern for subscription/loyalty logging |
| `Settings.tsx` | Exists | Has tabs structure for adding Billing tab |
| `SuperAdminTab.tsx` | Exists | Pattern for super_admin-only features |
| `UnifiedCustomerView.tsx` | Exists | Customer profile to add badges |
| `CustomerCard.tsx` | Exists | Customer card to add loyalty badge |
| `OperationsHub.tsx` | Exists | Will add commercial signal badges |
| `slaHelpers.ts` | Exists | Pattern for utility functions |

### Key Constraints Verified
- No existing `subscriptions` or `customer_loyalty` tables
- No billing integrations exist
- No discount/credit systems exist
- All RLS policies on orders/quotes/payments remain untouched

---

## Implementation Scope

### 3A.1 — Tenant-Level Subscriptions

**Database Table: `subscriptions`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | References auth.users (super_admin) |
| `plan` | text | ENUM: 'starter', 'growth', 'enterprise' |
| `status` | text | ENUM: 'active', 'past_due', 'canceled' |
| `billing_cycle` | text | ENUM: 'monthly', 'yearly' |
| `starts_at` | timestamptz | NOT NULL |
| `ends_at` | timestamptz | Nullable |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Auto-updated |

**RLS Policies:**
- `super_admin` can INSERT/UPDATE/DELETE
- `admin` can SELECT only
- Customers have no access

**New Files:**

| File | Purpose |
|------|---------|
| `src/components/settings/BillingSettingsTab.tsx` | Admin Billing UI |
| `src/hooks/useSubscription.ts` | Fetch/mutate subscription |

**Integration:**
- Add "Billing" tab to `Settings.tsx` (visible to super_admin only)
- All changes logged to `audit_logs` with event_type: `subscription_*`

---

### 3A.2 — Customer Loyalty Tracking

**Database Table: `customer_loyalty`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `customer_id` | uuid | FK → customers, UNIQUE |
| `lifetime_orders` | integer | Default 0 |
| `lifetime_revenue` | numeric | Default 0 |
| `last_order_at` | timestamptz | Nullable |
| `loyalty_tier` | text | ENUM: 'bronze', 'silver', 'gold' |
| `updated_at` | timestamptz | Auto-updated |

**Tier Calculation (Read-Only, Computed on Query):**

| Tier | Condition |
|------|-----------|
| Bronze | < 3 orders |
| Silver | ≥ 3 orders |
| Gold | ≥ 10 orders OR lifetime_revenue > 50,000 |

**New Files:**

| File | Purpose |
|------|---------|
| `src/components/loyalty/LoyaltyBadge.tsx` | Visual tier indicator |
| `src/hooks/useCustomerLoyalty.ts` | Fetch/compute loyalty data |
| `src/utils/loyaltyHelpers.ts` | Tier calculation functions |

**Integration Points:**
- Add `LoyaltyBadge` to `UnifiedCustomerView.tsx` header
- Add `LoyaltyBadge` to `CustomerCard.tsx`
- Add tooltip explaining tier criteria

**Customer Portal (Optional Badge):**
- Show "Trusted Customer" badge for Gold tier only
- No mention of rewards or benefits

---

### 3A.3 — Commercial Signals

**New File: `src/utils/commercialSignals.ts`**

Utility functions for read-only intelligence:

```text
isRepeatBuyer(customer)
  → true if lifetime_orders ≥ 2

isHighValueCustomer(customer)
  → true if lifetime_revenue > 25,000 OR avg_order_value > 5,000

isHighFrequencyCustomer(customer)
  → true if has ≥ 3 orders in last 90 days

isCreditCandidate(customer)
  → true if Gold tier AND isRepeatBuyer AND no late payments
  → For Phase 3B preparation (not acted upon)
```

**New Files:**

| File | Purpose |
|------|---------|
| `src/utils/commercialSignals.ts` | Signal calculation functions |
| `src/components/commercial/CommercialSignalBadges.tsx` | Visual indicators |

**Integration Points:**
- Admin: Customer profile shows signal badges
- Admin: Order header shows repeat buyer indicator
- Operations Hub: Badge-only indicators on queue rows
- Super Admin: "Potential Credit Candidate" signal visible

---

## Implementation Details

### Step 1: Database Migrations

**Migration 1: Create subscriptions table**
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view subscriptions"
  ON subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
```

**Migration 2: Create customer_loyalty table**
```sql
CREATE TABLE public.customer_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  lifetime_orders INTEGER DEFAULT 0,
  lifetime_revenue NUMERIC(15,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  loyalty_tier TEXT DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id)
);

-- RLS
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view loyalty"
  ON customer_loyalty FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'sales_rep')
  ));

CREATE POLICY "System can update loyalty"
  ON customer_loyalty FOR ALL
  USING (true);
```

---

### Step 2: Utility Files

**File: `src/utils/loyaltyHelpers.ts`**

```text
Functions:
- calculateLoyaltyTier(lifetimeOrders, lifetimeRevenue) → 'bronze' | 'silver' | 'gold'
- getTierColor(tier) → string (for badge styling)
- getTierDescription(tier) → string (for tooltips)
```

**File: `src/utils/commercialSignals.ts`**

```text
Functions:
- isRepeatBuyer(loyaltyData) → boolean
- isHighValueCustomer(loyaltyData) → boolean
- isHighFrequencyCustomer(loyaltyData, orders) → boolean
- isCreditCandidate(loyaltyData, paymentHistory) → boolean (super_admin only)
- getCommercialSignals(loyaltyData) → { repeatBuyer, highValue, creditCandidate }
```

---

### Step 3: Hooks

**File: `src/hooks/useSubscription.ts`**

```text
Functions:
- useSubscription() → { subscription, isLoading, updatePlan, cancelSubscription }
- Uses react-query for caching
- Logs all changes to audit_logs
```

**File: `src/hooks/useCustomerLoyalty.ts`**

```text
Functions:
- useCustomerLoyalty(customerId) → { loyalty, isLoading, refetch }
- useBulkCustomerLoyalty(customerIds) → { loyaltyMap, isLoading }
- Computes tier client-side from raw data
```

---

### Step 4: UI Components

**File: `src/components/settings/BillingSettingsTab.tsx`**

Features:
- Current plan display with badge
- Status indicator (Active/Past Due/Canceled)
- Plan change dropdown (super_admin only)
- Billing cycle display
- Audit history of plan changes
- Manual cancel/reactivate buttons

**File: `src/components/loyalty/LoyaltyBadge.tsx`**

Features:
- Color-coded tier badge (Bronze/Silver/Gold)
- Optional tooltip with tier criteria
- Compact variant for list views
- Full variant for profile headers

**File: `src/components/commercial/CommercialSignalBadges.tsx`**

Features:
- "Repeat Buyer" badge (green)
- "High Value" badge (purple)
- "Credit Candidate" badge (super_admin only, amber)
- Stacked display for multiple signals

---

### Step 5: Integration Changes

**Modified: `src/pages/Settings.tsx`**

```text
Changes:
- Import BillingSettingsTab
- Add "Billing" tab trigger (super_admin only)
- Add TabsContent for billing tab
```

**Modified: `src/components/crm/UnifiedCustomerView.tsx`**

```text
Changes:
- Import LoyaltyBadge, CommercialSignalBadges
- Add useCustomerLoyalty hook call
- Display badges in customer header section
- Add tooltip for tier explanation
```

**Modified: `src/components/customers/CustomerCard.tsx`**

```text
Changes:
- Import LoyaltyBadge
- Fetch loyalty tier for customer
- Display compact badge in card footer
```

**Modified: `src/pages/admin/OperationsHub.tsx`**

```text
Changes:
- Import CommercialSignalBadges
- Pass customer loyalty data to queue rows
- Display repeat buyer indicator on order rows
```

---

## Files Summary

### New Files (8)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `src/utils/loyaltyHelpers.ts` | ~50 | Tier calculation utilities |
| `src/utils/commercialSignals.ts` | ~80 | Signal calculation utilities |
| `src/hooks/useSubscription.ts` | ~100 | Subscription data hook |
| `src/hooks/useCustomerLoyalty.ts` | ~80 | Loyalty data hook |
| `src/components/settings/BillingSettingsTab.tsx` | ~250 | Admin billing UI |
| `src/components/loyalty/LoyaltyBadge.tsx` | ~60 | Tier badge component |
| `src/components/commercial/CommercialSignalBadges.tsx` | ~100 | Signal badges component |
| `.lovable/migrations/phase3a_subscriptions.sql` | ~50 | Database migration |

### Modified Files (4)

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Billing tab for super_admin |
| `src/components/crm/UnifiedCustomerView.tsx` | Add loyalty/signal badges |
| `src/components/customers/CustomerCard.tsx` | Add loyalty badge |
| `src/pages/admin/OperationsHub.tsx` | Add signal indicators |

---

## Safety Verification Matrix

### Data Safety

| Check | Status |
|-------|--------|
| Orders unaffected by subscription status | No foreign keys, no queries |
| Payments unaffected by loyalty tier | Read-only display only |
| RLS unchanged for orders, quotes, payments | Not modified |
| No foreign keys from orders → subscriptions | Verified |

### UX Safety

| Check | Status |
|-------|--------|
| Customers never blocked by subscription | Not implemented |
| Subscriptions invisible to customers | RLS enforced |
| Loyalty badges are informational only | No pricing logic |
| No rewards, discounts, or credits | Explicitly excluded |

### Operational Safety

| Check | Status |
|-------|--------|
| Operations queues unchanged | Badge-only additions |
| SLA calculations unchanged | Not modified |
| Bulk operations unaffected | Not modified |
| Phase 2 workflows preserved | Verified |

---

## Explicit Non-Goals

| Feature | Status |
|---------|--------|
| Automatic billing | NOT IMPLEMENTED |
| Discount calculations | NOT IMPLEMENTED |
| Credit systems | NOT IMPLEMENTED |
| Deferred payments | NOT IMPLEMENTED |
| Subscription enforcement | NOT IMPLEMENTED |
| Workflow automation triggers | NOT IMPLEMENTED |

---

## Testing Checklist

- [ ] Subscriptions table created with correct RLS
- [ ] Super admin can view/update/cancel subscriptions
- [ ] Admin can only view subscriptions
- [ ] Customers cannot access subscriptions
- [ ] Billing tab appears only for super_admin
- [ ] Subscription changes logged to audit_logs
- [ ] Loyalty table created with customer FK
- [ ] Loyalty tier correctly computed (Bronze < 3, Silver ≥ 3, Gold ≥ 10)
- [ ] Loyalty badge displays in customer profile
- [ ] Loyalty badge displays in customer card
- [ ] Commercial signals compute correctly
- [ ] Credit candidate badge only visible to super_admin
- [ ] All badges are display-only (no click actions)
- [ ] Orders flow completely unaffected
- [ ] Payment flow completely unaffected
- [ ] Quote flow completely unaffected

---

## Success Criteria

Phase 3A is complete when:

1. Subscription state is visible and manageable by super_admin
2. Loyalty tiers track customer behavior without monetary impact
3. Commercial signals surface valuable customers
4. Badges are purely informational
5. Zero breaking changes to Phase 1-2 workflows
6. All changes are audit-logged

