-- Remove supplier-related tables and references
-- Keep suppliers table as reference but remove portal functionality

-- Drop supplier-related tables that are no longer needed
DROP TABLE IF EXISTS public.rfq_responses CASCADE;

-- Update quotes table to remove supplier_id reference since we'll handle via magic links
ALTER TABLE public.quotes DROP COLUMN IF EXISTS supplier_id;

-- Update products table to remove supplier_id since we'll handle products differently
ALTER TABLE public.products DROP COLUMN IF EXISTS supplier_id;

-- Remove suppliers table entirely since we'll handle everything ad-hoc
DROP TABLE IF EXISTS public.suppliers CASCADE;