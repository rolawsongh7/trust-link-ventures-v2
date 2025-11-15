-- Create notifications table for real-time quote notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quote_view_analytics table for tracking customer quote views
CREATE TABLE IF NOT EXISTS quote_view_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration INTEGER, -- seconds
  sections_viewed JSONB DEFAULT '[]'::jsonb,
  user_agent TEXT,
  ip_address INET
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_view_analytics_quote_id ON quote_view_analytics(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_view_analytics_viewed_at ON quote_view_analytics(viewed_at DESC);

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_view_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for quote_view_analytics
CREATE POLICY "Admins can view all quote view analytics"
  ON quote_view_analytics FOR SELECT
  USING (check_user_role(auth.uid(), 'admin'::text));

CREATE POLICY "System can insert quote view analytics"
  ON quote_view_analytics FOR INSERT
  WITH CHECK (true);

-- Update audit_logs RLS to allow public quote view access logging
CREATE POLICY "Public quote views can log access"
  ON audit_logs FOR INSERT
  WITH CHECK (event_type = 'quote_viewed' OR auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER TABLE notifications REPLICA IDENTITY FULL;