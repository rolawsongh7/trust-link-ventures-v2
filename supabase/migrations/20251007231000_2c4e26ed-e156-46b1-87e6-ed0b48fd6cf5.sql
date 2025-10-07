-- Phase 1: Prevent Duplicate Orders from Quote Status Regression
CREATE OR REPLACE FUNCTION public.auto_convert_quote_to_order()
RETURNS TRIGGER AS $$
DECLARE
  order_id UUID;
  quote_item RECORD;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Check if order already exists for this quote
    IF EXISTS (SELECT 1 FROM orders WHERE quote_id = NEW.id) THEN
      RAISE NOTICE 'Order already exists for quote %, skipping duplicate creation', NEW.quote_number;
      RETURN NEW;
    END IF;
    
    INSERT INTO orders (
      quote_id,
      customer_id,
      order_number,
      total_amount,
      currency,
      status,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      generate_order_number(),
      NEW.total_amount,
      NEW.currency,
      'pending_payment',
      'Auto-generated from accepted quote: ' || NEW.quote_number,
      auth.uid()
    ) RETURNING id INTO order_id;

    FOR quote_item IN 
      SELECT * FROM quote_items WHERE quote_id = NEW.id
    LOOP
      INSERT INTO order_items (
        order_id,
        product_name,
        product_description,
        quantity,
        unit,
        unit_price,
        total_price,
        specifications
      ) VALUES (
        order_id,
        quote_item.product_name,
        quote_item.product_description,
        quote_item.quantity,
        quote_item.unit,
        quote_item.unit_price,
        quote_item.total_price,
        quote_item.specifications
      );
    END LOOP;

    PERFORM log_security_event(
      'quote_converted_to_order',
      auth.uid(),
      jsonb_build_object(
        'quote_id', NEW.id,
        'order_id', order_id,
        'quote_number', NEW.quote_number
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 2: Add Status Validation Functions
CREATE OR REPLACE FUNCTION public.validate_quote_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["sent"],
    "sent": ["accepted", "rejected"],
    "accepted": [],
    "rejected": []
  }'::jsonb;
BEGIN
  IF OLD.status IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NOT (valid_transitions->OLD.status ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid quote status transition: % → %. Valid transitions from % are: %',
      OLD.status, NEW.status, OLD.status, valid_transitions->OLD.status
      USING HINT = 'Contact administrator if you need to override this validation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions jsonb := '{
    "order_confirmed": ["pending_payment", "cancelled"],
    "pending_payment": ["payment_received", "cancelled"],
    "payment_received": ["processing", "cancelled"],
    "processing": ["ready_to_ship", "cancelled"],
    "ready_to_ship": ["shipped", "cancelled"],
    "shipped": ["delivered", "delivery_failed"],
    "delivered": [],
    "cancelled": [],
    "delivery_failed": ["shipped"]
  }'::jsonb;
BEGIN
  IF OLD.status IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NOT (valid_transitions->OLD.status ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %. Valid transitions from % are: %',
      OLD.status, NEW.status, OLD.status, valid_transitions->OLD.status
      USING HINT = 'Orders can only progress forward. Contact administrator if you need to cancel or modify this order.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_quote_status_trigger ON public.quotes;
CREATE TRIGGER validate_quote_status_trigger
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_quote_status_transition();

DROP TRIGGER IF EXISTS validate_order_status_trigger ON public.orders;
CREATE TRIGGER validate_order_status_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status_transition();

-- Phase 3: Add Status History Tracking
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT valid_status_change CHECK (old_status IS NULL OR old_status != new_status)
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at DESC);

CREATE TABLE IF NOT EXISTS public.quote_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT valid_status_change CHECK (old_status IS NULL OR old_status != new_status)
);

CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote_id ON quote_status_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_status_history_changed_at ON quote_status_history(changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO quote_status_history (
      quote_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_order_status_change_trigger ON public.orders;
CREATE TRIGGER log_order_status_change_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS log_quote_status_change_trigger ON public.quotes;
CREATE TRIGGER log_quote_status_change_trigger
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_quote_status_change();

-- Phase 5: Add RLS Policies for Status History Tables
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all order status history" ON public.order_status_history;
CREATE POLICY "Admins can view all order status history"
  ON public.order_status_history FOR SELECT
  USING (check_user_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert order status history" ON public.order_status_history;
CREATE POLICY "System can insert order status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all quote status history" ON public.quote_status_history;
CREATE POLICY "Admins can view all quote status history"
  ON public.quote_status_history FOR SELECT
  USING (check_user_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert quote status history" ON public.quote_status_history;
CREATE POLICY "System can insert quote status history"
  ON public.quote_status_history FOR INSERT
  WITH CHECK (true);