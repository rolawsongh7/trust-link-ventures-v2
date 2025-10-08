-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view leads" ON leads;

-- Create new policy that allows authenticated admin users to view all leads
CREATE POLICY "Authenticated users can view leads"
ON leads
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

-- Add comment to document the policy
COMMENT ON POLICY "Authenticated users can view leads" ON leads IS 
'Allows all authenticated users to view leads. Leads can be created anonymously from contact forms, but only authenticated users (admin/staff) can view them in the admin panel.';