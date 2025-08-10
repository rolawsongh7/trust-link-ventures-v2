-- Fix RLS policies for customers and leads tables to allow quote request creation

-- Update customers table policy to allow anyone to insert customer records
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
CREATE POLICY "Users can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

-- Update leads table policy to allow anyone to insert lead records  
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
CREATE POLICY "Users can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);