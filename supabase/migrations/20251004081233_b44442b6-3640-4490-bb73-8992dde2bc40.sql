-- Rename Lanie%CC%80res de boeuf 1 to Beef Strips
UPDATE supplier_products 
SET name = 'Beef Strips'
WHERE name ILIKE '%lanie%res de boeuf%' OR name ILIKE '%lanières de boeuf%';