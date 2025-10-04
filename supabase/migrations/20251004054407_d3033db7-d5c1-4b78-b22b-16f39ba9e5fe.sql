-- Rename Agneau to Lamb
UPDATE supplier_products 
SET name = 'Lamb'
WHERE name = 'Agneau';