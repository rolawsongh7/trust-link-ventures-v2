-- Deactivate beef kidneys incorrectly classified as seafood
UPDATE supplier_products 
SET is_active = false 
WHERE supplier = 'JAB Brothers' 
  AND name = 'Beef Kidneys' 
  AND category = 'Seafood';