-- Update quote_requests to auto-generate quote numbers for existing records without them
UPDATE quote_requests 
SET quote_number = 'QR-' || TO_CHAR(created_at, 'YYYYMM') || '-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE quote_number IS NULL;