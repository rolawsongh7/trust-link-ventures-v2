-- Phase 1: Payment Verification Hardening

-- 1A: Add payment_date column to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- 1C: Add amount_paid to invoices for partial payment tracking
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 1C: Create payment_records table for tracking multiple payments
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_records
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_records (admin only)
CREATE POLICY "Admins can view all payment records"
ON payment_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can insert payment records"
ON payment_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update payment records"
ON payment_records FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_invoice_id ON payment_records(invoice_id);

-- Add comment for documentation
COMMENT ON TABLE payment_records IS 'Tracks individual payment records for orders, supporting partial payments';
COMMENT ON COLUMN orders.payment_date IS 'The actual date the payment was made (as entered during verification)';