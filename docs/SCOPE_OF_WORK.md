# Trust Link Ventures CRM & Customer Portal
## Comprehensive Scope of Work & Technical Specification

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Project Type:** B2B CRM with Customer Portal & Native Mobile App

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Feature Modules](#5-feature-modules)
6. [Edge Functions (Backend API)](#6-edge-functions-backend-api)
7. [Security Implementation](#7-security-implementation)
8. [Mobile App Architecture](#8-mobile-app-architecture)
9. [Integration Points](#9-integration-points)
10. [File Structure](#10-file-structure)
11. [Replication Checklist](#11-replication-checklist)

---

## 1. Project Overview

### 1.1 Business Context
A comprehensive B2B procurement and CRM platform enabling:
- **Admin Portal**: Complete business management for sales, quotes, orders, and customer relationships
- **Customer Portal**: Self-service interface for customers to browse catalogs, request quotes, track orders
- **Public Website**: Marketing pages, contact forms, and lead generation
- **Native Mobile App**: iOS/Android app with push notifications and biometric authentication

### 1.2 Core Business Flows

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER JOURNEY                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Lead/Visitor ──► Quote Request ──► Quote Sent ──► Order Created    │
│       │                │                │               │            │
│       ▼                ▼                ▼               ▼            │
│  Contact Form    RFQ Process      Customer        Payment &         │
│  Newsletter      Cart → RFQ       Approval        Delivery          │
│  Catalog Browse                                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component Library |
| React Router DOM | 6.x | Routing |
| TanStack Query | 5.x | Data Fetching & Caching |
| Framer Motion | 12.x | Animations |
| React Hook Form | 7.x | Form Management |
| Zod | 3.x | Validation |
| Recharts | 2.x | Charts & Analytics |

### 2.2 Backend (Supabase)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Database |
| Supabase Auth | Authentication |
| Edge Functions | Serverless API |
| Row Level Security | Data Protection |
| Realtime | Live Updates |
| Storage | File Management |

### 2.3 External Services
| Service | Purpose |
|---------|---------|
| Resend | Transactional Email |
| Paystack | Payment Processing (Ghana) |
| Google reCAPTCHA | Bot Protection |
| Firecrawl | Web Scraping for Catalog |

### 2.4 Mobile
| Technology | Purpose |
|------------|---------|
| Capacitor | Native App Wrapper |
| buildnatively.com | App Build Service |
| Push Notifications | @capacitor/push-notifications |
| Biometric Auth | @aparajita/capacitor-biometric-auth |
| Local Notifications | @capacitor/local-notifications |

---

## 3. Database Schema

### 3.1 Schema Overview

Total Tables: **73 tables** organized into functional domains.

### 3.2 Core Business Tables

#### customers
Primary customer/company information.
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  industry TEXT,
  website TEXT,
  annual_revenue NUMERIC,
  customer_status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  tags TEXT[],
  notes TEXT,
  assigned_to UUID,
  created_by UUID,
  biometric_enabled BOOLEAN DEFAULT false,
  biometric_device_id TEXT,
  biometric_enrolled_at TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  last_password_changed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### customer_addresses
Ghana-specific address format with digital addressing.
```sql
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  receiver_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  ghana_digital_address TEXT NOT NULL,
  street_address TEXT NOT NULL,
  area TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  additional_directions TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### customer_users
Links auth users to customer accounts (many-to-many).
```sql
CREATE TABLE customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  user_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Quote Management Tables

#### quotes
Main quotes table.
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_email TEXT,
  lead_id UUID REFERENCES leads(id),
  title TEXT,
  description TEXT,
  currency TEXT DEFAULT 'GHS',
  subtotal NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  tax_inclusive BOOLEAN DEFAULT false,
  shipping_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  -- Status values: draft, pending, sent, viewed, approved, rejected, expired, converted
  valid_until DATE,
  terms TEXT,
  notes TEXT,
  file_url TEXT,
  final_file_url TEXT,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  origin_type TEXT, -- 'manual', 'rfq', 'quote_request'
  linked_quote_request_id UUID REFERENCES quote_requests(id),
  conversion_type TEXT,
  conversion_method TEXT,
  conversion_notes TEXT,
  converted_at TIMESTAMPTZ,
  converted_by UUID,
  supplier_quote_uploaded_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### quote_items
Line items for quotes.
```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  specifications TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### quote_requests
Customer-submitted quote requests.
```sql
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id),
  delivery_address_id UUID REFERENCES customer_addresses(id),
  title TEXT NOT NULL,
  message TEXT,
  urgency TEXT DEFAULT 'normal', -- normal, urgent, critical
  status TEXT DEFAULT 'pending', -- pending, in_review, quoted, closed
  request_type TEXT DEFAULT 'standard',
  expected_delivery_date DATE,
  admin_notes TEXT,
  -- Lead capture fields (for non-authenticated users)
  lead_contact_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  lead_company_name TEXT,
  lead_country TEXT,
  lead_industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### quote_request_items
Items within a quote request.
```sql
CREATE TABLE quote_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID REFERENCES quote_requests(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  specifications TEXT,
  preferred_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### quote_view_tokens
Secure tokens for customer quote viewing.
```sql
CREATE TABLE quote_view_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) NOT NULL,
  token TEXT UNIQUE DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### quote_approvals
Records customer approval/rejection decisions.
```sql
CREATE TABLE quote_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  token TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'approved', 'rejected'
  customer_notes TEXT,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  approved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Order & Fulfillment Tables

#### orders
Main orders table with comprehensive delivery tracking.
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  quote_id UUID REFERENCES quotes(id),
  source_quote_id UUID REFERENCES quotes(id),
  source_type TEXT, -- 'quote', 'direct'
  
  -- Financials
  currency TEXT DEFAULT 'GHS',
  total_amount NUMERIC NOT NULL,
  
  -- Status & Workflow
  status order_status_enum DEFAULT 'pending_payment',
  -- Enum values: pending_payment, payment_uploaded, payment_verified, 
  -- processing, ready_to_ship, shipped, out_for_delivery, delivered, 
  -- failed_delivery, cancelled
  
  -- Payment Information
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  payment_gateway TEXT,
  payment_channel TEXT,
  payment_amount_paid NUMERIC,
  payment_initiated_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,
  payment_verified_at TIMESTAMPTZ,
  payment_verified_by UUID,
  payment_proof_uploaded_at TIMESTAMPTZ,
  manual_confirmation_method TEXT,
  manual_confirmation_notes TEXT,
  
  -- GhIPSS Integration (Ghana Instant Pay)
  ghipss_reference TEXT,
  ghipss_transaction_id TEXT,
  ghipss_status TEXT,
  ghipss_metadata JSONB,
  
  -- Delivery Information
  delivery_address_id UUID REFERENCES customer_addresses(id),
  delivery_notes TEXT,
  delivery_window TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  carrier TEXT,
  carrier_name TEXT,
  tracking_number TEXT,
  delivery_signature TEXT,
  delivery_proof_url TEXT,
  proof_of_delivery_url TEXT,
  
  -- Workflow Timestamps
  processing_started_at TIMESTAMPTZ,
  ready_to_ship_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_address_requested_at TIMESTAMPTZ,
  delivery_address_confirmed_at TIMESTAMPTZ,
  
  -- Failure Handling
  failed_delivery_at TIMESTAMPTZ,
  failed_delivery_reason TEXT,
  failed_delivery_count INTEGER DEFAULT 0,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order status enum
CREATE TYPE order_status_enum AS ENUM (
  'pending_payment',
  'payment_uploaded',
  'payment_verified',
  'processing',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'cancelled'
);
```

#### order_items
Line items for orders.
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  specifications TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### order_status_history
Audit trail for order status changes.
```sql
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

#### delivery_history
Detailed delivery tracking events.
```sql
CREATE TABLE delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### delivery_tracking_tokens
Public tracking tokens for customers.
```sql
CREATE TABLE delivery_tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) UNIQUE NOT NULL,
  token TEXT UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.5 Financial Tables

#### invoices
Invoice management.
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  quote_id UUID REFERENCES quotes(id),
  invoice_type TEXT NOT NULL, -- 'proforma', 'commercial', 'credit_note'
  currency TEXT DEFAULT 'GHS',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms TEXT,
  notes TEXT,
  file_url TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### invoice_items
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### payment_transactions
Payment processing records (Paystack/GhIPSS).
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  ghipss_reference TEXT NOT NULL UNIQUE,
  ghipss_transaction_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GHS',
  status TEXT NOT NULL, -- pending, completed, failed
  payment_channel TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  ghipss_response JSONB,
  notes TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  last_verification_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.6 Product Catalog Tables

#### products
Product catalog (admin-managed).
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### cart_items
Customer shopping cart.
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  image_url TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT NOT NULL,
  specifications TEXT,
  preferred_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.7 RFQ (Request for Quote) System

For sourcing from suppliers.

#### rfqs
```sql
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT DEFAULT 'open', -- open, closed, awarded
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### magic_link_tokens
Secure supplier access tokens.
```sql
CREATE TABLE magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  supplier_email TEXT NOT NULL,
  rfq_id UUID,
  quote_id UUID,
  order_id UUID,
  token_type TEXT, -- 'rfq_response', 'quote_view', 'order_tracking'
  metadata JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### quote_submissions
Supplier quote submissions.
```sql
CREATE TABLE quote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL,
  magic_token TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_email TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_company TEXT,
  quote_amount NUMERIC,
  currency TEXT DEFAULT 'GHS',
  delivery_date DATE,
  validity_days INTEGER,
  notes TEXT,
  file_url TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.8 CRM Tables

#### leads
Lead management.
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  title TEXT,
  description TEXT,
  value NUMERIC,
  currency TEXT DEFAULT 'GHS',
  status lead_status DEFAULT 'new',
  -- Enum: new, contacted, qualified, proposal, negotiation, won, lost
  source TEXT,
  probability INTEGER,
  expected_close_date DATE,
  lead_score INTEGER,
  notes TEXT,
  assigned_to UUID,
  verification_status TEXT,
  ip_address INET DEFAULT '0.0.0.0',
  submission_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
);
```

#### opportunities
Sales pipeline management.
```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  stage TEXT DEFAULT 'discovery',
  probability INTEGER,
  expected_close_date DATE,
  actual_close_date DATE,
  close_reason TEXT,
  source TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### pipeline_stages
Configurable sales stages.
```sql
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  probability INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### activities
Task and activity tracking.
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  activity_type TEXT NOT NULL, -- call, email, meeting, task, note
  subject TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### communications
Communication history.
```sql
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  order_id UUID REFERENCES orders(id),
  communication_type communication_type,
  -- Enum: email, phone, meeting, whatsapp, sms, other
  direction TEXT, -- inbound, outbound
  subject TEXT,
  content TEXT,
  contact_person TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  verification_status TEXT,
  ip_address INET DEFAULT '0.0.0.0',
  submission_metadata JSONB,
  -- Threading support
  parent_communication_id UUID REFERENCES communications(id),
  thread_id TEXT,
  thread_position INTEGER,
  created_by UUID,
  communication_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE communication_type AS ENUM (
  'email', 'phone', 'meeting', 'whatsapp', 'sms', 'other'
);
```

#### tags & entity_tags
Flexible tagging system.
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'customer', 'lead', 'quote', 'order'
  entity_id UUID NOT NULL,
  tag_id UUID REFERENCES tags(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.9 Authentication & Security Tables

#### profiles
User profiles linked to auth.users.
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user', -- super_admin, admin, moderator, sales_rep, user
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### password_policies
Global password requirements.
```sql
CREATE TABLE password_policies (
  id SERIAL PRIMARY KEY,
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  prevent_reuse_count INTEGER DEFAULT 5,
  max_age_days INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### password_history
Prevent password reuse.
```sql
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  strength_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### failed_login_attempts
Brute force protection.
```sql
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  reason TEXT,
  attempt_time TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### mfa_login_attempts
MFA tracking.
```sql
CREATE TABLE mfa_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  attempt_time TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### device_fingerprints
Known device tracking.
```sql
CREATE TABLE device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  device_info JSONB,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### ip_whitelist
IP-based access control.
```sql
CREATE TABLE ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address INET NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.10 Notifications & Communication Tables

#### notifications
In-app notifications.
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### notification_preferences
User notification settings.
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  order_updates BOOLEAN DEFAULT true,
  quote_updates BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'instant', -- instant, daily, weekly
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### email_logs
Email delivery tracking.
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  quote_id UUID REFERENCES quotes(id),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  resend_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### newsletter_subscriptions
Marketing list management.
```sql
CREATE TABLE newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  status TEXT DEFAULT 'active', -- active, unsubscribed
  verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_sent_at TIMESTAMPTZ,
  ip_address INET DEFAULT '0.0.0.0',
  subscription_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.11 Audit & Security Monitoring Tables

#### audit_logs
Comprehensive action logging.
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info', -- info, warning, error, critical
  resource_type TEXT,
  resource_id TEXT,
  action TEXT,
  changes JSONB,
  event_data JSONB,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### security_alerts
Security event notifications.
```sql
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  resolved BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### security_alert_rules
Configurable alert triggers.
```sql
CREATE TABLE security_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_pattern TEXT NOT NULL,
  severity_threshold TEXT DEFAULT 'medium',
  notification_channels JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### csp_violations
Content Security Policy violation reports.
```sql
CREATE TABLE csp_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### anomaly_detection_settings
Behavioral analysis configuration.
```sql
CREATE TABLE anomaly_detection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enable_login_pattern_detection BOOLEAN DEFAULT true,
  enable_velocity_checks BOOLEAN DEFAULT true,
  enable_device_fingerprint_checks BOOLEAN DEFAULT true,
  enable_location_analysis BOOLEAN DEFAULT true,
  sensitivity_level TEXT DEFAULT 'medium', -- low, medium, high
  auto_block_threshold INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### network_security_settings
Network-level security configuration.
```sql
CREATE TABLE network_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enable_geo_blocking BOOLEAN DEFAULT false,
  block_vpn BOOLEAN DEFAULT false,
  block_tor BOOLEAN DEFAULT true,
  risk_threshold INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.12 User Settings & Privacy Tables

#### privacy_settings
User privacy preferences.
```sql
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### consent_history
GDPR/privacy consent tracking.
```sql
CREATE TABLE consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  consent_data JSONB DEFAULT '{}',
  ip_address INET DEFAULT '0.0.0.0',
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### account_deletions
Account deletion requests (right to be forgotten).
```sql
CREATE TABLE account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deletion_reason TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.13 System Tables

#### rate_limit_attempts
API rate limiting.
```sql
CREATE TABLE rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  last_attempt TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### file_uploads
File upload tracking.
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  storage_path TEXT,
  validation_status TEXT DEFAULT 'pending', -- pending, valid, invalid
  validation_errors TEXT[],
  virus_scan_status TEXT,
  metadata JSONB,
  upload_ip INET DEFAULT '0.0.0.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### payment_settings
Global payment configuration.
```sql
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. User Roles & Permissions

### 4.1 Role Hierarchy

```
super_admin
    └── admin
         └── moderator
              └── sales_rep
                   └── user (customer)
```

### 4.2 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| `super_admin` | Full system access, can manage other admins | All features + system settings |
| `admin` | Business management | All business features, user management |
| `moderator` | Review and approval duties | Quotes, orders, customer support |
| `sales_rep` | Sales team member | Leads, quotes, customers (limited) |
| `user` | Customer account | Customer portal only |

### 4.3 Permission Matrix

| Feature | super_admin | admin | moderator | sales_rep | user |
|---------|-------------|-------|-----------|-----------|------|
| Dashboard (Admin) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Customers - View | ✅ | ✅ | ✅ | ✅ | Own only |
| Customers - Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| Customers - Edit | ✅ | ✅ | ✅ | Assigned | Own only |
| Customers - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Quotes - View | ✅ | ✅ | ✅ | ✅ | Own only |
| Quotes - Create | ✅ | ✅ | ✅ | ✅ | Request only |
| Quotes - Approve | ✅ | ✅ | ✅ | ❌ | ❌ |
| Orders - View | ✅ | ✅ | ✅ | ✅ | Own only |
| Orders - Manage | ✅ | ✅ | ✅ | ❌ | ❌ |
| Invoices - View | ✅ | ✅ | ✅ | ✅ | Own only |
| Invoices - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | Limited | Limited | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Catalog (Browse) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cart & RFQ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Feature Modules

### 5.1 Admin Portal Features

#### 5.1.1 Dashboard
- **Key Metrics Cards**: Total quotes, orders, revenue, customers
- **Revenue Chart**: Daily/weekly/monthly trends
- **Recent Activity Feed**: Latest quotes, orders, status changes
- **Quick Actions**: Create quote, add customer
- **Pending Approvals Widget**: Items needing attention

#### 5.1.2 Customer Management
- **Customer List**: Searchable, filterable table
- **Customer Profile**: Full details, contact info, addresses
- **Customer History**: Quotes, orders, communications timeline
- **Address Management**: Ghana digital addressing support
- **Customer Tags**: Flexible categorization
- **Bulk Operations**: Import, export, bulk update

#### 5.1.3 Quote Management
- **Quote Builder**: Line items, pricing, terms
- **Quote Templates**: Reusable templates
- **Multi-currency**: GHS, USD, EUR, GBP support
- **Tax Calculation**: Inclusive/exclusive options
- **File Attachments**: Upload supplier quotes
- **Quote Sending**: Email with secure view link
- **Status Workflow**: Draft → Sent → Viewed → Approved/Rejected → Converted
- **Quote Duplication**: Quick copy
- **Quote Approval Tracking**: Customer decision recording

#### 5.1.4 Order Management
- **Order Pipeline**: Visual status board
- **Payment Verification**: Manual proof review
- **Delivery Scheduling**: Carrier assignment, tracking
- **Status Updates**: With customer notifications
- **Order Timeline**: Complete audit trail
- **Cancellation Handling**: Reason tracking
- **Bulk Status Updates**: Multi-select actions
- **Export to Excel/CSV**: Reporting

#### 5.1.5 Invoice Management
- **Invoice Types**: Proforma, Commercial, Credit Note
- **Auto-generation**: From quotes or orders
- **Invoice Numbering**: Configurable sequences
- **PDF Generation**: Professional templates
- **Email Sending**: Direct to customer
- **Payment Tracking**: Status and dates
- **Overdue Alerts**: Automated flagging

#### 5.1.6 Analytics & Reports
- **Sales Dashboard**: Revenue, conversion rates
- **Customer Analytics**: Acquisition, retention
- **Quote Analytics**: Win/loss rates, response times
- **Order Analytics**: Fulfillment metrics
- **Product Analytics**: Top sellers, trends
- **Export Reports**: CSV, Excel

#### 5.1.7 CRM Features
- **Lead Pipeline**: Visual kanban board
- **Opportunity Tracking**: Value, probability
- **Activity Management**: Tasks, calls, meetings
- **Communication Log**: Email, phone, WhatsApp
- **Sales Forecasting**: Pipeline value
- **Team Assignment**: Lead/opportunity routing

#### 5.1.8 Settings
- **Profile Settings**: Name, email, password
- **Notification Settings**: Email, push preferences
- **Security Settings**: 2FA, session management
- **Payment Settings**: Bank details, methods
- **Email Templates**: Customization
- **System Configuration**: Company info, branding

### 5.2 Customer Portal Features

#### 5.2.1 Customer Dashboard
- **Welcome Header**: Personalized greeting
- **Active Orders Widget**: Current order statuses
- **Recent Quotes Widget**: Pending quotes
- **Quick Actions**: New quote request, browse catalog

#### 5.2.2 Product Catalog
- **Category Navigation**: Hierarchical browsing
- **Product Grid**: Image, name, description
- **Search & Filter**: Keyword, category, availability
- **Product Details**: Specifications, grades
- **Add to Cart**: Quantity, unit selection

#### 5.2.3 Shopping Cart
- **Cart Summary**: Items, quantities, notes
- **Edit Items**: Update quantity, remove
- **Specifications**: Custom requirements per item
- **Convert to RFQ**: Submit as quote request

#### 5.2.4 Quote Requests
- **Request Form**: Items, delivery preferences
- **Request History**: All submitted requests
- **Status Tracking**: Current request status
- **Request Details**: Items, admin responses

#### 5.2.5 Quotes (Received)
- **Quote List**: All received quotes
- **Quote Details**: Items, pricing, terms
- **Approve/Reject**: Decision with notes
- **Download PDF**: Quote document

#### 5.2.6 Orders
- **Order List**: All orders with status
- **Order Details**: Items, pricing, shipping
- **Delivery Tracking**: Real-time status
- **Payment Upload**: Proof of payment
- **Order Timeline**: Status history

#### 5.2.7 Invoices
- **Invoice List**: All invoices
- **Invoice Details**: Line items, totals
- **Download PDF**: Invoice document
- **Payment Status**: Paid/unpaid indicator

#### 5.2.8 Profile Management
- **Personal Information**: Name, contact details
- **Address Book**: Multiple delivery addresses
- **Password Change**: Security update
- **Notification Preferences**: Email/push settings

### 5.3 Public Website Features

#### 5.3.1 Marketing Pages
- **Home Page**: Hero, features, testimonials
- **About Page**: Company information
- **Services Page**: Service offerings
- **Products Page**: Public catalog preview
- **Partners Page**: Partner information
- **FAQ Page**: Common questions
- **Contact Page**: Contact form, map

#### 5.3.2 Lead Generation
- **Contact Form**: With reCAPTCHA
- **Newsletter Signup**: Email collection
- **Quote Request**: Guest quote request

#### 5.3.3 SEO Features
- **Meta Tags**: Dynamic per page
- **Structured Data**: JSON-LD schemas
- **Sitemap**: Auto-generated
- **Social Sharing**: OG tags

---

## 6. Edge Functions (Backend API)

### 6.1 Quote & Invoice Processing

| Function | Purpose |
|----------|---------|
| `send-quote` | Send quote email with view link |
| `generate-quote-pdf` | Generate PDF from quote data |
| `send-invoice` | Send invoice email |
| `generate-invoice-pdf` | Generate PDF from invoice data |

### 6.2 Payment Processing

| Function | Purpose |
|----------|---------|
| `ghipss-initiate` | Initiate GhIPSS payment |
| `ghipss-verify` | Verify payment status |
| `ghipss-webhook` | Handle payment webhooks |
| `paystack-webhook` | Handle Paystack webhooks |

### 6.3 Catalog Management

| Function | Purpose |
|----------|---------|
| `scrape-catalog` | Scrape product data (Firecrawl) |
| `sync-catalog` | Sync scraped products |

### 6.4 Communication

| Function | Purpose |
|----------|---------|
| `send-contact-form` | Process contact form |
| `send-newsletter-confirmation` | Newsletter signup |
| `send-order-notification` | Order status emails |
| `send-delivery-update` | Delivery notification |

### 6.5 Security & Auth

| Function | Purpose |
|----------|---------|
| `verify-totp` | Verify 2FA code |
| `generate-backup-codes` | Generate MFA backup codes |
| `log-security-event` | Log security events |

### 6.6 RFQ System

| Function | Purpose |
|----------|---------|
| `send-rfq-invitation` | Send supplier RFQ |
| `process-supplier-quote` | Handle supplier response |

---

## 7. Security Implementation

### 7.1 Authentication

#### Supabase Auth Configuration
- Email/password authentication
- Email verification required
- Password reset flow
- Session management

#### Password Policy
- Minimum 8 characters
- Uppercase + lowercase required
- Numbers required
- Special characters required
- Password history (prevent reuse of last 5)
- Maximum age: 90 days

#### Rate Limiting
- Login attempts: 5 per 15 minutes
- Password reset: 3 per hour
- API calls: 100 per minute

### 7.2 Multi-Factor Authentication (MFA)

#### TOTP Implementation
- QR code enrollment
- 6-digit codes (30-second window)
- Backup codes (10 single-use)

#### Trusted Devices
- Device fingerprinting
- 30-day trust period
- Manual device removal

### 7.3 Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Admins can access all data
- Public tables (products) have anonymous read access
- Write operations require authentication

#### Example Policies
```sql
-- Customers: Admins see all, users see linked only
CREATE POLICY "Admins can view all customers"
ON customers FOR SELECT
USING (is_admin_user(auth.uid()));

CREATE POLICY "Users can view linked customers"
ON customers FOR SELECT
USING (
  id IN (
    SELECT customer_id FROM customer_users
    WHERE user_id = auth.uid()
  )
);

-- Orders: Same pattern
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (
  customer_id IN (
    SELECT customer_id FROM customer_users
    WHERE user_id = auth.uid()
  )
);
```

### 7.4 Audit Logging

All critical actions are logged:
- Authentication events
- CRUD operations on sensitive data
- Payment transactions
- Admin actions
- Security events

### 7.5 Security Headers

Implemented via Supabase and frontend:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

---

## 8. Mobile App Architecture

### 8.1 Platform Detection

```typescript
// src/utils/env.ts
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Capacitor native check
  if (Capacitor.isNativePlatform()) return true;
  
  // buildnatively.com user agent
  if (navigator.userAgent.includes('Natively')) return true;
  
  // Explicit URL parameter
  if (window.location.search.includes('is_native=true')) return true;
  
  return false;
};
```

### 8.2 Native Features

#### Push Notifications
- Quote updates
- Order status changes
- Delivery updates
- Security alerts

#### Biometric Authentication
- Face ID / Touch ID
- Fingerprint (Android)
- Fallback to PIN

#### Offline Support
- Cached catalog data
- Offline-first cart
- Sync on reconnect

### 8.3 Mobile-Specific UI

#### Trust Link Hub (Native Only)
- Bottom navigation
- Quick actions grid
- Simplified dashboard

#### Route Handling
```typescript
// Mobile users → /trust-link-hub
// Web users → /customer/dashboard
{
  path: '/',
  element: isNativeApp() 
    ? <Navigate to="/trust-link-hub" />
    : <Navigate to="/customer/dashboard" />
}
```

### 8.4 Build Configuration

#### Capacitor Config
```typescript
// capacitor.config.ts
{
  appId: 'com.trustlinkventures.app',
  appName: 'Trust Link',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    BiometricAuth: {
      androidBiometryStrength: 'weak'
    }
  }
}
```

---

## 9. Integration Points

### 9.1 Resend (Email)

```typescript
// Email types
- Quote emails with PDF
- Invoice emails
- Order notifications
- Delivery updates
- Password reset
- Email verification
- Contact form responses
```

### 9.2 Paystack (Payments)

```typescript
// Payment channels
- Mobile Money (MTN, Vodafone, AirtelTigo)
- Bank transfer
- Card payments
- USSD

// Webhook handling
- Payment success
- Payment failure
- Refunds
```

### 9.3 Firecrawl (Catalog)

```typescript
// Scraping capabilities
- Product data extraction
- Image scraping
- Specification parsing
- Category detection
```

### 9.4 Google reCAPTCHA

```typescript
// Protected forms
- Contact form
- Quote request (guest)
- Newsletter signup
- Registration
```

---

## 10. File Structure

```
project/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin-specific components
│   │   ├── auth/            # Authentication components
│   │   ├── cart/            # Shopping cart
│   │   ├── catalog/         # Product catalog
│   │   ├── customers/       # Customer management
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── delivery/        # Delivery tracking
│   │   ├── home/            # Public home page
│   │   ├── invoices/        # Invoice components
│   │   ├── layout/          # Layout components
│   │   ├── leads/           # Lead management
│   │   ├── mobile/          # Mobile-specific
│   │   ├── notifications/   # Notification UI
│   │   ├── orders/          # Order management
│   │   ├── payments/        # Payment components
│   │   ├── quotes/          # Quote management
│   │   ├── security/        # Security settings
│   │   ├── settings/        # Settings pages
│   │   └── ui/              # shadcn/ui components
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── use-cart.ts
│   │   ├── use-customers.ts
│   │   ├── use-invoices.ts
│   │   ├── use-orders.ts
│   │   ├── use-quotes.ts
│   │   └── ...
│   │
│   ├── lib/                 # Utilities
│   │   ├── utils.ts
│   │   ├── exportHelpers.ts
│   │   └── ...
│   │
│   ├── pages/               # Page components
│   │   ├── admin/           # Admin pages
│   │   ├── auth/            # Auth pages
│   │   ├── customer/        # Customer portal pages
│   │   └── ...              # Public pages
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   │
│   ├── routes/              # Route definitions
│   ├── utils/               # Helper utilities
│   ├── types/               # TypeScript types
│   └── assets/              # Static assets
│
├── supabase/
│   ├── functions/           # Edge functions
│   │   ├── send-quote/
│   │   ├── generate-quote-pdf/
│   │   ├── ghipss-initiate/
│   │   └── ...
│   │
│   └── migrations/          # Database migrations
│
├── docs/                    # Documentation
├── public/                  # Public assets
└── android/                 # Capacitor Android
└── ios/                     # Capacitor iOS
```

---

## 11. Replication Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Vite + React + TypeScript project
- [ ] Configure Tailwind CSS with design system
- [ ] Install and configure shadcn/ui
- [ ] Set up Supabase project
- [ ] Configure authentication
- [ ] Create base database schema
- [ ] Set up RLS policies
- [ ] Configure environment variables

### Phase 2: Core Features (Week 3-5)

- [ ] Implement authentication flows
- [ ] Build admin dashboard
- [ ] Create customer management
- [ ] Implement quote system
- [ ] Build order management
- [ ] Add invoice generation
- [ ] Set up email integration (Resend)

### Phase 3: Customer Portal (Week 6-7)

- [ ] Build customer dashboard
- [ ] Implement product catalog
- [ ] Create shopping cart
- [ ] Build quote request flow
- [ ] Add order tracking
- [ ] Implement profile management

### Phase 4: Advanced Features (Week 8-9)

- [ ] Implement MFA
- [ ] Add payment integration
- [ ] Build RFQ system
- [ ] Implement analytics
- [ ] Add CRM features
- [ ] Build notification system

### Phase 5: Mobile App (Week 10-11)

- [ ] Configure Capacitor
- [ ] Implement push notifications
- [ ] Add biometric auth
- [ ] Build mobile-specific UI
- [ ] Test on iOS/Android
- [ ] Deploy to app stores

### Phase 6: Polish & Launch (Week 12)

- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitoring setup

---

## Appendix A: Key Database Functions

```sql
-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('super_admin', 'admin', 'moderator', 'sales_rep')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  year_prefix := 'QT' || TO_CHAR(NOW(), 'YY');
  SELECT COALESCE(MAX(
    SUBSTRING(quote_number FROM 5)::INTEGER
  ), 0) + 1
  INTO sequence_num
  FROM quotes
  WHERE quote_number LIKE year_prefix || '%';
  
  RETURN year_prefix || LPAD(sequence_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Appendix B: Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY=

# Edge Function Secrets
RESEND_API_KEY=
PAYSTACK_SECRET_KEY=
FIRECRAWL_API_KEY=
GHIPSS_API_KEY=
GHIPSS_MERCHANT_ID=
```

---

**Document End**

*This scope of work document is intended as a comprehensive reference for replicating the Trust Link Ventures CRM & Customer Portal system. Adjust timelines and features based on specific project requirements.*
