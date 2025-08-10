-- Create storage bucket for supplier logos
INSERT INTO storage.buckets (id, name, public) 
SELECT 'supplier-logos', 'supplier-logos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'supplier-logos');

-- Create storage policies for supplier logos bucket (public)
CREATE POLICY "Anyone can view supplier logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'supplier-logos');

CREATE POLICY "Users can upload supplier logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'supplier-logos' AND 
    auth.uid() IS NOT NULL
  );

-- Update existing suppliers table to add logo_url column if not exists
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS logo_url text;

-- Update predefined suppliers with correct info
UPDATE public.suppliers SET 
  address = '',
  email = '',
  phone = ''
WHERE name = 'Niah Foods';

UPDATE public.suppliers SET 
  address = '',
  email = '',
  phone = ''
WHERE name = 'AJC International';

UPDATE public.suppliers SET 
  address = 'Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE',
  email = 'seafoods@marsea.co.uk',
  phone = '+441482642302'
WHERE name = 'J Marr (Seafoods) Limited';

UPDATE public.suppliers SET 
  address = '',
  email = '',
  phone = ''
WHERE name = 'JAB Bros Company LLC';

UPDATE public.suppliers SET 
  address = '',
  email = '',
  phone = ''
WHERE name = 'Nowaco';

UPDATE public.suppliers SET 
  address = '',
  email = '',
  phone = ''
WHERE name = 'Seapro SAS';

-- Insert missing suppliers if they don't exist
INSERT INTO public.suppliers (name, address, email, phone) 
SELECT 'Niah Foods', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Niah Foods');

INSERT INTO public.suppliers (name, address, email, phone) 
SELECT 'AJC International', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'AJC International');

INSERT INTO public.suppliers (name, address, email, phone) 
SELECT 'J Marr (Seafoods) Limited', 'Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE', 'seafoods@marsea.co.uk', '+441482642302'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'J Marr (Seafoods) Limited');

INSERT INTO public.suppliers (name, address, email, phone) 
SELECT 'JAB Bros Company LLC', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'JAB Bros Company LLC');

INSERT INTO public.suppliers (name, address, email, phone) 
SELECT 'Nowaco', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Nowaco');

INSERT INTO public.suppliers (name, address, email, phone) 
SELECT 'Seapro SAS', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Seapro SAS');