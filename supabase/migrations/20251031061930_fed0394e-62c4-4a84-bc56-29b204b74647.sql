-- Phase 3: Delete draft duplicate quote
-- This is safe because it's a draft (never sent to customer) with no pricing
DELETE FROM quotes 
WHERE id = 'b6894f16-a007-4483-a832-897c8d38dd5d'
AND quote_number = 'Q-1761444884307'
AND status = 'draft'
AND total_amount = 0;

-- Phase 2.1: Add unique index to prevent future duplicate linked quotes
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_unique_linked_request 
ON public.quotes (linked_quote_request_id) 
WHERE linked_quote_request_id IS NOT NULL;

-- Add helpful comment
COMMENT ON INDEX idx_quotes_unique_linked_request IS 
'Ensures only one quote can be linked to each quote request. Prevents duplicate quote assignments while allowing multiple unlinked quotes for backwards compatibility.';