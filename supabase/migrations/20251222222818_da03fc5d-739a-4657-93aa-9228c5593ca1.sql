-- Add soft delete columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add index for efficient filtering of active quotes
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON public.quotes (deleted_at) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.quotes.deleted_at IS 'Timestamp when quote was soft deleted. NULL means active quote.';
COMMENT ON COLUMN public.quotes.deleted_by IS 'User ID who performed the soft delete.';