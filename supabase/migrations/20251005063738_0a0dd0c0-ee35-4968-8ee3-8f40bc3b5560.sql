-- Update product name to Turkey Tails with proper capitalization
UPDATE supplier_products 
SET 
  name = 'Turkey Tails',
  updated_at = now()
WHERE name ILIKE 'turkey tails' OR slug ILIKE '%turkey-tail%';