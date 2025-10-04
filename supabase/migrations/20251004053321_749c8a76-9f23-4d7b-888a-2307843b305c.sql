-- Deactivate Poule 2 product
UPDATE supplier_products 
SET is_active = false 
WHERE name = 'Poule 2';