-- Deactivate chicken drumstick incorrectly classified as seafood
UPDATE supplier_products 
SET is_active = false 
WHERE supplier = 'JAB Brothers' 
  AND LOWER(name) LIKE '%chicken%drumstick%' 
  AND category = 'Seafood';