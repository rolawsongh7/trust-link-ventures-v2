-- Update product name from Rabo to Pork Tail
UPDATE supplier_products 
SET 
  name = 'Pork Tail',
  slug = 'jab-brothers-seafood-pork-tail',
  updated_at = now()
WHERE slug = 'jab-brothers-seafood-rabo';