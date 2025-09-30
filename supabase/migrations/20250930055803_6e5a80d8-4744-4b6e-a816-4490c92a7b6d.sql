-- Add quote_number column to quote_requests table if it doesn't exist
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- Create function to generate quote request numbers
CREATE OR REPLACE FUNCTION public.generate_quote_request_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  quote_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM quote_requests
  WHERE quote_number LIKE 'QR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-%';
  
  quote_number := 'QR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN quote_number;
END;
$$;

-- Create trigger to auto-generate quote numbers on insert
CREATE OR REPLACE FUNCTION public.set_quote_request_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := public.generate_quote_request_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for quote_requests table
DROP TRIGGER IF EXISTS trigger_set_quote_request_number ON quote_requests;
CREATE TRIGGER trigger_set_quote_request_number
  BEFORE INSERT ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quote_request_number();