import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const createTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  status: z.enum(['active', 'trial', 'suspended']),
  ownerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTenantDialog({ open, onOpenChange }: CreateTenantDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: { name: '', slug: '', status: 'active', ownerEmail: '' },
  });

  const name = watch('name');

  // Auto-generate slug from name
  useEffect(() => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setValue('slug', slug);
  }, [name, setValue]);

  const onSubmit = async (data: CreateTenantForm) => {
    setIsSubmitting(true);
    try {
      // Check slug uniqueness
      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', data.slug)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Slug already exists', description: 'Choose a different name or slug.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Insert tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: data.name, slug: data.slug, status: data.status })
        .select('id')
        .single();

      if (tenantError) throw tenantError;

      // Optionally assign owner
      if (data.ownerEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', data.ownerEmail)
          .maybeSingle();

        if (profile) {
          await supabase.from('tenant_users').insert({
            tenant_id: tenant.id,
            user_id: profile.id,
            role: 'owner',
          });
        } else {
          toast({ title: 'Owner not found', description: `No user found with email ${data.ownerEmail}. Tenant created without an owner.` });
        }
      }

      toast({ title: 'Tenant created', description: `${data.name} has been created successfully.` });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'all'] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error creating tenant', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Tenant
          </DialogTitle>
          <DialogDescription>Add a new tenant organization to the platform.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Tenant Name *</Label>
            <Input id="tenant-name" placeholder="Acme Corp" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-slug">Slug *</Label>
            <Input id="tenant-slug" placeholder="acme-corp" {...register('slug')} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-status">Status</Label>
            <Select
              defaultValue="active"
              onValueChange={(v) => setValue('status', v as CreateTenantForm['status'])}
            >
              <SelectTrigger id="tenant-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-email">Owner Email (optional)</Label>
            <Input id="owner-email" type="email" placeholder="admin@acme.com" {...register('ownerEmail')} />
            {errors.ownerEmail && <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>}
            <p className="text-xs text-muted-foreground">If provided, this user will be assigned as the tenant owner.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tenant
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
