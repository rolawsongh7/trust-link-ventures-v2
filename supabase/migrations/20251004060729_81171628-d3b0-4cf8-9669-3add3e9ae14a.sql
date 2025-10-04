-- Deactivate Filet de porc product
UPDATE supplier_products 
SET is_active = false 
WHERE name ILIKE '%filet%porc%' OR name ILIKE '%pork%fillet%';