-- Deactivate the three products shown in the images
UPDATE supplier_products 
SET is_active = false 
WHERE name ILIKE '%need further information%' 
   OR name ILIKE '%contact us%'
   OR name ILIKE '%PELCO NZ KAWAI%'
   OR name ILIKE '%Pelco NZ Limited RSW%'
   OR name ILIKE '%kawai%'
   OR name ILIKE '%zealand 20kg%';