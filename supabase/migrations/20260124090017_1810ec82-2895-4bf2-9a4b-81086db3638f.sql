-- Drop the existing check constraint
ALTER TABLE public.user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;

-- Add a more comprehensive check constraint that includes admin notification types
ALTER TABLE public.user_notifications 
ADD CONSTRAINT user_notifications_type_check CHECK (
  type = ANY (ARRAY[
    -- Customer notification types
    'quote_ready'::text, 
    'quote_accepted'::text, 
    'order_confirmed'::text, 
    'order_shipped'::text, 
    'order_delivered'::text, 
    'system'::text,
    -- Admin notification types
    'new_order'::text,
    'new_quote_request'::text,
    'payment_received'::text,
    'payment_pending'::text,
    'order_issue'::text,
    'customer_registered'::text,
    'address_request'::text,
    'low_stock'::text,
    'rfq_submitted'::text,
    'quote_response'::text,
    'delivery_failed'::text,
    'order_cancelled'::text,
    -- General types
    'info'::text,
    'warning'::text,
    'error'::text,
    'success'::text,
    'action_required'::text
  ])
);