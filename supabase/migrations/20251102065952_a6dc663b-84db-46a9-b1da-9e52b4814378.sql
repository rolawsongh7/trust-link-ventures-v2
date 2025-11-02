-- Fix customer invoice storage access policy
-- The policy was comparing invoice_number (no extension) with file path (with .pdf extension)
-- This fix strips the .pdf extension before comparison

DROP POLICY IF EXISTS "Customers can read their own invoices" ON storage.objects;

CREATE POLICY "Customers can read their own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.invoice_number = regexp_replace(split_part(name, '/', 2), '\.pdf$', '')
    AND invoices.customer_id IN (
      SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
    )
  )
);