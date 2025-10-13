-- Add RLS policy for admins to view all customer addresses
CREATE POLICY "Admins can view all customer addresses"
ON customer_addresses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);