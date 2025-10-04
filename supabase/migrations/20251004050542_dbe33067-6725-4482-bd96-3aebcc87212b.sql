-- Deactivate the two Mackerel products from JAB Brothers
UPDATE supplier_products 
SET is_active = false 
WHERE supplier = 'JAB Brothers' 
  AND name = 'Mackerel' 
  AND category = 'Seafood';