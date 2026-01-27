
# Plan: Update Contact Email in Delivery Address Request Email

## Change Required
Update the support email address in the "Request Delivery Address" email template from `orders@trustlinkcompany.com` to `info@trustlinkcompany.com`.

## File to Modify
`supabase/functions/request-delivery-address/index.ts`

## Change Details

**Line 155** - Update the contact email in both the mailto link and display text:

| Before | After |
|--------|-------|
| `orders@trustlinkcompany.com` | `info@trustlinkcompany.com` |

The change affects this paragraph in the email:
```
If you have any questions, please don't hesitate to contact us at 
info@trustlinkcompany.com
```

## Why This Change
This aligns with the project's email standardization which uses `info@trustlinkcompany.com` as the primary contact email for customer communications (as documented in the email configuration).
