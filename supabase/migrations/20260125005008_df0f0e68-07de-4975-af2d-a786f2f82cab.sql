-- Drop existing admin update policy
DROP POLICY IF EXISTS "Admins can update order issues" ON order_issues;

-- Recreate with explicit WITH CHECK clause for admin updates
CREATE POLICY "Admins can update order issues"
ON order_issues
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);