-- Drop existing foreign key constraint on leads table
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_customer_id_fkey;

-- Add new foreign key constraint with cascade delete
ALTER TABLE public.leads
ADD CONSTRAINT leads_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE CASCADE;