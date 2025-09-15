-- Create magic link tokens table
CREATE TABLE public.magic_link_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL,
  supplier_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "System can manage magic link tokens"
ON public.magic_link_tokens
FOR ALL
USING (true);

-- Create index for token lookup
CREATE INDEX idx_magic_link_tokens_token ON public.magic_link_tokens(token);
CREATE INDEX idx_magic_link_tokens_rfq_id ON public.magic_link_tokens(rfq_id);

-- Create quote submissions table for magic link responses
CREATE TABLE public.quote_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL,
  supplier_email TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_company TEXT,
  quote_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  delivery_date DATE,
  validity_days INTEGER DEFAULT 30,
  notes TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  magic_token TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for quote submissions
CREATE POLICY "Anyone can insert quote submissions"
ON public.quote_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view quote submissions"
ON public.quote_submissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update quote submissions"
ON public.quote_submissions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_quote_submissions_rfq_id ON public.quote_submissions(rfq_id);
CREATE INDEX idx_quote_submissions_magic_token ON public.quote_submissions(magic_token);
CREATE INDEX idx_quote_submissions_status ON public.quote_submissions(status);