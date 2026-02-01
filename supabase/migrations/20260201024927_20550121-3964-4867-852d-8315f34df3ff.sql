-- Phase 4.4: Automation Analytics, Trust & ROI Measurement
-- Creates tables for metrics aggregation and staff feedback

-- Table 1: Pre-aggregated daily metrics for performance tracking
CREATE TABLE public.automation_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  executions INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  affected_entities INTEGER DEFAULT 0,
  customer_notifications_sent INTEGER DEFAULT 0,
  customer_notifications_throttled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rule_id, date)
);

-- Enable RLS
ALTER TABLE automation_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Admin read-only access
CREATE POLICY "Admins can view automation metrics"
  ON automation_metrics_daily FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ));

-- Indexes for efficient queries
CREATE INDEX idx_automation_metrics_date ON automation_metrics_daily(date DESC);
CREATE INDEX idx_automation_metrics_rule ON automation_metrics_daily(rule_id, date DESC);

-- Table 2: Staff feedback for trust signals
CREATE TABLE public.automation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES automation_executions(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'neutral', 'harmful')) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can submit feedback
CREATE POLICY "Admins can create feedback"
  ON automation_feedback FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ));

-- Admins can view feedback
CREATE POLICY "Admins can view feedback"
  ON automation_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ));

-- Index for execution lookups
CREATE INDEX idx_automation_feedback_execution ON automation_feedback(execution_id);
CREATE INDEX idx_automation_feedback_type ON automation_feedback(feedback_type, created_at DESC);

-- Function to aggregate daily metrics (can be called by cron or manually)
CREATE OR REPLACE FUNCTION aggregate_automation_metrics(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO automation_metrics_daily (
    rule_id, 
    date, 
    executions, 
    successes, 
    failures, 
    skipped, 
    affected_entities,
    customer_notifications_sent,
    customer_notifications_throttled
  )
  SELECT 
    rule_id,
    target_date,
    COUNT(*) as executions,
    COUNT(*) FILTER (WHERE status = 'success') as successes,
    COUNT(*) FILTER (WHERE status = 'failure') as failures,
    COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
    COUNT(DISTINCT entity_id) as affected_entities,
    COUNT(*) FILTER (WHERE (result->>'customerNotified')::boolean = true) as customer_notifications_sent,
    COUNT(*) FILTER (WHERE (result->>'throttled')::boolean = true) as customer_notifications_throttled
  FROM automation_executions
  WHERE executed_at::date = target_date
  GROUP BY rule_id
  ON CONFLICT (rule_id, date) DO UPDATE SET
    executions = EXCLUDED.executions,
    successes = EXCLUDED.successes,
    failures = EXCLUDED.failures,
    skipped = EXCLUDED.skipped,
    affected_entities = EXCLUDED.affected_entities,
    customer_notifications_sent = EXCLUDED.customer_notifications_sent,
    customer_notifications_throttled = EXCLUDED.customer_notifications_throttled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;