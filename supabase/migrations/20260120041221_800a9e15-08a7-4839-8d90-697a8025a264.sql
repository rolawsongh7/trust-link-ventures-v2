-- Add enhanced payment verification fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_amount_confirmed NUMERIC(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verification_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_mismatch_acknowledged BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_rejected_by UUID;

-- Add payment_rejected to order status enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')) THEN
        ALTER TYPE order_status_enum ADD VALUE 'payment_rejected';
    END IF;
END $$;

-- Create or replace payment verification audit trigger
CREATE OR REPLACE FUNCTION public.log_payment_verification_events()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Log payment verification
  IF NEW.payment_verified_at IS NOT NULL AND (OLD.payment_verified_at IS NULL OR OLD.payment_verified_at IS DISTINCT FROM NEW.payment_verified_at) THEN
    INSERT INTO audit_logs (event_type, resource_type, resource_id, user_id, event_data, severity)
    VALUES (
      'payment_verified', 
      'order', 
      NEW.id, 
      NEW.payment_verified_by,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'amount_confirmed', NEW.payment_amount_confirmed,
        'payment_reference', NEW.payment_reference,
        'payment_method', NEW.payment_method,
        'mismatch_override', COALESCE(NEW.payment_mismatch_acknowledged, false),
        'verification_notes', NEW.payment_verification_notes,
        'total_amount', NEW.total_amount
      ), 
      'info'
    );
  END IF;

  -- Log payment rejection
  IF NEW.payment_rejected_at IS NOT NULL AND (OLD.payment_rejected_at IS NULL OR OLD.payment_rejected_at IS DISTINCT FROM NEW.payment_rejected_at) THEN
    INSERT INTO audit_logs (event_type, resource_type, resource_id, user_id, event_data, severity)
    VALUES (
      'payment_rejected', 
      'order', 
      NEW.id, 
      NEW.payment_rejected_by,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'reason', NEW.payment_status_reason,
        'payment_proof_url', NEW.payment_proof_url
      ), 
      'warning'
    );
  END IF;

  -- Log payment mismatch override
  IF NEW.payment_mismatch_acknowledged = true AND (OLD.payment_mismatch_acknowledged IS NULL OR OLD.payment_mismatch_acknowledged = false) THEN
    INSERT INTO audit_logs (event_type, resource_type, resource_id, user_id, event_data, severity)
    VALUES (
      'payment_mismatch_override', 
      'order', 
      NEW.id, 
      NEW.payment_verified_by,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'invoice_total', NEW.total_amount,
        'amount_received', NEW.payment_amount_confirmed,
        'difference', NEW.total_amount - COALESCE(NEW.payment_amount_confirmed, 0),
        'justification', NEW.payment_verification_notes
      ), 
      'warning'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS payment_verification_audit ON public.orders;
CREATE TRIGGER payment_verification_audit
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_payment_verification_events();