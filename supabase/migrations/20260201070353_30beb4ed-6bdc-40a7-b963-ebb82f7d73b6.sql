-- Phase 5.2: Credit Terms & Deferred Payment (Fix view recreation)

-- 1. Drop existing view first
DROP VIEW IF EXISTS public.customer_credit_ledger;

-- 2. Create credit ledger view with correct structure
CREATE VIEW public.customer_credit_ledger AS
SELECT 
  o.id AS order_id,
  o.order_number,
  o.customer_id,
  o.total_amount,
  o.credit_amount_used,
  o.credit_terms_days,
  o.credit_due_date,
  o.payment_status,
  o.created_at AS order_date,
  CASE 
    WHEN o.credit_due_date < CURRENT_DATE 
         AND o.payment_status NOT IN ('fully_paid', 'overpaid') 
    THEN true 
    ELSE false 
  END AS is_overdue,
  CASE 
    WHEN o.credit_due_date < CURRENT_DATE 
         AND o.payment_status NOT IN ('fully_paid', 'overpaid') 
    THEN CURRENT_DATE - o.credit_due_date
    ELSE 0
  END AS days_overdue,
  cct.credit_limit,
  cct.current_balance,
  cct.net_terms,
  cct.status AS credit_status
FROM orders o
JOIN customer_credit_terms cct ON o.customer_id = cct.customer_id
WHERE o.credit_amount_used IS NOT NULL 
  AND o.credit_amount_used > 0;