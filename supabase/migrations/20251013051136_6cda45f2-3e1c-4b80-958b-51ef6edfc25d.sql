-- Add explicit admin RLS policy for order updates
-- This ensures admins can update delivery addresses and other order fields
CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
TO authenticated
USING (
  check_user_role(auth.uid(), 'admin')
);