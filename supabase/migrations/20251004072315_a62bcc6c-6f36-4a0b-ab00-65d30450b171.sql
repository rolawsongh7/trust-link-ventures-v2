-- Rename Canard to Duck
UPDATE supplier_products 
SET name = 'Duck'
WHERE name ILIKE '%canard%';