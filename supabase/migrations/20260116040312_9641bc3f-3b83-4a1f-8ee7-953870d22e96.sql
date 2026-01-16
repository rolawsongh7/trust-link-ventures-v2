-- Fix quote_items RLS policies to use check_user_role() function instead of profiles.role
-- This aligns with how quote_requests policies work and uses the proper user_roles table

-- Drop the existing policies that check profiles.role (which is always null)
DROP POLICY IF EXISTS "Admins can insert quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Admins can update quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Admins can delete quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Customers can view their quote items" ON public.quote_items;

-- Recreate with proper role checks using check_user_role()
-- Admin INSERT policy
CREATE POLICY "Admins can insert quote items" 
ON public.quote_items 
FOR INSERT 
TO authenticated
WITH CHECK (check_user_role(auth.uid(), 'admin'));

-- Admin UPDATE policy
CREATE POLICY "Admins can update quote items" 
ON public.quote_items 
FOR UPDATE 
TO authenticated
USING (check_user_role(auth.uid(), 'admin'))
WITH CHECK (check_user_role(auth.uid(), 'admin'));

-- Admin DELETE policy
CREATE POLICY "Admins can delete quote items" 
ON public.quote_items 
FOR DELETE 
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

-- Customers can view their quote items (combined with admin access)
CREATE POLICY "Users can view relevant quote items" 
ON public.quote_items 
FOR SELECT 
TO authenticated
USING (
  -- Admin can view all
  check_user_role(auth.uid(), 'admin')
  OR
  -- Customer can view their own quote items
  EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_items.quote_id
    AND (
      q.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      OR q.customer_id IN (
        SELECT c.id FROM customers c
        JOIN customer_users cu ON cu.customer_id = c.id
        WHERE cu.user_id = auth.uid()
      )
    )
  )
);