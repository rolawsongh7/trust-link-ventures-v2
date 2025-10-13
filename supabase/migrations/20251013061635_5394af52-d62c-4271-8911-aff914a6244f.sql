-- Drop the admin-only policy that's blocking customer updates
DROP POLICY IF EXISTS "Only admins can update orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;

-- Create hybrid policy for customer + admin access
CREATE POLICY "Customers and admins can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  -- Allow admins to update any order
  check_user_role(auth.uid(), 'admin')
  OR
  -- Allow customers to update their own orders
  customer_id = auth.uid()
)
WITH CHECK (
  -- Admins can update any field
  check_user_role(auth.uid(), 'admin')
  OR
  -- Customers can only update delivery address fields
  (
    customer_id = auth.uid()
    AND delivery_address_id IS NOT NULL
    AND delivery_address_confirmed_at IS NOT NULL
  )
);