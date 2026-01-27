
# Plan: Fix POD Visibility in Admin and Customer Portals

## Problem Summary
Proof of Delivery (POD) images are not displaying in either the Admin or Customer portals despite being successfully uploaded to storage. The root cause is that the Admin section doesn't refresh expired signed URLs before rendering images, and there may be RLS issues affecting customer access.

## Root Cause Analysis

| Component | Status | Issue Found |
|-----------|--------|-------------|
| `AdminProofOfDeliverySection` | Broken | Uses raw URL directly for `<img src>` without refreshing signed URL |
| `ProofOfDeliverySection` (Customer) | Works | Correctly fetches fresh signed URL on mount |
| `storageHelpers.ts` | Works | Properly extracts bucket name from POD URLs |
| Database | Works | POD URLs stored correctly in `proof_of_delivery_url` |
| Storage Bucket | Works | `order-documents` bucket exists and is private |
| RLS Policies | Needs Verification | Customer access may be blocked by RLS |

---

## Implementation Plan

### Step 1: Fix Admin POD Display
**File:** `src/components/orders/AdminProofOfDeliverySection.tsx`

Add signed URL refresh on component mount (same pattern as customer version):

**Changes:**
- Add `useState` for `signedPhotoUrl` and `isLoadingUrl`
- Add `useEffect` to call `ensureSignedUrl` when `photoUrl` changes
- Update image rendering to use `signedPhotoUrl` instead of raw `photoUrl`
- Add loading spinner while URL is being fetched

```text
Technical Details:
- Import useEffect, add state variables
- Add useEffect hook similar to ProofOfDeliverySection
- Update img src to use signedPhotoUrl
- Add Loader2 spinner for loading state
```

### Step 2: Add Admin-Specific Signed URL Helper (Optional Enhancement)
**File:** `src/lib/storageHelpers.ts`

The existing `ensureSignedUrl` function works correctly for POD URLs because it extracts the bucket name from signed URLs. No changes needed here.

### Step 3: Verify and Fix RLS for Customer POD Access
**File:** New SQL migration or verification

Verify that the existing RLS policy allows customers to:
1. Read POD URLs from `orders` table for their own orders
2. Access POD files from `order-documents` bucket

**Current RLS Policy Check:**
```sql
-- Existing policy: "Customers can view their own POD files"
-- This should work if customer_users join is correct
```

### Step 4: Update Admin Order Issues Panel
**File:** `src/pages/admin/OrderIssues.tsx`

The admin issues panel already uses `ProofOfDeliverySection` which correctly handles signed URLs. No changes needed.

### Step 5: Verify Customer Issue Detail Page
**File:** `src/pages/CustomerIssueDetail.tsx`

Already uses `ProofOfDeliverySection` component which handles signed URLs correctly. No changes needed.

### Step 6: Verify Order Tracking Page
**File:** `src/pages/OrderTracking.tsx`

Already uses `ProofOfDeliverySection` component which handles signed URLs correctly. No changes needed.

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/orders/AdminProofOfDeliverySection.tsx` | Modify | Add signed URL refresh on mount with loading state |

## Files Already Working (No Changes Needed)

| File | Status | Reason |
|------|--------|--------|
| `src/components/customer/ProofOfDeliverySection.tsx` | Working | Already fetches fresh signed URL on mount |
| `src/pages/OrderTracking.tsx` | Working | Uses ProofOfDeliverySection |
| `src/pages/CustomerIssueDetail.tsx` | Working | Uses ProofOfDeliverySection |
| `src/pages/admin/OrderIssues.tsx` | Working | Uses ProofOfDeliverySection |
| `src/lib/storageHelpers.ts` | Working | Correctly extracts bucket from signed URLs |

---

## Technical Details

### AdminProofOfDeliverySection Fix

The component currently:
```tsx
// Current (broken) - uses raw URL directly
const photoUrl = proofOfDeliveryUrl || deliveryProofUrl;
...
<img src={photoUrl} alt="Delivery proof" />
```

Will be changed to:
```tsx
// Fixed - fetches fresh signed URL on mount
const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
const [isLoadingUrl, setIsLoadingUrl] = useState(false);
const rawPhotoUrl = proofOfDeliveryUrl || deliveryProofUrl;

useEffect(() => {
  const loadSignedUrl = async () => {
    if (!rawPhotoUrl) return;
    setIsLoadingUrl(true);
    try {
      const freshUrl = await ensureSignedUrl(rawPhotoUrl);
      setSignedPhotoUrl(freshUrl);
    } catch (error) {
      console.error('Failed to get signed URL for POD:', error);
      setSignedPhotoUrl(rawPhotoUrl); // Fallback
    } finally {
      setIsLoadingUrl(false);
    }
  };
  loadSignedUrl();
}, [rawPhotoUrl]);

// In render:
{isLoadingUrl ? <Loader2 /> : <img src={signedPhotoUrl || rawPhotoUrl} />}
```

### Imports to Add
```tsx
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
```

---

## Testing Checklist

After implementation, verify:

1. **Admin Portal:**
   - [ ] POD visible in order detail page (`/admin/orders/:id`)
   - [ ] POD visible in issue detail panel (`/admin/orders/issues`)
   - [ ] Download button works
   - [ ] Replace button works

2. **Customer Portal:**
   - [ ] POD visible in order tracking page (`/track?token=...`)
   - [ ] POD visible in authenticated order view (`/portal/orders/:id`)
   - [ ] POD visible in issue detail page (`/portal/issues/:id`)
   - [ ] Download button works

3. **Security:**
   - [ ] Customers can only see their own PODs
   - [ ] Signed URLs expire correctly and refresh works

4. **No Regressions:**
   - [ ] Invoices still work (not affected)
   - [ ] Payment screens not affected
   - [ ] Order status transitions not affected

---

## Expected Outcome

After this fix:
- POD images will display correctly in both Admin and Customer portals
- Expired signed URLs will be automatically refreshed
- Loading spinners will provide visual feedback during URL refresh
- No changes to billing, invoices, or order status logic
