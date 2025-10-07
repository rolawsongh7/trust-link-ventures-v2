-- Allow customers to approve or reject quotes sent to them
-- This enables customers to update quote status from 'sent' to 'accepted' or 'rejected'

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Users can view quotes" ON quotes;

-- Create new policies for quote updates
-- Admins can do everything
CREATE POLICY "Admins can manage all quotes"
ON quotes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Customers can view quotes sent to them (by email or customer_id)
CREATE POLICY "Customers can view their own quotes"
ON quotes
FOR SELECT
TO authenticated
USING (
  customer_email = (auth.jwt() ->> 'email')
  OR customer_id IN (
    SELECT id FROM customers 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Customers can approve/reject quotes sent to them
CREATE POLICY "Customers can approve or reject their quotes"
ON quotes
FOR UPDATE
TO authenticated
USING (
  (customer_email = (auth.jwt() ->> 'email')
  OR customer_id IN (
    SELECT id FROM customers 
    WHERE email = (auth.jwt() ->> 'email')
  ))
  AND status = 'sent'
)
WITH CHECK (
  (customer_email = (auth.jwt() ->> 'email')
  OR customer_id IN (
    SELECT id FROM customers 
    WHERE email = (auth.jwt() ->> 'email')
  ))
  AND status IN ('accepted', 'rejected')
);