-- Fix payment-proofs storage bucket RLS policies
-- First, check and drop any existing conflicting policies
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload payment proofs" ON storage.objects;

-- Allow ANY authenticated user to INSERT payment proofs
CREATE POLICY "Allow authenticated uploads to payment-proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- Allow ANY authenticated user to SELECT payment proofs
CREATE POLICY "Allow authenticated select from payment-proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
);

-- Allow ANY authenticated user to UPDATE payment proofs
CREATE POLICY "Allow authenticated updates to payment-proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow ANY authenticated user to DELETE payment proofs
CREATE POLICY "Allow authenticated deletes from payment-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');