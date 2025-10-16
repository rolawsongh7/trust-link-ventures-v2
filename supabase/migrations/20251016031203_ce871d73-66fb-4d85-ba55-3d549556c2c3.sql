-- Fix payment-proofs bucket RLS policies to allow admin uploads
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;

-- Create new policy that allows authenticated users to upload to payment-proofs bucket
CREATE POLICY "Authenticated users can upload payment proofs" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND (
    -- Allow authenticated users to upload
    auth.uid() IS NOT NULL
  )
);

-- Ensure update policy exists for admins
DROP POLICY IF EXISTS "Admins can update payment proofs" ON storage.objects;

CREATE POLICY "Admins can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' 
  AND check_user_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND check_user_role(auth.uid(), 'admin')
);