-- Phase 1: Partial Payment & Balance Reconciliation Workflow Schema Changes

-- 1.1 Create payment_status enum
CREATE TYPE public.payment_status_enum AS ENUM (
  'unpaid',
  'partially_paid', 
  'fully_paid',
  'overpaid'
);

-- 1.2 Create payment_type enum for ledger-style tracking
CREATE TYPE public.payment_type_enum AS ENUM (
  'deposit',
  'balance',
  'adjustment',
  'refund'
);

-- 1.3 Add payment_status column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status public.payment_status_enum DEFAULT 'unpaid';

-- 1.4 Add computed balance_remaining column for convenience
-- Using a regular column since GENERATED columns with COALESCE can be tricky
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC(12,2) DEFAULT 0;

-- 1.5 Enhance payment_records table with payment_type and verification fields
ALTER TABLE public.payment_records 
  ADD COLUMN IF NOT EXISTS payment_type public.payment_type_enum DEFAULT 'deposit',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 1.6 Backfill payment_status based on current payment data
UPDATE public.orders SET payment_status = 
  CASE 
    WHEN payment_amount_confirmed IS NULL OR payment_amount_confirmed = 0 THEN 'unpaid'::public.payment_status_enum
    WHEN payment_amount_confirmed < total_amount THEN 'partially_paid'::public.payment_status_enum
    WHEN payment_amount_confirmed >= total_amount THEN 'fully_paid'::public.payment_status_enum
    ELSE 'unpaid'::public.payment_status_enum
  END
WHERE payment_status IS NULL OR payment_status = 'unpaid'::public.payment_status_enum;

-- 1.7 Backfill balance_remaining
UPDATE public.orders SET balance_remaining = 
  GREATEST(0, total_amount - COALESCE(payment_amount_confirmed, 0));

-- 1.8 Create trigger to auto-update balance_remaining when payment_amount_confirmed changes
CREATE OR REPLACE FUNCTION public.update_order_balance_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_remaining := GREATEST(0, NEW.total_amount - COALESCE(NEW.payment_amount_confirmed, 0));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_balance_remaining ON public.orders;
CREATE TRIGGER trigger_update_balance_remaining
BEFORE INSERT OR UPDATE OF payment_amount_confirmed, total_amount ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_order_balance_remaining();

-- 1.9 Create trigger to auto-update payment_status based on payment amounts
CREATE OR REPLACE FUNCTION public.update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-update if payment_amount_confirmed changed
  IF (TG_OP = 'UPDATE' AND OLD.payment_amount_confirmed IS DISTINCT FROM NEW.payment_amount_confirmed) 
     OR TG_OP = 'INSERT' THEN
    IF NEW.payment_amount_confirmed IS NULL OR NEW.payment_amount_confirmed = 0 THEN
      NEW.payment_status := 'unpaid'::public.payment_status_enum;
    ELSIF NEW.payment_amount_confirmed < NEW.total_amount THEN
      NEW.payment_status := 'partially_paid'::public.payment_status_enum;
    ELSIF NEW.payment_amount_confirmed >= NEW.total_amount THEN
      NEW.payment_status := 'fully_paid'::public.payment_status_enum;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_status ON public.orders;
CREATE TRIGGER trigger_update_payment_status
BEFORE INSERT OR UPDATE OF payment_amount_confirmed ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_order_payment_status();

-- 1.10 Create audit trigger for payment_status changes
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.audit_logs (
      event_type,
      resource_type,
      resource_id,
      severity,
      event_data
    ) VALUES (
      CASE NEW.payment_status
        WHEN 'partially_paid' THEN 'deposit_verified'
        WHEN 'fully_paid' THEN 'order_fully_paid'
        ELSE 'payment_status_changed'
      END,
      'order',
      NEW.id,
      'info',
      jsonb_build_object(
        'old_status', OLD.payment_status::text,
        'new_status', NEW.payment_status::text,
        'amount_confirmed', NEW.payment_amount_confirmed,
        'total_amount', NEW.total_amount,
        'balance_remaining', NEW.balance_remaining
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_status_audit ON public.orders;
CREATE TRIGGER trigger_payment_status_audit
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_payment_status_change();

-- 1.11 Create trigger to auto-resolve payment notifications when fully paid
CREATE OR REPLACE FUNCTION public.resolve_payment_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'fully_paid'::public.payment_status_enum 
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'fully_paid'::public.payment_status_enum) THEN
    UPDATE public.user_notifications
    SET resolved = TRUE, resolved_at = NOW()
    WHERE entity_id = NEW.id 
      AND entity_type = 'order'
      AND type IN ('balance_requested', 'payment_required', 'balance_payment_request', 'payment_needed')
      AND resolved = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_resolve_payment_notifications ON public.orders;
CREATE TRIGGER trigger_resolve_payment_notifications
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.resolve_payment_notifications();

-- 1.12 Add index for efficient querying by payment_status
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 1.13 Update existing payment_records to have payment_type based on sequence
-- First payment per order is 'deposit', subsequent ones are 'balance'
WITH ranked_payments AS (
  SELECT 
    id,
    order_id,
    ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at) as rn
  FROM public.payment_records
  WHERE payment_type IS NULL OR payment_type = 'deposit'
)
UPDATE public.payment_records pr
SET payment_type = CASE 
  WHEN rp.rn = 1 THEN 'deposit'::public.payment_type_enum
  ELSE 'balance'::public.payment_type_enum
END
FROM ranked_payments rp
WHERE pr.id = rp.id;