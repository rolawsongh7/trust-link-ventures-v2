-- Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('quote_ready', 'quote_accepted', 'order_confirmed', 'order_shipped', 'order_delivered', 'system')),
  read BOOLEAN DEFAULT false,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.user_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.user_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_read ON public.user_notifications(read);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_user_notifications_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();