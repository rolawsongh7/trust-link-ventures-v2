-- Rename Mondongo product to Beef Stomach Lining
UPDATE supplier_products 
SET name = 'Beef Stomach Lining'
WHERE name ILIKE '%mondongo%';