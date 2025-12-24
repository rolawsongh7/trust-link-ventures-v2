-- Drop the problematic policy that incorrectly compares customer_id with auth.uid()
DROP POLICY IF EXISTS "Customers and admins can update orders" ON orders;

-- Create a proper policy that uses user_can_access_customer function
-- This correctly checks if the authenticated user is linked to the customer via email
CREATE POLICY "Customers and admins can update orders" ON orders
  FOR UPDATE
  USING (
    check_user_role(auth.uid(), 'admin'::text) 
    OR user_can_access_customer(customer_id, auth.uid())
  )
  WITH CHECK (
    check_user_role(auth.uid(), 'admin'::text) 
    OR user_can_access_customer(customer_id, auth.uid())
  );