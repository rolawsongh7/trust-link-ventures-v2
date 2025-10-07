-- Enable Realtime for key tables that aren't already enabled
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.quote_requests REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_history REPLICA IDENTITY FULL;

-- Add tables to realtime publication (skip quotes as it's already there)
DO $$
BEGIN
  -- Only add if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'quote_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_history;
  END IF;
END $$;