-- Create a storage bucket for videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for video access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Videos are publicly accessible'
  ) THEN
    CREATE POLICY "Videos are publicly accessible" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'videos');
  END IF;
END $$;

-- Allow authenticated users to upload videos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload videos'
  ) THEN
    CREATE POLICY "Authenticated users can upload videos" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;