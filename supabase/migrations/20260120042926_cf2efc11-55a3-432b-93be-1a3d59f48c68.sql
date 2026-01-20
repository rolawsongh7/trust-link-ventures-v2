-- Add payment clarification fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_clarification_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_clarification_message text;

-- Create a function to protect payment verification fields from non-admin modification
CREATE OR REPLACE FUNCTION public.protect_payment_verification_fields()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the user's role from profiles
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- If not an admin, prevent changes to payment verification fields
  IF user_role IS DISTINCT FROM 'admin' THEN
    IF NEW.payment_verified_at IS DISTINCT FROM OLD.payment_verified_at
       OR NEW.payment_verified_by IS DISTINCT FROM OLD.payment_verified_by
       OR NEW.payment_amount_confirmed IS DISTINCT FROM OLD.payment_amount_confirmed
       OR NEW.payment_rejected_at IS DISTINCT FROM OLD.payment_rejected_at
       OR NEW.payment_rejected_by IS DISTINCT FROM OLD.payment_rejected_by
       OR NEW.payment_verification_notes IS DISTINCT FROM OLD.payment_verification_notes THEN
      RAISE EXCEPTION 'Only administrators can modify payment verification fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment verification field protection
DROP TRIGGER IF EXISTS protect_payment_verification_fields_trigger ON public.orders;
CREATE TRIGGER protect_payment_verification_fields_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.protect_payment_verification_fields();

-- Add comment for documentation
COMMENT ON FUNCTION public.protect_payment_verification_fields() IS 'Prevents non-admin users from modifying payment verification fields on orders';