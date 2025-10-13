-- Enable full replica identity for all tables using realtime subscriptions
-- This ensures complete row data is available for UPDATE and DELETE events

-- Orders table (used in useRealtimeOrders)
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Customer addresses table (used in AddressLinkDialog)
ALTER TABLE customer_addresses REPLICA IDENTITY FULL;

-- Customers table (used in useRealtimeCustomers)
ALTER TABLE customers REPLICA IDENTITY FULL;

-- Leads table (used in useRealtimeLeads)
ALTER TABLE leads REPLICA IDENTITY FULL;

-- Quotes table (used in useRealtimeQuotes)
ALTER TABLE quotes REPLICA IDENTITY FULL;

-- User notifications table (used in useRealtimeNotifications)
ALTER TABLE user_notifications REPLICA IDENTITY FULL;