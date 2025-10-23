-- Fix password_policies table security
-- Remove the overly permissive public read policy and restrict to authenticated users only

DROP POLICY IF EXISTS "Authenticated users can read password policies" ON public.password_policies;

-- Create a more restrictive policy that only allows authenticated users to read password policies
CREATE POLICY "Authenticated users can read password policies"
ON public.password_policies
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Comment explaining the security improvement
COMMENT ON POLICY "Authenticated users can read password policies" ON public.password_policies IS 
'Restricts password policy visibility to authenticated users only, preventing attackers from learning password requirements to craft targeted attacks';