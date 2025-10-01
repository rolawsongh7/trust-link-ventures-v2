-- Create email_logs table to track all email delivery attempts
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  resend_id TEXT,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view email logs"
  ON public.email_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update email logs"
  ON public.email_logs
  FOR UPDATE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_quote_id ON public.email_logs(quote_id);
CREATE INDEX idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();