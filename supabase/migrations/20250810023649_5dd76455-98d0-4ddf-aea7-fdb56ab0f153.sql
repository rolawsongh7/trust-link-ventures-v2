-- Update suppliers with detailed contact information
UPDATE suppliers SET 
  name = 'J Marr (Seafoods) Limited',
  address = 'Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE',
  email = 'seafoods@marsea.co.uk',
  phone = '+441482642302',
  logo_url = 'J_marr.png',
  updated_at = now()
WHERE name = 'J Marr (Seafoods) Limited';

UPDATE suppliers SET 
  name = 'JAB Bros. Company LLC',
  address = '12895 NE 14 Av, North Miami, FL, 22161, USA',
  email = 'info@jab-bros.com@.ar',
  phone = '+54114732.0591',
  logo_url = 'Jab_bros.png',
  updated_at = now()
WHERE name = 'JAB Bros Company LLC';

UPDATE suppliers SET 
  name = 'Niah Foods Limited',
  address = '20-22 Wenlock Road, London, N1 7GU, UK',
  email = 'liz@niahfoods.com',
  phone = '+44 7368356155',
  logo_url = 'niah_foods.png',
  updated_at = now()
WHERE name = 'Niah Foods';

UPDATE suppliers SET 
  name = 'SEAPRO SAS',
  address = '5 rue du Moulinas, 66330 Cabestany, France',
  email = 'dominique@seaprosas.com',
  phone = '+33 (0)251378686',
  logo_url = 'seapro.png',
  updated_at = now()
WHERE name = 'Seapro SAS';

UPDATE suppliers SET 
  name = 'AJC International',
  address = '1000 Abernathy Road NE, Suite 600, Atlanta GA, 30328, USA',
  email = 'customercare@ajc.com',
  phone = '+1 4042526750',
  logo_url = 'ajc_international.png',
  updated_at = now()
WHERE name = 'AJC International';

UPDATE suppliers SET 
  name = 'NOWACO',
  address = 'NOWACO A/S Prinsengade 15, 9000 Aalborg, Denmark',
  email = 'nowaco@nowaco.com',
  phone = '+45 7788 6100',
  logo_url = 'nowaco.png',
  updated_at = now()
WHERE name = 'Nowaco';

-- Create storage bucket for company logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for logos bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public logos access'
  ) THEN
    CREATE POLICY "Public logos access" ON storage.objects
    FOR SELECT USING (bucket_id = 'logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload logos'
  ) THEN
    CREATE POLICY "Authenticated users can upload logos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update logos'
  ) THEN
    CREATE POLICY "Authenticated users can update logos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;