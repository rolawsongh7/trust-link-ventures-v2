-- Fix RLS policy for orders table to allow system-triggered order creation
-- The auto_convert_quote_to_order trigger needs to be able to insert orders

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;

-- Create new policy that allows both authenticated users AND system triggers
CREATE POLICY "Users and system can insert orders" ON orders 
FOR INSERT WITH CHECK (
  -- Allow if user is authenticated OR if it's a system operation (trigger/function)
  auth.uid() IS NOT NULL 
  OR current_setting('role', true) = 'service_role'
  OR customer_id IS NOT NULL  -- Allow if customer_id is set (triggered by quote acceptance)
);

-- Ensure customers can view their own orders
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
CREATE POLICY "Customers can view their own orders" ON orders 
FOR SELECT USING (
  customer_id IN (
    SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Allow authenticated admin users to view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders 
FOR SELECT USING (
  check_user_role(auth.uid(), 'admin')
);