-- Create storage bucket for communication attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'communication-attachments',
  'communication-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO NOTHING;

-- Add attachments column to communications table
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for attachments queries
CREATE INDEX IF NOT EXISTS idx_communications_attachments ON communications USING GIN (attachments);

-- RLS policies for the storage bucket
CREATE POLICY "Authenticated users can upload communication attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'communication-attachments');

CREATE POLICY "Anyone can view communication attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'communication-attachments');

CREATE POLICY "Users can delete their own communication attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'communication-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);