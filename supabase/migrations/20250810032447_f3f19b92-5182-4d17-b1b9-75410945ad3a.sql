-- Fix RLS policies to allow quote request creation from non-authenticated users

-- Drop and recreate customers table INSERT policy to allow anyone
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
CREATE POLICY "Anyone can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

-- Drop and recreate leads table INSERT policy to allow anyone  
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Also ensure quotes can be created by anyone
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;
CREATE POLICY "Anyone can insert quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (true);

-- And ensure activities can be created
DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Anyone can insert activities" ON public.activities;
CREATE POLICY "Anyone can insert activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (true);