-- Create storage bucket for supplier logos (skip quotes as it already exists)
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for quotes bucket (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload quotes'
  ) THEN
    CREATE POLICY "Users can upload quotes" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'quotes' AND 
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view quotes'
  ) THEN
    CREATE POLICY "Users can view quotes" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'quotes' AND 
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update quotes'
  ) THEN
    CREATE POLICY "Users can update quotes" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'quotes' AND 
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete quotes'
  ) THEN
    CREATE POLICY "Users can delete quotes" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'quotes' AND 
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

-- Create storage policies for supplier logos bucket (public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view supplier logos'
  ) THEN
    CREATE POLICY "Anyone can view supplier logos" ON storage.objects
      FOR SELECT USING (bucket_id = 'supplier-logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload supplier logos'
  ) THEN
    CREATE POLICY "Users can upload supplier logos" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'supplier-logos' AND 
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

-- Update suppliers table (if exists, otherwise create)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    -- Table exists, just add any missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'logo_url') THEN
      ALTER TABLE public.suppliers ADD COLUMN logo_url text;
    END IF;
  ELSE
    -- Create suppliers table
    CREATE TABLE public.suppliers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      address text,
      email text,
      phone text,
      logo_url text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Insert predefined suppliers (if not exists)
INSERT INTO public.suppliers (name, address, email, phone) VALUES
  ('Niah Foods', '', '', ''),
  ('AJC International', '', '', ''),
  ('J Marr (Seafoods) Limited', 'Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE', 'seafoods@marsea.co.uk', '+441482642302'),
  ('JAB Bros Company LLC', '', '', ''),
  ('Nowaco', '', '', ''),
  ('Seapro SAS', '', '', '')
ON CONFLICT (name) DO NOTHING;

-- Add file_url column to quotes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'file_url') THEN
    ALTER TABLE public.quotes ADD COLUMN file_url text;
  END IF;
END $$;