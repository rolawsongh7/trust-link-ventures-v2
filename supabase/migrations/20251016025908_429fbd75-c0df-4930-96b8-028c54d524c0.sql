-- Update RLS policy to recognize system operations (triggers)
DROP POLICY IF EXISTS "Orders can be created by authorized users or system" ON orders;

CREATE POLICY "Orders can be created by authorized users or system"
ON orders FOR INSERT
WITH CHECK (
  -- User creating their own order
  (auth.uid() = customer_id) OR
  -- Admin creating any order
  (check_user_role(auth.uid(), 'admin')) OR
  -- System trigger creating order (verified by current_user being service role)
  (current_user IN ('postgres', 'service_role') AND customer_id IS NOT NULL)
);