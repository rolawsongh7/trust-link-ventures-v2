-- Fix chicken products incorrectly categorized as Seafood to Poultry
UPDATE supplier_products 
SET category = 'Poultry'
WHERE supplier = 'JAB Brothers' 
  AND name ILIKE '%chicken%' 
  AND category = 'Seafood';

-- Fix beef/steak products incorrectly categorized as Seafood to Meat
UPDATE supplier_products 
SET category = 'Meat'
WHERE supplier = 'JAB Brothers' 
  AND (name ILIKE '%beef%' OR name ILIKE '%steak%' OR name ILIKE '%sirloin%' 
       OR name ILIKE '%ribeye%' OR name ILIKE '%silverside%' OR name ILIKE '%round cut%')
  AND category = 'Seafood';

-- Fix pork products incorrectly categorized as Seafood to Pork
UPDATE supplier_products 
SET category = 'Pork'
WHERE supplier = 'JAB Brothers' 
  AND (name ILIKE '%pork%' OR name ILIKE '%grillers%')
  AND category = 'Seafood';