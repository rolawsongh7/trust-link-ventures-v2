-- Enable public read access for active supplier products
-- This allows anyone (authenticated or not) to view active products in the catalog

-- Policy for public SELECT access to active products
CREATE POLICY "Anyone can view active supplier products"
ON public.supplier_products
FOR SELECT
USING (is_active = true);

-- Policy for authenticated users to manage supplier products
CREATE POLICY "Authenticated users can insert supplier products"
ON public.supplier_products
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update supplier products"
ON public.supplier_products
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete supplier products"
ON public.supplier_products
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin');