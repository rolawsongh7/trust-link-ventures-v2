import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  FileText,
  Package,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderCardProps {
  order: any;
  onView?: (order: any) => void;
  onEdit?: (order: any) => void;
  onDelete?: (order: any) => void;
  onGenerateInvoice?: (order: any) => void;
}

export const OrderCard = ({
  order,
  onView,
  onEdit,
  onDelete,
  onGenerateInvoice
}: OrderCardProps) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'order_confirmed': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      'pending_payment': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
      'payment_received': 'bg-green-500/10 text-green-700 dark:text-green-300',
      'processing': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      'ready_to_ship': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
      'shipped': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      'delivered': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      'cancelled': 'bg-red-500/10 text-red-700 dark:text-red-300',
      'delivery_failed': 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{order.order_number}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {order.customers?.company_name || 'Unknown Customer'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Badge className={getStatusColor(order.status)}>
              {formatStatus(order.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(order)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(order)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </DropdownMenuItem>
                )}
                {onGenerateInvoice && (
                  <DropdownMenuItem onClick={() => onGenerateInvoice(order)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(order)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Amount</p>
            <p className="font-medium text-sm">
              {order.total_amount?.toLocaleString()} {order.currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Items</p>
            <p className="font-medium text-sm flex items-center gap-1">
              <Package className="h-3 w-3" />
              {order.order_items?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Created</p>
            <p className="font-medium text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(order.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Origin</p>
            <Badge variant="outline" className="text-xs">
              {order.quote_id ? 'Auto' : 'Manual'}
            </Badge>
          </div>
        </div>

        {/* Quote Reference */}
        {order.quotes?.quote_number && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Quote: <span className="font-medium text-foreground">{order.quotes.quote_number}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
