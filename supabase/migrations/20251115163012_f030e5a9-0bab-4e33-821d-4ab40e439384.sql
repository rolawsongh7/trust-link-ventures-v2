-- Update existing notification links from /customer/orders to /portal/orders
UPDATE user_notifications 
SET link = REPLACE(link, '/customer/orders', '/portal/orders')
WHERE link LIKE '/customer/orders%';