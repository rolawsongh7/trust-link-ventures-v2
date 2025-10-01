-- Update the quotes bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'quotes';