-- Check current RLS policies for supplier_products table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'supplier_products';

-- Add RLS policy to allow anyone to insert supplier products (for importing data)
CREATE POLICY "Anyone can insert supplier products for import" 
ON public.supplier_products 
FOR INSERT 
WITH CHECK (true);

-- Also add a policy to allow viewing supplier products without authentication
CREATE POLICY "Anyone can view active supplier products" 
ON public.supplier_products 
FOR SELECT 
USING (is_active = true);