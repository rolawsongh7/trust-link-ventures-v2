-- Fix quote_items SELECT policy - remove auth.users reference which causes permission denied
-- The existing policy references auth.users table which is not accessible via RLS

DROP POLICY IF EXISTS "Users can view relevant quote items" ON public.quote_items;

-- Recreate SELECT policy using auth.jwt() instead of auth.users
CREATE POLICY "Users can view relevant quote items" 
ON public.quote_items 
FOR SELECT 
TO authenticated
USING (
  -- Admin can view all
  check_user_role(auth.uid(), 'admin')
  OR
  -- Customer can view their own quote items via JWT email or customer_users link
  EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_items.quote_id
    AND (
      -- Match by email from JWT (no auth.users access needed)
      q.customer_email = (auth.jwt() ->> 'email')::text
      OR 
      -- Match by customer_users link
      q.customer_id IN (
        SELECT cu.customer_id 
        FROM customer_users cu
        WHERE cu.user_id = auth.uid()
      )
    )
  )
);