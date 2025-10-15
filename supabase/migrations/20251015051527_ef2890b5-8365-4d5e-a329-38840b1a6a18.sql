-- Temporarily disable the quote status validation trigger
ALTER TABLE quotes DISABLE TRIGGER validate_quote_status_trigger;

-- Fix stuck quotes: Reset 'sent' quotes without PDFs back to 'draft'
UPDATE quotes
SET status = 'draft'
WHERE status = 'sent'
  AND (final_file_url IS NULL OR final_file_url = '');

-- Re-enable the trigger
ALTER TABLE quotes ENABLE TRIGGER validate_quote_status_trigger;

-- Add a comment for audit trail
COMMENT ON COLUMN quotes.status IS 'Quote status workflow: draft -> (generate PDF) -> pending_review -> (approve) -> approved -> (submit to customer with email) -> sent';