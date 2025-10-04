-- Deactivate multiple products from catalog
UPDATE supplier_products 
SET is_active = false 
WHERE name IN (
  'Chicken Gizzards',
  'Chicken',
  'Chicken Leg Quarters',
  'Chicken Wings 3 Joint - A Grade',
  'fish',
  'Pork Mask',
  'White Croaker',
  'Yellow Croaker',
  'Whole Hen',
  'Turkey**'
);