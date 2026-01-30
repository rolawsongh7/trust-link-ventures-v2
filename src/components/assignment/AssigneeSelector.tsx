import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Loader2, UserCircle, UserX } from 'lucide-react';
import { useStaffMembers, StaffMember } from '@/hooks/useStaffMembers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AssigneeSelectorProps {
  entityType: 'orders' | 'quotes' | 'order_issues';
  entityId: string;
  entityNumber: string; // For audit logging (order_number, quote_number, etc.)
  currentAssigneeId?: string | null;
  onAssignmentChange?: (newAssigneeId: string | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Dropdown selector to assign a staff member to an order, quote, or issue.
 * Logs assignment changes to audit_logs.
 */
export const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({
  entityType,
  entityId,
  entityNumber,
  currentAssigneeId,
  onAssignmentChange,
  disabled = false,
  size = 'sm',
}) => {
  const { user } = useAuth();
  const { staffMembers, loading: loadingStaff } = useStaffMembers();
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  const currentAssignee = staffMembers.find(s => s.id === currentAssigneeId);

  const handleAssign = async (staffMember: StaffMember | null) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const previousAssigneeId = currentAssigneeId;
      const newAssigneeId = staffMember?.id || null;

      // Update the entity
      const { error: updateError } = await supabase
        .from(entityType)
        .update({ assigned_to: newAssigneeId })
        .eq('id', entityId);

      if (updateError) throw updateError;

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'assignment_changed',
        action: 'UPDATE',
        resource_type: entityType,
        resource_id: entityId,
        event_data: {
          previous_assignee: previousAssigneeId,
          new_assignee: newAssigneeId,
          entity_type: entityType.replace(/_/g, ' ').slice(0, -1), // "order", "quote", "order issue"
          entity_number: entityNumber,
          assignee_name: staffMember?.full_name || staffMember?.email || null,
        },
        severity: 'low',
      });

      toast.success(
        staffMember 
          ? `Assigned to ${staffMember.full_name || staffMember.email}`
          : 'Assignment removed'
      );

      onAssignmentChange?.(newAssigneeId);
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setIsUpdating(false);
      setOpen(false);
    }
  };

  const getDisplayContent = () => {
    if (loadingStaff || isUpdating) {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading...</span>
        </>
      );
    }

    if (!currentAssignee) {
      return (
        <>
          <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Assign</span>
        </>
      );
    }

    const displayName = currentAssignee.full_name || currentAssignee.email?.split('@')[0] || 'Unknown';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
      <>
        <Avatar className="h-4 w-4">
          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[80px] truncate">{displayName}</span>
      </>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isUpdating}
          className={`gap-1.5 ${size === 'sm' ? 'h-7 text-xs px-2' : 'h-8 text-sm px-3'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {getDisplayContent()}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Assign to staff</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {currentAssigneeId && (
          <>
            <DropdownMenuItem
              onClick={() => handleAssign(null)}
              className="text-muted-foreground"
            >
              <UserX className="mr-2 h-4 w-4" />
              Remove assignment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {loadingStaff ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No staff members found
          </div>
        ) : (
          staffMembers.map((staff) => {
            const displayName = staff.full_name || staff.email?.split('@')[0] || 'Unknown';
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const isSelected = staff.id === currentAssigneeId;
            const roleLabel = staff.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

            return (
              <DropdownMenuItem
                key={staff.id}
                onClick={() => handleAssign(staff)}
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
