-- Allow customers to view their own customer record by matching email (case-insensitive)
-- This is critical for the customer portal to work - customers need to read their own record
-- to then access their orders and invoices

CREATE POLICY "Customers can view their own profile by email"
ON public.customers
FOR SELECT
TO public
USING (
  LOWER(email) = LOWER(auth.jwt() ->> 'email')
);

-- Add index for better performance on case-insensitive email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON public.customers (LOWER(email));