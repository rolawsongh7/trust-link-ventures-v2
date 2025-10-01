-- Fix quote visibility for customers by improving RLS policy and linking orphaned quotes

-- 1. Add improved RLS policy that allows customers to view quotes by email match
CREATE POLICY "Customers can view quotes by email match" 
ON public.quote_requests
FOR SELECT
USING (
  -- Check if user is authenticated as a customer and email matches
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email = quote_requests.lead_email
  )
);

-- 2. Link orphaned quote requests to customer accounts where emails match
UPDATE public.quote_requests qr
SET customer_id = c.id
FROM public.customers c
WHERE qr.customer_id IS NULL
  AND qr.lead_email IS NOT NULL
  AND qr.lead_email = c.email;