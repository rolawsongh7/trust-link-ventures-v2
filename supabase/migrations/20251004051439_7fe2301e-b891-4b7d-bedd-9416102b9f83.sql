-- Deactivate Beef** product from Seapro SAS
UPDATE supplier_products 
SET is_active = false 
WHERE name = 'Beef**' 
  AND supplier = 'Seapro SAS';