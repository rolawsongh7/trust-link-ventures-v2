-- Allow customers to view tracking tokens for their own orders
CREATE POLICY "Customers can view their own order tracking tokens"
ON public.delivery_tracking_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM orders o
    WHERE o.id = delivery_tracking_tokens.order_id
    AND o.customer_id = auth.uid()
  )
);