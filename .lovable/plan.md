
# Plan: Fix "Provide Delivery Address" Email Link

## Problem
When a customer receives the "Delivery Address Required" email, the "Provide Delivery Address" button links to a broken URL. The current code generates a URL like:
```
https://app.qvrcqzudycymejjpfdos.supabase.co/customer/addresses?orderId=...
```

This is a Supabase backend URL that doesn't exist as a customer-facing page.

## Root Cause
In the `request-delivery-address` Edge Function (line 136), the URL is incorrectly constructed:
```typescript
${supabaseUrl.replace('https://', 'https://app.')}/customer/addresses?orderId=${orderId}
```

This transforms the Supabase URL instead of using the production customer portal domain.

## Solution
Update the Edge Function to use the correct production URL:
```
https://trustlinkcompany.com/portal/addresses?orderId=...&orderNumber=...
```

The customer addresses page (`/portal/addresses`) already supports these query parameters and will:
1. Detect the `orderId` parameter
2. Prompt the user to add/select a delivery address
3. Automatically link the selected address to the pending order

---

## Implementation

### File to Modify
`supabase/functions/request-delivery-address/index.ts`

### Change (Line 136)

**Before:**
```typescript
<a href="${supabaseUrl.replace('https://', 'https://app.')}/customer/addresses?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}"
```

**After:**
```typescript
<a href="https://trustlinkcompany.com/portal/addresses?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}"
```

---

## Why This Works

1. **Correct Domain**: Uses the production domain `trustlinkcompany.com` that customers can access
2. **Correct Route**: Points to `/portal/addresses` which is the actual address management page
3. **Query Parameters Preserved**: The `orderId` and `orderNumber` params are already supported by the `CustomerAddresses` component
4. **Order Linking**: When a customer adds an address with these params, it automatically links to the pending order

---

## Existing Support in CustomerAddresses Component

The component already handles these parameters:
- Extracts `orderId` from URL query params
- Shows a banner indicating the order awaiting address
- Automatically links the saved address to that order

---

## Testing After Implementation

1. Admin triggers "Request Address" for an order without delivery address
2. Customer receives email with working "Provide Delivery Address" button
3. Clicking the button opens `/portal/addresses?orderId=...`
4. Customer adds/selects an address
5. Address is linked to the order automatically
