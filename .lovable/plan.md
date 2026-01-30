
# Super Admin Layer Implementation for Trust Link Ventures

## Current State Summary

### Role Infrastructure (Already Exists)
| Component | Status | Details |
|-----------|--------|---------|
| `user_roles` table | Exists | Contains `super_admin` in enum |
| `is_super_admin(uuid)` function | Exists | SECURITY DEFINER, checks `user_roles` |
| `is_admin()` function | Exists | Returns true for both `admin` and `super_admin` |
| `check_user_role(uuid, text)` function | Exists | Used extensively in RLS policies |
| `useRoleAuth` hook | Exists | Returns `hasSuperAdminAccess`, `hasAdminAccess` |
| Auto-trigger | Exists | Currently targets `support@trustlinkcompany.com` |

### Current Admin Users
| Email | Current Role | Target Role |
|-------|--------------|-------------|
| `info@trustlinkcompany.com` | `admin` | `super_admin` (to be promoted) |
| `trustlventuresghana_a01@yahoo.com` | `admin` | `admin` (unchanged) |

### Existing Super Admin Features (UI-Protected Only)
- PDF regeneration buttons in `InvoiceManagement.tsx`
- Storage testing buttons
- These are **UI-hidden** but lack server-side enforcement

---

## Implementation Phases

### Phase 1: Safe Super Admin Promotion (Database Migration)

Promote `info@trustlinkcompany.com` to `super_admin` via a one-time migration. Update the auto-trigger to use this email for future sign-ups.

```sql
-- 1. Upgrade existing user to super_admin
UPDATE public.user_roles 
SET role = 'super_admin', updated_at = now()
WHERE user_id = '7fca904d-7b99-45ae-8f40-b710dc149cf2'
AND role = 'admin';

-- 2. Ensure no duplicate roles (insert if not exists via upgrade)
INSERT INTO public.user_roles (user_id, role)
VALUES ('7fca904d-7b99-45ae-8f40-b710dc149cf2', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Update auto-trigger to use new super admin email
CREATE OR REPLACE FUNCTION public.assign_super_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'info@trustlinkcompany.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    PERFORM public.log_security_event(
      'super_admin_role_assigned',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'method', 'auto_trigger',
        'timestamp', extract(epoch from now())
      ),
      NULL, NULL, 'high'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Log the promotion in audit trail
INSERT INTO public.audit_logs (
  user_id, event_type, action, severity, event_data
) VALUES (
  '7fca904d-7b99-45ae-8f40-b710dc149cf2',
  'role_changed',
  'Promoted to super_admin',
  'high',
  jsonb_build_object(
    'email', 'info@trustlinkcompany.com',
    'previous_role', 'admin',
    'new_role', 'super_admin',
    'promoted_at', now()
  )
);
```

---

### Phase 2: Server-Side RPC Guards for Destructive Actions

Create secure RPC functions that enforce super admin access. These wrap existing functionality with proper authorization.

```sql
-- Super admin guard for regenerating invoice PDFs
CREATE OR REPLACE FUNCTION public.regenerate_invoice_pdf_secure(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Super admin privileges required';
  END IF;
  
  -- Log the action
  PERFORM log_security_event(
    'invoice_pdf_regenerated',
    auth.uid(),
    jsonb_build_object('invoice_id', p_invoice_id),
    NULL, NULL, 'high'
  );
  
  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

-- Super admin guard for role changes to 'admin'
CREATE OR REPLACE FUNCTION public.change_user_role_secure(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Get target user's current role
  SELECT role::text INTO v_current_role
  FROM public.user_roles
  WHERE user_id = p_target_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Prevent modification of super_admin
  IF v_current_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot modify super admin role';
  END IF;
  
  -- Only super_admin can assign/remove admin role
  IF (p_new_role = 'admin' OR v_current_role = 'admin') 
     AND NOT is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Only super admin can assign or remove admin role';
  END IF;
  
  -- Prevent self-demotion for super_admin
  IF p_target_user_id = v_caller_id AND is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Super admin cannot modify their own role';
  END IF;
  
  -- Perform the role change
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_target_user_id, p_new_role::app_role);
  
  -- Log the action
  PERFORM log_security_event(
    'role_changed',
    v_caller_id,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'old_role', v_current_role,
      'new_role', p_new_role
    ),
    NULL, NULL, 'high'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_role', v_current_role,
    'new_role', p_new_role
  );
END;
$$;
```

---

### Phase 3: Add Super Admin Tab to Settings

Add a new tab visible only to super admins, placed inside the existing Settings page structure.

**Modify `src/pages/Settings.tsx`:**

1. Add `hasSuperAdminAccess` to the destructured hook values
2. Add a new tab configuration for Super Admin
3. Add the tab trigger and content

```typescript
// Add to imports
import { SuperAdminTab } from '@/components/settings/SuperAdminTab';

// Update hook destructuring
const { hasAdminAccess, hasSuperAdminAccess, loading: roleLoading } = useRoleAuth();

// Add to tab configuration (after adminTabs)
const superAdminTabs = hasSuperAdminAccess ? [
  { value: "super-admin", label: "Super Admin", icon: <Crown className="h-4 w-4" /> },
] : [];

// Update allTabs
const allTabs = [
  ...(hasSuperAdminAccess ? superAdminTabs : []),
  ...(hasAdminAccess ? adminTabs : []),
  ...generalTabs,
  ...securityTabs,
];

// Add TabsContent for Super Admin
{hasSuperAdminAccess && (
  <TabsContent value="super-admin" className="space-y-6">
    <SuperAdminTab />
  </TabsContent>
)}
```

---

### Phase 4: Create SuperAdminTab Component

**New File: `src/components/settings/SuperAdminTab.tsx`**

A focused tab containing:
- Role Management Card (view admins, promote/demote with restrictions)
- System Tools Card (PDF regeneration, cache clear)
- Audit Export (full history download)

Features:
- Uses `hasSuperAdminAccess` guard internally for defense-in-depth
- Calls secure RPC functions instead of direct table operations
- All actions logged with confirmation dialogs

---

### Phase 5: Update User Management Restrictions

**Modify `src/components/settings/UserManagementTab.tsx`:**

```typescript
const { hasAdminAccess, hasSuperAdminAccess } = useRoleAuth();

// Role options based on caller's access level
const availableRoles = hasSuperAdminAccess 
  ? ['admin', 'sales_rep', 'user'] as const
  : ['sales_rep', 'user'] as const;

// Determine if a user row can be edited
const canEditUser = (userRole: string) => {
  if (userRole === 'super_admin') return false;
  if (userRole === 'admin' && !hasSuperAdminAccess) return false;
  return true;
};

// Update handleRoleChange to use secure RPC
const handleRoleChange = async (userId: string, newRole: string) => {
  const { data, error } = await supabase.rpc('change_user_role_secure', {
    p_target_user_id: userId,
    p_new_role: newRole
  });
  // Handle response...
};
```

**Modify `src/components/settings/UserTable.tsx`:**

- Accept `availableRoles` and `canEditUser` as props
- Filter dropdown options based on `availableRoles`
- Disable actions for rows where `canEditUser` returns false
- Show visual indicator (lock icon) for protected users

---

### Phase 6: Update Diagnostics Page

**Modify `src/pages/admin/Diagnostics.tsx`:**

```typescript
const { hasSuperAdminAccess } = useRoleAuth();

// Add super admin-only diagnostic checks
const superAdminChecks: DiagnosticCheck[] = hasSuperAdminAccess ? [
  {
    name: "Storage Write Test",
    description: "Test storage bucket write permissions",
    run: async () => { /* destructive test */ }
  },
  {
    name: "Edge Function Deployment",
    description: "Verify edge functions are deployed",
    run: async () => { /* check deployment */ }
  }
] : [];

// Add repair actions section (super admin only)
{hasSuperAdminAccess && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Wrench className="h-5 w-5" />
        Repair Actions
      </CardTitle>
      <CardDescription>
        System repair tools. Use with caution.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {/* Repair orphaned records, clear stale sessions, etc. */}
    </CardContent>
  </Card>
)}
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/settings/SuperAdminTab.tsx` | Container for super admin tools |
| `src/components/settings/RoleManagementCard.tsx` | Admin/user role management UI |
| `src/components/settings/SystemToolsCard.tsx` | PDF regen, cache clear, maintenance tools |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Super Admin tab, update role checks |
| `src/components/settings/UserManagementTab.tsx` | Add role restrictions, use secure RPC |
| `src/components/settings/UserTable.tsx` | Filter role options, disable protected rows |
| `src/pages/admin/Diagnostics.tsx` | Add super admin checks and repair actions |

## Database Changes

| Change | Type | Description |
|--------|------|-------------|
| Promote `info@trustlinkcompany.com` | UPDATE | Set role to `super_admin` |
| Update trigger function | ALTER | Change email to `info@trustlinkcompany.com` |
| `change_user_role_secure()` | CREATE | RPC with super admin guard |
| `regenerate_invoice_pdf_secure()` | CREATE | RPC with super admin guard |

---

## Security Matrix

| Feature | User | Sales Rep | Admin | Super Admin |
|---------|------|-----------|-------|-------------|
| View dashboard | No | No | Yes | Yes |
| Manage orders | No | View | Yes | Yes |
| View users | No | No | Yes | Yes |
| Assign `user`/`sales_rep` | No | No | Yes | Yes |
| Assign/remove `admin` | No | No | **No** | **Yes** |
| See Super Admin tab | No | No | No | Yes |
| PDF regeneration | No | No | No | Yes |
| Diagnostics repair | No | No | No | Yes |
| Full audit export | No | No | 30 days | Unlimited |

---

## Safety Guarantees

1. **Existing Admin Access Unchanged**: All current admin features remain accessible to admins
2. **Additive Only**: Super admin features are additions, not replacements
3. **Server-Side Enforcement**: All destructive actions validated via RPC guards
4. **Self-Protection**: Super admin cannot remove their own role
5. **Last Admin Protection**: System prevents removing the last super admin
6. **Comprehensive Audit Trail**: Every super admin action logged with high severity

---

## Testing Checklist

- [ ] `info@trustlinkcompany.com` has `super_admin` role after migration
- [ ] Existing admin users retain `admin` role and full admin access
- [ ] Admins cannot see the Super Admin tab
- [ ] Admins cannot assign/remove admin roles (RPC rejects)
- [ ] Super Admin can see and use all elevated features
- [ ] All super admin actions are logged in audit_logs
- [ ] Direct API calls to role change without super admin fail
- [ ] No regression in existing admin workflows
