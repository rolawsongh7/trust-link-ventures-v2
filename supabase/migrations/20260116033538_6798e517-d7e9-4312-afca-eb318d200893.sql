-- Fix the broken quote by copying items from quote_request_items
INSERT INTO public.quote_items (quote_id, product_name, quantity, unit, unit_price, total_price, product_description, specifications)
SELECT 
  '21f6f052-a355-4010-a47f-cd48c0d8cf42' as quote_id,
  qri.product_name,
  qri.quantity,
  qri.unit,
  0 as unit_price,
  0 as total_price,
  qri.specifications as product_description,
  qri.preferred_grade as specifications
FROM quote_request_items qri
WHERE qri.quote_request_id = 'fa02c5cc-f44a-4b6e-b0bc-f7267b35e4b7'
AND NOT EXISTS (
  SELECT 1 FROM quote_items qi WHERE qi.quote_id = '21f6f052-a355-4010-a47f-cd48c0d8cf42'
);