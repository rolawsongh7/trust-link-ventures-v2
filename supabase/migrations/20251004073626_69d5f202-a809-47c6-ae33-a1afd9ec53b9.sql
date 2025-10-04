-- Rename Beef Strips to Beef Entrecote
UPDATE supplier_products 
SET name = 'Beef Entrecote'
WHERE name ILIKE '%beef strips%';