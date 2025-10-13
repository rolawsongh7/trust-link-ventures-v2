-- Drop the overly permissive policy that was blocking updates
DROP POLICY IF EXISTS "Users can update orders" ON orders;

-- Create admin-only update policy using the existing check_user_role function
CREATE POLICY "Only admins can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (check_user_role(auth.uid(), 'admin'))
WITH CHECK (check_user_role(auth.uid(), 'admin'));