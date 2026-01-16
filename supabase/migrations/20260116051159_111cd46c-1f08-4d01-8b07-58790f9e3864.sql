-- Create customer_favorites table for the Favorites & Fast Reorder feature
CREATE TABLE public.customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate favorites
  CONSTRAINT unique_customer_product_favorite UNIQUE (customer_id, product_id)
);

-- Create index for fast lookups by customer
CREATE INDEX idx_customer_favorites_customer_id ON public.customer_favorites(customer_id);
CREATE INDEX idx_customer_favorites_product_id ON public.customer_favorites(product_id);

-- Enable RLS
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

-- Customers can view their own favorites
CREATE POLICY "Customers can view own favorites"
ON public.customer_favorites
FOR SELECT
TO authenticated
USING (
  -- Admin can view all
  check_user_role(auth.uid(), 'admin')
  OR
  -- Customer can view their own favorites via customer_users link
  customer_id IN (
    SELECT cu.customer_id 
    FROM customer_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- Customers can add favorites
CREATE POLICY "Customers can add own favorites"
ON public.customer_favorites
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin can insert for any customer
  check_user_role(auth.uid(), 'admin')
  OR
  -- Customer can only add favorites for their own customer account
  customer_id IN (
    SELECT cu.customer_id 
    FROM customer_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- Customers can remove their own favorites
CREATE POLICY "Customers can remove own favorites"
ON public.customer_favorites
FOR DELETE
TO authenticated
USING (
  -- Admin can delete any
  check_user_role(auth.uid(), 'admin')
  OR
  -- Customer can only delete their own favorites
  customer_id IN (
    SELECT cu.customer_id 
    FROM customer_users cu
    WHERE cu.user_id = auth.uid()
  )
);