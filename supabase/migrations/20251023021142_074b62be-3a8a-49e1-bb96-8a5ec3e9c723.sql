-- Fix opportunities table RLS to prevent unauthorized sales pipeline access
-- Remove overly permissive policies that allow any authenticated user to view/update all opportunities

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update opportunities" ON public.opportunities;

-- The "Enhanced users can view opportunities" policy is good, but let's make it clearer
DROP POLICY IF EXISTS "Enhanced users can view opportunities" ON public.opportunities;

-- Create restrictive SELECT policy: Only admins, assigned users, or creators can view
CREATE POLICY "Restricted opportunity viewing"
ON public.opportunities
FOR SELECT
TO authenticated
USING (
  check_user_role(auth.uid(), 'admin') 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

-- Create restrictive UPDATE policy: Only admins, assigned users, or creators can update
CREATE POLICY "Restricted opportunity updates"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (
  check_user_role(auth.uid(), 'admin') 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
)
WITH CHECK (
  check_user_role(auth.uid(), 'admin') 
  OR assigned_to = auth.uid() 
  OR created_by = auth.uid()
);

-- Keep INSERT policy as is (users can create opportunities)
-- Keep DELETE policy as is (only admins can delete)

-- Add helpful comments
COMMENT ON POLICY "Restricted opportunity viewing" ON public.opportunities IS 
'Sales reps can only view opportunities assigned to them or that they created. Admins can view all.';

COMMENT ON POLICY "Restricted opportunity updates" ON public.opportunities IS 
'Sales reps can only update opportunities assigned to them or that they created. Admins can update all.';

-- Log the security improvement
SELECT log_security_event(
  'opportunities_rls_hardened',
  auth.uid(),
  jsonb_build_object(
    'action', 'rls_policy_update',
    'table', 'opportunities',
    'reason', 'Prevent unauthorized sales pipeline access between sales reps',
    'timestamp', extract(epoch from now())
  ),
  NULL,
  NULL,
  'high'
);