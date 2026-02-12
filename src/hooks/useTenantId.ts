import { useTenantContext } from '@/contexts/TenantContext';

/**
 * Convenience hook to get the current tenant ID.
 * Returns null if user is not associated with a tenant.
 */
export function useTenantId(): string | null {
  const { currentTenantId } = useTenantContext();
  return currentTenantId;
}
