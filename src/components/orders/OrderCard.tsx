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
  Clock,
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TruckIcon
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
      'order_confirmed': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'pending_payment': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      'payment_received': 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      'processing': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      'ready_to_ship': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      'shipped': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      'delivered': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'cancelled': 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      'delivery_failed': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  };

  const getStatusBorderColor = (status: string) => {
    const colors: Record<string, string> = {
      'order_confirmed': 'border-l-blue-500',
      'pending_payment': 'border-l-yellow-500',
      'payment_received': 'border-l-green-500',
      'processing': 'border-l-purple-500',
      'ready_to_ship': 'border-l-indigo-500',
      'shipped': 'border-l-cyan-500',
      'delivered': 'border-l-emerald-500',
      'cancelled': 'border-l-red-500',
      'delivery_failed': 'border-l-orange-500'
    };
    return colors[status] || 'border-l-gray-500';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      'order_confirmed': CheckCircle2,
      'pending_payment': AlertCircle,
      'payment_received': CheckCircle2,
      'processing': Loader2,
      'ready_to_ship': Package,
      'shipped': TruckIcon,
      'delivered': CheckCircle2,
      'cancelled': AlertCircle,
      'delivery_failed': AlertCircle
    };
    return icons[status] || AlertCircle;
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCurrencyColor = (currency: string) => {
    const colors: Record<string, string> = {
      'USD': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300',
      'EUR': 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-300',
      'GBP': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300',
      'GHS': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-300'
    };
    return colors[currency] || 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-300';
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GHS': '₵'
    };
    return symbols[currency] || currency;
  };

  const StatusIcon = getStatusIcon(order.status);

  return (
    <Card className={`w-full border-l-4 ${getStatusBorderColor(order.status)} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-br from-card to-card/50`}>
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg tracking-tight truncate text-foreground">
              {order.order_number}
            </h3>
            <p className="text-sm font-medium text-muted-foreground truncate mt-0.5">
              {order.customers?.company_name || 'Unknown Customer'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Badge 
              variant="outline" 
              className={`${getStatusColor(order.status)} font-semibold text-xs px-3 py-1 gap-1.5 ${
                order.status === 'pending_payment' || order.status === 'processing' ? 'animate-pulse' : ''
              }`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {formatStatus(order.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-accent rounded-full">
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Highlighted Amount - Full Width */}
          <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Total Amount
                </p>
                <div className="flex items-baseline gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <p className="font-bold text-2xl text-foreground">
                    {getCurrencySymbol(order.currency)} {order.total_amount?.toLocaleString()}
                  </p>
                  <Badge variant="outline" className={`text-xs font-semibold ${getCurrencyColor(order.currency)}`}>
                    {order.currency}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Items Count */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Items
            </p>
            <p className="font-semibold text-lg flex items-center gap-2 text-foreground">
              <Package className="h-4 w-4 text-primary" />
              {order.order_items?.length || 0}
            </p>
          </div>

          {/* Created Date */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Created
            </p>
            <p className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              {format(new Date(order.created_at), 'MMM d, yyyy')}
            </p>
          </div>

          {/* Origin */}
          <div className="col-span-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Origin:</span>
            <Badge variant="outline" className="text-xs font-medium">
              {order.quote_id ? '🤖 Automated' : '✍️ Manual Entry'}
            </Badge>
          </div>
        </div>

        {/* Quote Reference */}
        {order.quotes?.quote_number && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">
                Linked Quote: <span className="font-semibold text-foreground">{order.quotes.quote_number}</span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
