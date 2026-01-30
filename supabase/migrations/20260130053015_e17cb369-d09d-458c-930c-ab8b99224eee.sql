-- ============================================
-- Customer Payment Records & Storage RLS Policies
-- Allows customers to view their own payment records and proofs
-- ============================================

-- 1. Allow customers to view payment records for their own orders
CREATE POLICY "Customers can view their own payment records"
ON public.payment_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN customer_users cu ON cu.customer_id = o.customer_id
    WHERE o.id = payment_records.order_id
    AND cu.user_id = auth.uid()
  )
);

-- 2. Drop overly permissive storage policy if exists
DROP POLICY IF EXISTS "Allow authenticated select from payment-proofs" ON storage.objects;

-- 3. Create customer-scoped read policy for payment proofs storage
-- Files are stored as {customer_id}/{filename} so we validate folder matches customer
-- Uses is_admin() function that already exists in the database
CREATE POLICY "Customers and admins can view payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  (
    -- Admin access via is_admin() function
    public.is_admin()
    OR
    -- Customer access: file path folder matches their customer_id
    EXISTS (
      SELECT 1 FROM customer_users cu
      WHERE cu.user_id = auth.uid()
      AND (storage.foldername(name))[1] = cu.customer_id::text
    )
  )
);

-- Add documentation comment
COMMENT ON POLICY "Customers can view their own payment records" ON public.payment_records IS
'Allows customers to read payment records linked to orders they own via customer_users table. Read-only access for viewing payment history in customer portal.';