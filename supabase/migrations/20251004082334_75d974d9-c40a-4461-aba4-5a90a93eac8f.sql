-- Rename Pulmones to Beef Lungs
UPDATE supplier_products 
SET name = 'Beef Lungs'
WHERE name ILIKE '%pulmones%';