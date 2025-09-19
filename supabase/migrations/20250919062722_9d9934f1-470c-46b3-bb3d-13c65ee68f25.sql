-- Create cart_items table for persistent cart storage
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_profile_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  specifications TEXT,
  preferred_grade TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_cart_customer_profile 
    FOREIGN KEY (customer_profile_id) 
    REFERENCES public.customer_profiles(id) 
    ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart access
CREATE POLICY "Customers can view their own cart items" 
ON public.cart_items 
FOR SELECT 
USING (
  customer_profile_id IN (
    SELECT id FROM public.customer_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert their own cart items" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (
  customer_profile_id IN (
    SELECT id FROM public.customer_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update their own cart items" 
ON public.cart_items 
FOR UPDATE 
USING (
  customer_profile_id IN (
    SELECT id FROM public.customer_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can delete their own cart items" 
ON public.cart_items 
FOR DELETE 
USING (
  customer_profile_id IN (
    SELECT id FROM public.customer_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_cart_items_customer_profile_id ON public.cart_items(customer_profile_id);