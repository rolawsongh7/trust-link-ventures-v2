import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, 
  Play, 
  Truck, 
  UserPlus, 
  Eye,
  Package
} from 'lucide-react';
import { SLABadge } from './SLABadge';
import { AssigneeBadge } from '@/components/assignment/AssigneeBadge';
import { getDaysInCurrentStage } from '@/utils/slaHelpers';
import type { Order } from '@/hooks/useOrdersQuery';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface OperationsQueueRowProps {
  order: Order;
  onAction: (order: Order, action: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (orderId: string) => void;
  showAssignee?: boolean;
}

const statusLabels: Record<string, string> = {
  pending_payment: 'Pending Payment',
  order_confirmed: 'Payment Confirmed',
  processing: 'Processing',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed_delivery: 'Failed Delivery',
};

const statusColors: Record<string, string> = {
  pending_payment: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  order_confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  processing: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  ready_to_ship: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  shipped: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  failed_delivery: 'bg-red-500/10 text-red-500 border-red-500/30',
};

function getPrimaryAction(order: Order): { label: string; action: string; icon: React.ElementType } | null {
  switch (order.status) {
    case 'pending_payment':
      return { label: 'Verify Payment', action: 'verify_payment', icon: CreditCard };
    case 'order_confirmed':
      return { label: 'Start Processing', action: 'start_processing', icon: Play };
    case 'processing':
      return { label: 'Mark Ready', action: 'mark_ready', icon: Package };
    case 'ready_to_ship':
      return { label: 'Mark Shipped', action: 'mark_shipped', icon: Truck };
    case 'shipped':
      return { label: 'View Tracking', action: 'view_tracking', icon: Eye };
    default:
      return null;
  }
}

export function OperationsQueueRow({ 
  order, 
  onAction, 
  isSelected = false, 
  onToggleSelect,
  showAssignee = true 
}: OperationsQueueRowProps) {
  const navigate = useNavigate();
  const daysInStage = getDaysInCurrentStage(order);
  const primaryAction = getPrimaryAction(order);
  
  const handleRowClick = () => {
    navigate(`/admin/orders?viewId=${order.id}`);
  };
  
  return (
    <TableRow 
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'bg-primary/5'
      )}
    >
      {onToggleSelect && (
        <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(order.id)}
          />
        </TableCell>
      )}
      
      <TableCell onClick={handleRowClick}>
        <div className="font-medium text-foreground">{order.order_number}</div>
        <div className="text-xs text-muted-foreground">
          {order.customers?.company_name || 'Unknown Customer'}
        </div>
      </TableCell>
      
      <TableCell onClick={handleRowClick}>
        <Badge 
          variant="outline" 
          className={cn('font-medium', statusColors[order.status] || '')}
        >
          {statusLabels[order.status] || order.status}
        </Badge>
      </TableCell>
      
      <TableCell onClick={handleRowClick}>
        <SLABadge order={order} showReason />
      </TableCell>
      
      {showAssignee && (
        <TableCell onClick={handleRowClick}>
          <AssigneeBadge 
            assigneeId={order.assigned_to} 
            size="sm"
          />
        </TableCell>
      )}
      
      <TableCell onClick={handleRowClick} className="text-muted-foreground">
        {daysInStage} day{daysInStage !== 1 ? 's' : ''}
      </TableCell>
      
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {primaryAction ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(order, primaryAction.action)}
            className="gap-1.5"
          >
            <primaryAction.icon className="h-3.5 w-3.5" />
            {primaryAction.label}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRowClick}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
