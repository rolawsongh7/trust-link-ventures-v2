-- Add conversion tracking fields to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS conversion_type TEXT CHECK (conversion_type IN ('customer_accepted', 'manual', 'automated'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS conversion_method TEXT CHECK (conversion_method IN ('phone', 'whatsapp', 'in_person', 'email', 'online'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS conversion_notes TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES auth.users(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Add source tracking fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'direct' CHECK (source_type IN ('quote', 'direct', 'rfq'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_quote_id UUID REFERENCES quotes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_confirmation_method TEXT CHECK (manual_confirmation_method IN ('phone', 'whatsapp', 'in_person', 'email'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_confirmation_notes TEXT;

-- Create quote view tokens table for magic links
CREATE TABLE IF NOT EXISTS quote_view_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT generate_secure_token(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_view_tokens_token ON quote_view_tokens(token);
CREATE INDEX IF NOT EXISTS idx_quote_view_tokens_quote_id ON quote_view_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_conversion_type ON quotes(conversion_type);
CREATE INDEX IF NOT EXISTS idx_orders_source_type ON orders(source_type);
CREATE INDEX IF NOT EXISTS idx_orders_source_quote_id ON orders(source_quote_id);

-- Enable RLS on quote_view_tokens
ALTER TABLE quote_view_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_view_tokens
CREATE POLICY "Admins can view all quote view tokens"
  ON quote_view_tokens FOR SELECT
  TO authenticated
  USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert quote view tokens"
  ON quote_view_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update token access times"
  ON quote_view_tokens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE quote_view_tokens IS 'Stores magic link tokens for public quote viewing by unregistered customers';
COMMENT ON COLUMN quotes.conversion_type IS 'How the quote was converted: customer_accepted, manual, or automated';
COMMENT ON COLUMN quotes.conversion_method IS 'Method used for manual conversion: phone, whatsapp, in_person, or email';
COMMENT ON COLUMN orders.source_type IS 'Source of the order: quote, direct, or rfq';
COMMENT ON COLUMN orders.manual_confirmation_method IS 'Method used to confirm manual order creation';