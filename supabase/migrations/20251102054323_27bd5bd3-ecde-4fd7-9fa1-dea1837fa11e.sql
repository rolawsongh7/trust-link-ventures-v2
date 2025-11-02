-- Fix RLS policy for customer invoice visibility
-- This allows customers to see their own invoices directly

-- First, check and drop old SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view accessible invoices" ON public.invoices;

-- Create new comprehensive SELECT policy with triple-layer security
CREATE POLICY "Customers and admins can view invoices" 
ON public.invoices
FOR SELECT
TO authenticated
USING (
  -- Option 1: Direct customer access (customer_id = user_id)
  customer_id = auth.uid()
  OR
  -- Option 2: Mapped customer access through customer_users table
  user_can_access_customer(customer_id, auth.uid())
  OR
  -- Option 3: Admin access (admins can see all invoices)
  check_user_role(auth.uid(), 'admin')
);