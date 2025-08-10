-- Add unique constraint on suppliers name column
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_name_unique UNIQUE (name);

-- Insert predefined suppliers (if not exists)
INSERT INTO public.suppliers (name, address, email, phone) VALUES
  ('Niah Foods', '', '', ''),
  ('AJC International', '', '', ''),
  ('J Marr (Seafoods) Limited', 'Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE', 'seafoods@marsea.co.uk', '+441482642302'),
  ('JAB Bros Company LLC', '', '', ''),
  ('Nowaco', '', '', ''),
  ('Seapro SAS', '', '', '')
ON CONFLICT (name) DO NOTHING;