-- Rename Goat product to Bushmeat
UPDATE supplier_products 
SET name = 'Bushmeat'
WHERE name ILIKE '%goat%' AND supplier = 'Seapro';