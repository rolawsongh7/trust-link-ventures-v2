-- Update existing quotes to link them to quote requests by matching customer email
UPDATE quotes
SET linked_quote_request_id = quote_requests.id
FROM quote_requests
WHERE quotes.linked_quote_request_id IS NULL
  AND quotes.customer_email IS NOT NULL
  AND quotes.customer_email = quote_requests.lead_email
  AND quote_requests.status IN ('pending', 'quoted', 'approved');