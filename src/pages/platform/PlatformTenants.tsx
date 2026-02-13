import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Globe } from 'lucide-react';
import { PlatformCreateTenantDialog } from '@/components/platform/CreateTenantDialog';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  domain: string | null;
  admin_domain: string | null;
  created_at: string;
}

export default function PlatformTenants() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('id, name, slug, status, domain, admin_domain, created_at')
        .order('name');
      if (error) throw error;
      return data as TenantRow[];
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Manage tenant organizations.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {tenants?.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {tenant.name}
                    <Badge variant={statusColor(tenant.status) as any} className="ml-2 text-xs">
                      {tenant.status}
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground font-mono">{tenant.slug}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {tenant.domain && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {tenant.domain}
                    </span>
                  )}
                  {tenant.admin_domain && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {tenant.admin_domain}
                    </span>
                  )}
                  {!tenant.domain && !tenant.admin_domain && (
                    <span className="italic">No custom domains</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlatformCreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
