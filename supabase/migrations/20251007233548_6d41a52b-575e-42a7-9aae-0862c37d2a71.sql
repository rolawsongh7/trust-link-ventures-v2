-- Phase 3: Add RLS policy to allow anonymous contact form submissions

-- Allow anonymous users to log communications from contact form
CREATE POLICY "Allow contact form submissions"
ON communications
FOR INSERT
TO anon
WITH CHECK (
  communication_type = 'email' 
  AND direction = 'inbound'
  AND subject LIKE 'Contact Form:%'
);

-- Add helpful comment
COMMENT ON POLICY "Allow contact form submissions" ON communications IS 
'Allows anonymous users to submit contact form inquiries which are logged as inbound email communications';