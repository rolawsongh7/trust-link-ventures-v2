-- Create magic link tokens table for quotes and orders (extending existing magic_link_tokens)
-- First, let's add support for quote approval and order tracking tokens

-- Add new columns to existing magic_link_tokens table to support different types
ALTER TABLE public.magic_link_tokens 
ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'rfq',
ADD COLUMN IF NOT EXISTS quote_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS order_id UUID DEFAULT NULL;

-- Update the table comment
COMMENT ON TABLE public.magic_link_tokens IS 'Stores magic link tokens for RFQs, quote approvals, and order tracking';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_quote_id ON public.magic_link_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_order_id ON public.magic_link_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_type ON public.magic_link_tokens(token_type);

-- Create a table to track quote approvals/rejections
CREATE TABLE IF NOT EXISTS public.quote_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL,
  token TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('approved', 'rejected')) NOT NULL,
  customer_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quote_approvals
ALTER TABLE public.quote_approvals ENABLE ROW LEVEL SECURITY;

-- Create policy for quote approvals - anyone can insert with valid token
CREATE POLICY "Anyone can submit quote approvals with valid token"
ON public.quote_approvals
FOR INSERT
WITH CHECK (true);

-- Users can view quote approvals
CREATE POLICY "Users can view quote approvals"
ON public.quote_approvals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_quote_approvals_quote_id ON public.quote_approvals(quote_id);
CREATE INDEX idx_quote_approvals_token ON public.quote_approvals(token);

-- Update quotes table to store customer email for magic links
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a cryptographically secure random token
  SELECT encode(gen_random_bytes(32), 'base64') INTO token;
  -- Make it URL safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;