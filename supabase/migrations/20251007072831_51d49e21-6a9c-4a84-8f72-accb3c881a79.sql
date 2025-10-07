-- Add trigger to automatically convert accepted quotes to orders
CREATE TRIGGER convert_quote_to_order_trigger
  AFTER UPDATE ON quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
  EXECUTE FUNCTION auto_convert_quote_to_order();