-- Fix search_path security issue for generate_quote_request_number function
CREATE OR REPLACE FUNCTION public.generate_quote_request_number()
RETURNS TEXT AS $$
DECLARE
  counter INTEGER;
  generated_quote_number TEXT;
BEGIN
  -- Get the next counter for this month
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_requests.quote_number FROM 'QR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM quote_requests
  WHERE quote_requests.quote_number LIKE 'QR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-%';
  
  -- Generate the quote number
  generated_quote_number := 'QR-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN generated_quote_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;