-- Rename Dinde 2 to Turkey
UPDATE supplier_products 
SET name = 'Turkey'
WHERE name ILIKE '%dinde 2%';