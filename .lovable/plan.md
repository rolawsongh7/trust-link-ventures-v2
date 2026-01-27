
# Plan: Fix Quote Approval Magic Link

## Problem
When customers click "Approve Quote" or "Reject Quote" buttons in the email, they see a "Link Expired" error page, even when the token is valid and hasn't expired.

## Root Cause
The `quote-approval` Edge Function uses Supabase's relation syntax (`quotes(*)`) to join data:
```typescript
.select('*, quotes(*)')
```

However, the `magic_link_tokens.quote_id` column has **no foreign key constraint** to `quotes.id`. Without this FK relationship, Supabase's PostgREST API cannot perform the join, causing the query to fail.

Database verification confirms:
- Token exists: `e182c01a-b7c2-44d1-ae51-6373362b3b0e`
- Quote exists: `QT-20260127-455` (status: sent)
- Token not expired: valid until Feb 3, 2026
- Token not used: `used_at` is null
- No foreign key relationship between `magic_link_tokens.quote_id` and `quotes.id`

## Solution
Modify the `quote-approval` Edge Function to use **separate queries** instead of relying on the join syntax:
1. First query `magic_link_tokens` to get the token and `quote_id`
2. Then query `quotes` using the `quote_id` to get quote details

This approach works without requiring a database migration.

---

## Implementation

### File to Modify
`supabase/functions/quote-approval/index.ts`

### Changes

**1. First Query Block (Lines 364-411)** - Token validation without action:
- Change the query from `select('*, quotes(*)')` to `select('*')`  
- Add a separate query to fetch the quote using `tokenData.quote_id`
- Pass the quote data to `generateChoicePage()`

**2. Second Query Block (Lines 418-449)** - Token validation with action:
- Change the query from the complex join to `select('*')`
- Add a separate query to fetch quote with customer data
- Update references from `tokenData.quotes` to the separately fetched quote

### Code Changes Summary

```text
For the "no action" block (lines 364-411):
  1. Query magic_link_tokens with select('*') only
  2. After token validation, query quotes separately:
     supabase.from('quotes').select('*').eq('id', tokenData.quote_id).single()
  3. Pass quote data to generateChoicePage(quote, token)

For the "with action" block (lines 418-449):
  1. Query magic_link_tokens with select('*') only
  2. After token validation, query quotes with customer relation:
     supabase.from('quotes')
       .select('id, quote_number, title, total_amount, currency, valid_until, customer_email, customers(company_name, contact_name)')
       .eq('id', tokenData.quote_id)
       .single()
  3. Update generateFormPage() and POST handler to use the separate quote data
```

---

## Technical Details

The edge function has three locations where the join query is used:
1. **Line 368**: Initial token validation (show choice page)
2. **Line 421-432**: Token validation with action (show form page)
3. **Line 453**: Form display uses `tokenData.quotes`

All instances will be updated to use separate queries.

---

## Testing After Implementation

1. Admin creates a manual quote and sends with magic link
2. Customer receives email with "Approve Quote" / "Reject Quote" buttons
3. Clicking either button shows the quote choice/confirmation page
4. Customer can approve or reject and see success message

---

## Alternative Considered

Adding a foreign key constraint via database migration was considered, but the separate query approach:
- Requires no database changes
- Is equally performant (2 small queries vs 1 join)
- Is more explicit and easier to debug
- Works immediately without migration coordination
