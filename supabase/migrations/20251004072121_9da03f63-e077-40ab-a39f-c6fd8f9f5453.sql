-- Rename Bushmeat** to Goat
UPDATE supplier_products 
SET name = 'Goat'
WHERE name ILIKE '%bushmeat%';