-- Update orders RLS policy to be case-insensitive for better customer matching
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;

CREATE POLICY "Customers can view their own orders" ON public.orders
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- Update invoices RLS policy to be case-insensitive for better customer matching
DROP POLICY IF EXISTS "Customers can view their own invoices" ON public.invoices;

CREATE POLICY "Customers can view their own invoices" ON public.invoices
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- Update customer_addresses RLS policy to be case-insensitive
DROP POLICY IF EXISTS "Customers can view own addresses" ON public.customer_addresses;

CREATE POLICY "Customers can view own addresses" ON public.customer_addresses
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- Also update other customer address policies for consistency
DROP POLICY IF EXISTS "Customers can create own addresses" ON public.customer_addresses;

CREATE POLICY "Customers can create own addresses" ON public.customer_addresses
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Customers can update own addresses" ON public.customer_addresses;

CREATE POLICY "Customers can update own addresses" ON public.customer_addresses
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Customers can delete own addresses" ON public.customer_addresses;

CREATE POLICY "Customers can delete own addresses" ON public.customer_addresses
  FOR DELETE
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );