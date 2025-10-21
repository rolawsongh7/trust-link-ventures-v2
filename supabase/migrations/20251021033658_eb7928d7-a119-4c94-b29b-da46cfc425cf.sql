-- Add RLS policies for payment-proofs storage bucket
-- Allow authenticated admins to upload and view payment proofs

-- Policy for admins to upload payment proofs
CREATE POLICY "Admins can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Policy for admins to read payment proofs
CREATE POLICY "Admins can read payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);