-- Make quote title nullable
ALTER TABLE quotes ALTER COLUMN title DROP NOT NULL;

-- Create function to auto-generate quote titles
CREATE OR REPLACE FUNCTION auto_generate_quote_title()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
  item_count INTEGER;
  generated_title TEXT;
BEGIN
  -- Only generate if title is NULL or empty
  IF NEW.title IS NULL OR trim(NEW.title) = '' THEN
    -- Get customer name
    SELECT company_name INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id
    LIMIT 1;
    
    -- If no customer found, try to use customer_email
    IF customer_name IS NULL AND NEW.customer_email IS NOT NULL THEN
      customer_name := split_part(NEW.customer_email, '@', 1);
    END IF;
    
    -- Get item count for this quote
    SELECT COUNT(*) INTO item_count
    FROM quote_items
    WHERE quote_id = NEW.id;
    
    -- Generate title based on available data
    IF item_count > 0 AND customer_name IS NOT NULL THEN
      generated_title := item_count || ' Items - ' || customer_name;
    ELSIF customer_name IS NOT NULL THEN
      generated_title := 'Quote for ' || customer_name;
    ELSE
      generated_title := 'Quote ' || NEW.quote_number;
    END IF;
    
    NEW.title := generated_title;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generation on INSERT
CREATE TRIGGER auto_generate_quote_title_on_insert
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION auto_generate_quote_title();

-- Create trigger for auto-generation on UPDATE
CREATE TRIGGER auto_generate_quote_title_on_update
BEFORE UPDATE ON quotes
FOR EACH ROW
WHEN (NEW.title IS NULL OR trim(NEW.title) = '')
EXECUTE FUNCTION auto_generate_quote_title();

-- Backfill any existing NULL titles
UPDATE quotes
SET title = COALESCE(title, '')
WHERE title IS NULL;