-- Add pricing columns to supplier_products table
ALTER TABLE public.supplier_products 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS price_updated_by UUID REFERENCES auth.users(id);

-- Create price history table for audit trail
CREATE TABLE IF NOT EXISTS public.supplier_product_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  old_cost_price DECIMAL(10,2),
  new_cost_price DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT
);

-- Enable RLS on price history table
ALTER TABLE public.supplier_product_price_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for price history (admin only)
CREATE POLICY "Admins can view price history"
ON public.supplier_product_price_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can insert price history"
ON public.supplier_product_price_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON public.supplier_product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON public.supplier_product_price_history(changed_at DESC);

-- Create trigger function to log price changes
CREATE OR REPLACE FUNCTION public.log_supplier_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if price actually changed
  IF (OLD.unit_price IS DISTINCT FROM NEW.unit_price) OR (OLD.cost_price IS DISTINCT FROM NEW.cost_price) THEN
    INSERT INTO public.supplier_product_price_history (
      product_id,
      old_price,
      new_price,
      old_cost_price,
      new_cost_price,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.unit_price,
      NEW.unit_price,
      OLD.cost_price,
      NEW.cost_price,
      NEW.price_updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on supplier_products
DROP TRIGGER IF EXISTS trigger_log_price_change ON public.supplier_products;
CREATE TRIGGER trigger_log_price_change
AFTER UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.log_supplier_product_price_change();