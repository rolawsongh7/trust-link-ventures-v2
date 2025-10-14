-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read password policies" ON public.password_policies;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can read password policies"
ON public.password_policies
FOR SELECT
TO authenticated
USING (true);

-- Note: The admin management policy remains unchanged and continues to work