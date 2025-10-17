-- Fix RLS policy for orders table to allow system-triggered order creation
-- The auto_convert_quote_to_order trigger needs to be able to insert orders

-- First, drop the existing policy
DROP POLICY IF EXISTS "Users and system can insert orders" ON orders;

-- Recreate it with the correct logic
CREATE POLICY "Users and system can insert orders" ON orders 
FOR INSERT WITH CHECK (
  -- Allow if customer_id is set (this covers both user inserts and trigger inserts)
  customer_id IS NOT NULL
);