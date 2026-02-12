

# Seed Test Tenant for Feature Eligibility Testing

## Overview

Insert a test tenant and assign the super admin user as owner so the Feature Eligibility panel can be tested interactively.

## Database Changes

Two SQL statements will be executed via a migration:

```text
1. INSERT INTO tenants (name, slug, status)
   VALUES ('TrustLink Demo', 'trustlink-demo', 'active')
   RETURNING id;

2. INSERT INTO tenant_users (tenant_id, user_id, role)
   VALUES (<tenant_id from step 1>, '7fca904d-7b99-45ae-8f40-b710dc149cf2', 'owner');
```

The super admin user being assigned is **info@trustlinkcompany.com**.

## What Happens Next

After the migration runs:
- The "Tenants" tab in Super Admin settings will show **TrustLink Demo** in the tenant list
- Clicking "Manage Features" will open the dialog with 6 feature toggles (quotes, credit_terms, loyalty_program, payment_proofs, standing_orders, auto_invoicing)
- All features default to enabled (no rows = enabled by convention)
- Toggling a feature off will prompt for a reason and upsert a row into `tenant_feature_eligibility`

## No Code Changes

Only a database migration is needed -- no frontend or hook changes required.

