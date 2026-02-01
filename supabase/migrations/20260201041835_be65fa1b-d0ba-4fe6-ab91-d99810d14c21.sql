-- Phase 5.3: Subscriptions & Standing Orders
-- Conservative, opt-in, non-disruptive design
-- Subscriptions create INTENT (draft orders), not automatic execution

-- =============================================
-- 1. STANDING ORDERS TABLE
-- =============================================

CREATE TABLE public.standing_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Standing order details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Schedule configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, for weekly/biweekly
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28), -- for monthly/quarterly
  
  -- Next scheduled date
  next_scheduled_date DATE NOT NULL,
  last_generated_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  paused_at TIMESTAMP WITH TIME ZONE,
  paused_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_reason TEXT,
  
  -- Approval settings
  requires_approval BOOLEAN NOT NULL DEFAULT true, -- Draft orders need admin approval
  auto_use_credit BOOLEAN NOT NULL DEFAULT false, -- If true, attempt credit on approval
  
  -- Tracking
  total_orders_generated INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 2. STANDING ORDER ITEMS TABLE
-- =============================================

CREATE TABLE public.standing_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  standing_order_id UUID NOT NULL REFERENCES public.standing_orders(id) ON DELETE CASCADE,
  
  -- Product info (snapshot at creation, can be updated)
  product_id UUID REFERENCES public.supplier_products(id),
  product_name TEXT NOT NULL,
  product_description TEXT,
  
  -- Quantity and pricing
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'MT',
  unit_price NUMERIC(15,2), -- Optional: if null, use current product price
  
  -- Customization
  grade TEXT,
  specifications TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 3. STANDING ORDER GENERATION LOG
-- =============================================

CREATE TABLE public.standing_order_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  standing_order_id UUID NOT NULL REFERENCES public.standing_orders(id) ON DELETE CASCADE,
  
  -- Generated order reference
  order_id UUID REFERENCES public.orders(id),
  quote_id UUID REFERENCES public.quotes(id),
  
  -- Generation details
  scheduled_date DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generation_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (generation_type IN ('scheduled', 'manual', 'retry')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  failure_reason TEXT,
  skipped_reason TEXT,
  
  -- Amounts
  estimated_amount NUMERIC(15,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 4. INDEXES
-- =============================================

CREATE INDEX idx_standing_orders_customer ON public.standing_orders(customer_id);
CREATE INDEX idx_standing_orders_status ON public.standing_orders(status);
CREATE INDEX idx_standing_orders_next_scheduled ON public.standing_orders(next_scheduled_date) WHERE status = 'active';
CREATE INDEX idx_standing_order_items_order ON public.standing_order_items(standing_order_id);
CREATE INDEX idx_standing_order_generations_order ON public.standing_order_generations(standing_order_id);
CREATE INDEX idx_standing_order_generations_date ON public.standing_order_generations(scheduled_date);

-- =============================================
-- 5. RLS POLICIES
-- =============================================

ALTER TABLE public.standing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_order_generations ENABLE ROW LEVEL SECURITY;

-- Staff (admin/super_admin) can manage all standing orders
CREATE POLICY "Staff can manage standing orders"
ON public.standing_orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Customers can view their own standing orders
CREATE POLICY "Customers can view own standing orders"
ON public.standing_orders FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT cu.customer_id FROM public.customer_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- Similar policies for items
CREATE POLICY "Staff can manage standing order items"
ON public.standing_order_items FOR ALL
TO authenticated
USING (
  standing_order_id IN (
    SELECT so.id FROM public.standing_orders so
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  standing_order_id IN (
    SELECT so.id FROM public.standing_orders so
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
);

CREATE POLICY "Customers can view own standing order items"
ON public.standing_order_items FOR SELECT
TO authenticated
USING (
  standing_order_id IN (
    SELECT so.id FROM public.standing_orders so
    WHERE so.customer_id IN (
      SELECT cu.customer_id FROM public.customer_users cu
      WHERE cu.user_id = auth.uid()
    )
  )
);

-- Generation log policies
CREATE POLICY "Staff can view all generations"
ON public.standing_order_generations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Staff can insert generations"
ON public.standing_order_generations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Customers can view own generations"
ON public.standing_order_generations FOR SELECT
TO authenticated
USING (
  standing_order_id IN (
    SELECT so.id FROM public.standing_orders so
    WHERE so.customer_id IN (
      SELECT cu.customer_id FROM public.customer_users cu
      WHERE cu.user_id = auth.uid()
    )
  )
);

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Calculate next scheduled date based on frequency
CREATE OR REPLACE FUNCTION public.calculate_next_schedule_date(
  p_frequency TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_date DATE;
BEGIN
  CASE p_frequency
    WHEN 'weekly' THEN
      -- Find next occurrence of day_of_week
      v_next_date := p_from_date + ((p_day_of_week - EXTRACT(DOW FROM p_from_date)::INTEGER + 7) % 7);
      IF v_next_date <= p_from_date THEN
        v_next_date := v_next_date + 7;
      END IF;
      
    WHEN 'biweekly' THEN
      v_next_date := p_from_date + ((p_day_of_week - EXTRACT(DOW FROM p_from_date)::INTEGER + 7) % 7);
      IF v_next_date <= p_from_date THEN
        v_next_date := v_next_date + 14;
      END IF;
      
    WHEN 'monthly' THEN
      -- Find day_of_month in current or next month
      v_next_date := DATE_TRUNC('month', p_from_date) + (p_day_of_month - 1);
      IF v_next_date <= p_from_date THEN
        v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month') + (p_day_of_month - 1);
      END IF;
      
    WHEN 'quarterly' THEN
      -- Find day_of_month in current or next quarter
      v_next_date := DATE_TRUNC('quarter', p_from_date) + (p_day_of_month - 1);
      IF v_next_date <= p_from_date THEN
        v_next_date := DATE_TRUNC('quarter', p_from_date + INTERVAL '3 months') + (p_day_of_month - 1);
      END IF;
      
    ELSE
      v_next_date := p_from_date + 30; -- Fallback to 30 days
  END CASE;
  
  RETURN v_next_date;
END;
$$;

-- =============================================
-- 7. GENERATE DRAFT ORDER FROM STANDING ORDER
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_order_from_standing_order(
  p_standing_order_id UUID,
  p_generation_type TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_standing_order RECORD;
  v_item RECORD;
  v_quote_id UUID;
  v_quote_number TEXT;
  v_total_amount NUMERIC := 0;
  v_item_count INTEGER := 0;
BEGIN
  -- Lock and fetch standing order
  SELECT * INTO v_standing_order
  FROM standing_orders
  WHERE id = p_standing_order_id
  FOR UPDATE;
  
  IF v_standing_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Standing order not found');
  END IF;
  
  IF v_standing_order.status != 'active' THEN
    -- Log as skipped
    INSERT INTO standing_order_generations (
      standing_order_id, scheduled_date, generation_type, status, skipped_reason
    ) VALUES (
      p_standing_order_id, CURRENT_DATE, p_generation_type, 'skipped', 
      'Standing order is ' || v_standing_order.status
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'Standing order is not active');
  END IF;
  
  -- Generate quote number
  v_quote_number := 'QSO-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
                    LPAD((FLOOR(RANDOM() * 10000))::TEXT, 4, '0');
  
  -- Create draft quote (not order - quotes go through normal approval)
  INSERT INTO quotes (
    customer_id,
    quote_number,
    status,
    currency,
    notes,
    created_by
  ) VALUES (
    v_standing_order.customer_id,
    v_quote_number,
    'draft',
    'GHS',
    'Auto-generated from standing order: ' || v_standing_order.name,
    auth.uid()
  )
  RETURNING id INTO v_quote_id;
  
  -- Add items from standing order
  FOR v_item IN 
    SELECT * FROM standing_order_items
    WHERE standing_order_id = p_standing_order_id
  LOOP
    -- Get current price if not set
    DECLARE
      v_unit_price NUMERIC;
    BEGIN
      IF v_item.unit_price IS NOT NULL THEN
        v_unit_price := v_item.unit_price;
      ELSE
        SELECT price INTO v_unit_price
        FROM supplier_products
        WHERE id = v_item.product_id;
        
        v_unit_price := COALESCE(v_unit_price, 0);
      END IF;
      
      INSERT INTO quote_items (
        quote_id,
        product_name,
        product_description,
        quantity,
        unit,
        unit_price,
        total_price,
        grade
      ) VALUES (
        v_quote_id,
        v_item.product_name,
        v_item.product_description,
        v_item.quantity,
        v_item.unit,
        v_unit_price,
        v_unit_price * v_item.quantity,
        v_item.grade
      );
      
      v_total_amount := v_total_amount + (v_unit_price * v_item.quantity);
      v_item_count := v_item_count + 1;
    END;
  END LOOP;
  
  -- Update quote totals
  UPDATE quotes SET
    subtotal = v_total_amount,
    total_amount = v_total_amount,
    updated_at = now()
  WHERE id = v_quote_id;
  
  -- Log the generation
  INSERT INTO standing_order_generations (
    standing_order_id,
    quote_id,
    scheduled_date,
    generation_type,
    status,
    estimated_amount
  ) VALUES (
    p_standing_order_id,
    v_quote_id,
    CURRENT_DATE,
    p_generation_type,
    'success',
    v_total_amount
  );
  
  -- Update standing order tracking
  UPDATE standing_orders SET
    last_generated_date = CURRENT_DATE,
    next_scheduled_date = calculate_next_schedule_date(
      v_standing_order.frequency,
      v_standing_order.day_of_week,
      v_standing_order.day_of_month,
      CURRENT_DATE
    ),
    total_orders_generated = total_orders_generated + 1,
    updated_at = now()
  WHERE id = p_standing_order_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action,
    event_data, severity, user_id
  ) VALUES (
    'standing_order_generated', 'standing_orders', p_standing_order_id::text, 'generate',
    jsonb_build_object(
      'standing_order_name', v_standing_order.name,
      'quote_id', v_quote_id,
      'quote_number', v_quote_number,
      'estimated_amount', v_total_amount,
      'item_count', v_item_count,
      'generation_type', p_generation_type
    ),
    'medium', auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', v_quote_id,
    'quote_number', v_quote_number,
    'estimated_amount', v_total_amount,
    'item_count', v_item_count,
    'next_scheduled_date', (
      SELECT next_scheduled_date FROM standing_orders WHERE id = p_standing_order_id
    )
  );
END;
$$;

-- =============================================
-- 8. PAUSE/RESUME/CANCEL STANDING ORDER
-- =============================================

CREATE OR REPLACE FUNCTION public.update_standing_order_status(
  p_standing_order_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Validate status
  IF p_status NOT IN ('active', 'paused', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;
  
  SELECT status INTO v_old_status
  FROM standing_orders
  WHERE id = p_standing_order_id;
  
  IF v_old_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Standing order not found');
  END IF;
  
  -- Cannot reactivate cancelled orders
  IF v_old_status = 'cancelled' AND p_status != 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reactivate cancelled standing orders');
  END IF;
  
  -- Update status
  UPDATE standing_orders SET
    status = p_status,
    paused_at = CASE WHEN p_status = 'paused' THEN now() ELSE paused_at END,
    paused_reason = CASE WHEN p_status = 'paused' THEN p_reason ELSE paused_reason END,
    cancelled_at = CASE WHEN p_status = 'cancelled' THEN now() ELSE cancelled_at END,
    cancelled_reason = CASE WHEN p_status = 'cancelled' THEN p_reason ELSE cancelled_reason END,
    next_scheduled_date = CASE 
      WHEN p_status = 'active' AND v_old_status = 'paused' THEN
        calculate_next_schedule_date(
          frequency, day_of_week, day_of_month, CURRENT_DATE
        )
      ELSE next_scheduled_date
    END,
    updated_at = now()
  WHERE id = p_standing_order_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action,
    event_data, severity, user_id
  ) VALUES (
    'standing_order_status_changed', 'standing_orders', p_standing_order_id::text, 'update',
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_status,
      'reason', p_reason
    ),
    'medium', auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', p_status
  );
END;
$$;

-- =============================================
-- 9. UPDATED_AT TRIGGER
-- =============================================

CREATE TRIGGER update_standing_orders_updated_at
  BEFORE UPDATE ON public.standing_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_standing_order_items_updated_at
  BEFORE UPDATE ON public.standing_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();