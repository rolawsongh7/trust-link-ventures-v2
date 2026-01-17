-- Allow customers to update their own profile via customer_users mapping
CREATE POLICY "Customers can update their own profile via customer_users"
ON customers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = customers.id 
    AND customer_users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_users 
    WHERE customer_users.customer_id = customers.id 
    AND customer_users.user_id = auth.uid()
  )
);

-- Backfill created_by for existing customers where possible
UPDATE customers SET created_by = customer_users.user_id
FROM customer_users 
WHERE customers.id = customer_users.customer_id 
AND customers.created_by IS NULL;