-- Rename Lomo to Beef Loin
UPDATE supplier_products 
SET name = 'Beef Loin'
WHERE name ILIKE '%lomo%';