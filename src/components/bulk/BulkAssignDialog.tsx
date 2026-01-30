import React, { useState } from 'react';
import { BulkActionDialog, BulkActionResult } from './BulkActionDialog';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Array<{
    id: string;
    order_number: string;
    assigned_to?: string | null;
  }>;
  onComplete: () => void;
}

export const BulkAssignDialog: React.FC<BulkAssignDialogProps> = ({
  open,
  onOpenChange,
  selectedOrders,
  onComplete,
}) => {
  const { staffMembers, loading: staffLoading } = useStaffMembers();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const selectedItems = selectedOrders.map((order) => ({
    id: order.id,
    identifier: order.order_number,
  }));

  const selectedStaff = staffMembers.find((s) => s.id === selectedStaffId);

  const handleExecute = async (): Promise<BulkActionResult> => {
    const success: string[] = [];
    const failed: { id: string; identifier: string; error: string }[] = [];

    const { data: { user } } = await supabase.auth.getUser();

    for (const order of selectedOrders) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ assigned_to: selectedStaffId || null })
          .eq('id', order.id);

        if (error) throw error;

        // Log individual assignment change
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          event_type: 'assignment_changed',
          action: 'UPDATE',
          resource_type: 'orders',
          resource_id: order.id,
          event_data: {
            previous_assignee: order.assigned_to,
            new_assignee: selectedStaffId || null,
            new_assignee_name: selectedStaff?.full_name || selectedStaff?.email,
            entity_type: 'order',
            entity_number: order.order_number,
            bulk_action: true,
          },
          severity: 'low',
        });

        success.push(order.id);
      } catch (error) {
        failed.push({
          id: order.id,
          identifier: order.order_number,
          error: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    if (success.length > 0) {
      toast({
        title: 'Bulk assignment complete',
        description: `${success.length} orders assigned to ${selectedStaff?.full_name || selectedStaff?.email || 'Unassigned'}`,
      });
    }

    return { success, failed };
  };

  const handleComplete = () => {
    setSelectedStaffId('');
    onComplete();
  };

  return (
    <BulkActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Assign Orders"
      description={`Assign ${selectedOrders.length} selected orders to a staff member.`}
      selectedItems={selectedItems}
      onExecute={handleExecute}
      onComplete={handleComplete}
      confirmLabel={
        selectedStaffId
          ? `Assign to ${selectedStaff?.full_name || selectedStaff?.email}`
          : 'Remove Assignment'
      }
      auditEventType="bulk_assignment"
      resourceType="orders"
    >
      <div className="space-y-3">
        <Label htmlFor="staff-select" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Assign to
        </Label>
        <Select
          value={selectedStaffId}
          onValueChange={setSelectedStaffId}
          disabled={staffLoading}
        >
          <SelectTrigger id="staff-select">
            <SelectValue placeholder={staffLoading ? 'Loading...' : 'Select staff member'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <span className="text-muted-foreground">Unassigned</span>
            </SelectItem>
            {staffMembers.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                <div className="flex flex-col">
                  <span>{staff.full_name || staff.email}</span>
                  {staff.full_name && (
                    <span className="text-xs text-muted-foreground">
                      {staff.email}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Leave empty to remove current assignments.
        </p>
      </div>
    </BulkActionDialog>
  );
};
