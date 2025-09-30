-- Fix search_path security warnings for the new functions
CREATE OR REPLACE FUNCTION public.generate_quote_request_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.set_quote_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := public.generate_quote_request_number();
  END IF;
  RETURN NEW;
END;
$$;