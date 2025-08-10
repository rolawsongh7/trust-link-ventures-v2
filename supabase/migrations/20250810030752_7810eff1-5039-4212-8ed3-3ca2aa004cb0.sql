-- Update the opportunities table RLS policy to allow admins to see all opportunities
DROP POLICY IF EXISTS "Enhanced users can view opportunities" ON public.opportunities;

-- Create a new policy that allows admins to see all opportunities and users to see assigned opportunities
CREATE POLICY "Enhanced users can view opportunities" 
ON public.opportunities 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND 
  (
    (get_user_role(auth.uid()) = 'admin'::text) OR 
    (assigned_to = auth.uid())
  )
);