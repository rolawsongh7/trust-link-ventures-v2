-- Add tracking fields to quotes table for the complete workflow
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS linked_quote_request_id uuid REFERENCES quote_requests(id),
ADD COLUMN IF NOT EXISTS supplier_quote_uploaded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

-- Create index for faster quote number lookups
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quote_requests_quote_number ON quote_requests(quote_number);

-- Add a function to link quotes to quote requests
CREATE OR REPLACE FUNCTION link_quote_to_request(
  p_quote_id uuid,
  p_quote_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record quote_requests;
  result jsonb;
BEGIN
  -- Find the quote request by quote number
  SELECT * INTO request_record
  FROM quote_requests
  WHERE quote_number = p_quote_number
  LIMIT 1;
  
  IF request_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote request not found with quote number: ' || p_quote_number
    );
  END IF;
  
  -- Update the quote with the link
  UPDATE quotes
  SET 
    linked_quote_request_id = request_record.id,
    customer_id = COALESCE(quotes.customer_id, request_record.customer_id),
    customer_email = COALESCE(quotes.customer_email, request_record.lead_email)
  WHERE id = p_quote_id;
  
  -- Update quote request status
  UPDATE quote_requests
  SET status = 'quoted'
  WHERE id = request_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'quote_request_id', request_record.id,
    'customer_id', request_record.customer_id
  );
END;
$$;