-- Update storage policies for videos bucket to ensure public access
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

-- Create proper public access policy for videos
CREATE POLICY "Public video access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos');

-- Create policy for file uploads (authenticated users only)
CREATE POLICY "Authenticated users can upload videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);