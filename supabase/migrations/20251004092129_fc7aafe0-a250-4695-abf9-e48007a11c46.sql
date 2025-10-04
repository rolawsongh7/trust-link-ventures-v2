-- Rename Lengua product to Beef Tongue
UPDATE supplier_products 
SET name = 'Beef Tongue'
WHERE name ILIKE '%lengua%';