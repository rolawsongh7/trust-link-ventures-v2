import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckCircle, Trash2, Send, UserPlus, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  entityType: 'orders' | 'quotes' | 'leads' | 'customers';
  onBulkStatusUpdate?: (status: string) => void;
  onBulkDelete?: () => void;
  onBulkExport?: () => void;
  onBulkAssign?: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedIds,
  onClearSelection,
  entityType,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkExport,
  onBulkAssign,
}) => {
  if (selectedIds.length === 0) return null;

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} ${entityType}?`)) {
      onBulkDelete?.();
      toast.success(`${selectedIds.length} ${entityType} deleted`);
    }
  };

  const handleBulkStatusUpdate = (status: string) => {
    onBulkStatusUpdate?.(status);
    toast.success(`${selectedIds.length} ${entityType} updated to ${status}`);
  };

  const getStatusOptions = () => {
    switch (entityType) {
      case 'orders':
        return ['pending_payment', 'payment_received', 'processing', 'shipped', 'delivered'];
      case 'quotes':
        return ['draft', 'sent', 'accepted', 'rejected'];
      case 'leads':
        return ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
      case 'customers':
        return ['active', 'prospect', 'inactive'];
      default:
        return [];
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-primary/10 border-b border-primary/20">
      <div className="flex-1">
        <span className="font-medium">{selectedIds.length} selected</span>
      </div>

      <div className="flex items-center gap-2">
        {onBulkStatusUpdate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {getStatusOptions().map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleBulkStatusUpdate(status)}
                >
                  {status.replace(/_/g, ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onBulkAssign && (
          <Button variant="outline" size="sm" onClick={onBulkAssign}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign
          </Button>
        )}

        {onBulkExport && (
          <Button variant="outline" size="sm" onClick={onBulkExport}>
            <Send className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}

        {onBulkDelete && (
          <Button variant="outline" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
    </div>
  );
};
