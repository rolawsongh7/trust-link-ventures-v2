import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  FileText,
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TruckIcon,
  History,
  Mail,
  Link2,
  DollarSign,
  Send,
  Receipt,
  PlayCircle,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: any;
  onView?: (order: any) => void;
  onEdit?: (order: any) => void;
  onViewHistory?: (order: any) => void;
  onRequestAddress?: (order: any) => void;
  onLinkAddress?: (order: any) => void;
  onViewQuote?: (order: any) => void;
  onViewPaymentReceipt?: (order: any) => void;
  onVerifyPayment?: (order: any) => void;
  onConfirmPayment?: (order: any) => void;
  onQuickStatusChange?: (order: any, newStatus: 'processing' | 'ready_to_ship' | 'delivered') => void;
  onSendTracking?: (order: any) => void;
  getStatusColor?: (status: string) => string;
}

export const OrderCard = ({
  order,
  onView,
  onEdit,
  onViewHistory,
  onRequestAddress,
  onLinkAddress,
  onViewQuote,
  onViewPaymentReceipt,
  onVerifyPayment,
  onConfirmPayment,
  onQuickStatusChange,
  onSendTracking,
  getStatusColor: externalGetStatusColor,
}: OrderCardProps) => {
  const getStatusColor = externalGetStatusColor || ((status: string) => {
    const colors: Record<string, string> = {
      'order_confirmed': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200',
      'pending_payment': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200',
      'payment_received': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200',
      'processing': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200',
      'ready_to_ship': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200',
      'shipped': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200',
      'delivered': 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-200',
      'cancelled': 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200',
      'delivery_failed': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200'
    };
    return colors[status] || 'bg-muted/50 text-muted-foreground border-border';
  });

  const getStatusBorderColor = (status: string) => {
    const colors: Record<string, string> = {
      'order_confirmed': 'border-l-cyan-500',
      'pending_payment': 'border-l-yellow-500',
      'payment_received': 'border-l-emerald-500',
      'processing': 'border-l-purple-500',
      'ready_to_ship': 'border-l-indigo-500',
      'shipped': 'border-l-orange-500',
      'delivered': 'border-l-green-500',
      'cancelled': 'border-l-red-500',
      'delivery_failed': 'border-l-rose-500'
    };
    return colors[status] || 'border-l-border';
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
    const IconComponent = icons[status] || AlertCircle;
    return IconComponent;
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  const getOriginBadge = (order: any) => {
    if (order.quote_id) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-300">
          🤖 Auto
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
        ✍️ Manual
      </Badge>
    );
  };

  const getAddressBadge = (order: any) => {
    if (order.delivery_address_id) {
      return (
        <CheckCircle className="h-4 w-4 text-green-600" />
      );
    }
    
    if (['payment_received', 'processing', 'ready_to_ship'].includes(order.status)) {
      return (
        <AlertCircle className="h-4 w-4 text-red-600" />
      );
    }
    
    return (
      <MapPin className="h-4 w-4 text-muted-foreground" />
    );
  };

  const StatusIcon = getStatusIcon(order.status);
  const isPendingStatus = ['pending_payment', 'processing'].includes(order.status);

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-300 hover:shadow-xl",
      getStatusBorderColor(order.status),
      "bg-gradient-to-br from-background to-muted/10"
    )}>
      <CardContent className="p-4">
        {/* Header Section - Order Identity */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-border/50">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-bold text-lg leading-tight truncate text-foreground">
              {order.order_number}
            </h3>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {order.customers?.company_name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={cn(
              "border font-semibold shadow-sm whitespace-nowrap",
              getStatusColor(order.status),
              isPendingStatus && "animate-pulse"
            )}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {formatStatus(order.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 touch-safe hover:bg-accent">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 bg-background/95 backdrop-blur-sm border-2 shadow-2xl z-50"
              >
                <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
                  Order Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* View Actions */}
                <DropdownMenuGroup>
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(order)} className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4 text-blue-500" />
                      <span>View Details</span>
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(order)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4 text-blue-500" />
                      <span>Edit Order Details</span>
                    </DropdownMenuItem>
                  )}
                  {onViewHistory && (
                    <DropdownMenuItem onClick={() => onViewHistory(order)} className="cursor-pointer">
                      <History className="mr-2 h-4 w-4 text-blue-500" />
                      <span>View History</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>

                {/* Quote Actions */}
                {order.quote_id && onViewQuote && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onViewQuote(order)} className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4 text-indigo-500" />
                      <span>View Related Quote</span>
                    </DropdownMenuItem>
                  </>
                )}

                {/* Address Actions */}
                {!order.delivery_address_id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-orange-600">
                      Address Required
                    </DropdownMenuLabel>
                    {onRequestAddress && (
                      <DropdownMenuItem onClick={() => onRequestAddress(order)} className="cursor-pointer">
                        <Mail className="mr-2 h-4 w-4 text-orange-500" />
                        <span>Request Address</span>
                      </DropdownMenuItem>
                    )}
                    {onLinkAddress && order.delivery_address_requested_at && (
                      <DropdownMenuItem onClick={() => onLinkAddress(order)} className="cursor-pointer">
                        <Link2 className="mr-2 h-4 w-4 text-orange-500" />
                        <span>Link Existing Address</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* Payment Actions */}
                {order.status === 'pending_payment' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-yellow-600">
                      Payment Actions
                    </DropdownMenuLabel>
                    {order.payment_proof_url && onViewPaymentReceipt && (
                      <DropdownMenuItem onClick={() => onViewPaymentReceipt(order)} className="cursor-pointer">
                        <Receipt className="mr-2 h-4 w-4 text-yellow-500" />
                        <span>View Payment Receipt</span>
                      </DropdownMenuItem>
                    )}
                    {order.payment_proof_url && !order.payment_verified_at && onVerifyPayment && (
                      <DropdownMenuItem onClick={() => onVerifyPayment(order)} className="cursor-pointer">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span>Verify Payment Proof</span>
                      </DropdownMenuItem>
                    )}
                    {onConfirmPayment && (
                      <DropdownMenuItem onClick={() => onConfirmPayment(order)} className="cursor-pointer">
                        <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                        <span>Confirm Payment (Admin)</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* Processing Workflow Actions */}
                {order.status === 'payment_received' && onQuickStatusChange && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-purple-600">
                      Processing Actions
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onQuickStatusChange(order, 'processing')} className="cursor-pointer">
                      <PlayCircle className="mr-2 h-4 w-4 text-purple-500" />
                      <span>Start Processing</span>
                    </DropdownMenuItem>
                  </>
                )}

                {order.status === 'processing' && onQuickStatusChange && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onQuickStatusChange(order, 'ready_to_ship')} className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4 text-indigo-500" />
                      <span>Mark Ready to Ship</span>
                    </DropdownMenuItem>
                  </>
                )}

                {/* Shipping Actions */}
                {order.delivery_address_id && ['payment_received', 'processing', 'ready_to_ship'].includes(order.status) && onSendTracking && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-cyan-600">
                      Shipping Actions
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onSendTracking(order)} className="cursor-pointer">
                      <Send className="mr-2 h-4 w-4 text-cyan-500" />
                      <span>Manage Shipping & Status</span>
                    </DropdownMenuItem>
                  </>
                )}

                {order.status === 'shipped' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-orange-600">
                      Delivery Actions
                    </DropdownMenuLabel>
                    {onSendTracking && (
                      <DropdownMenuItem onClick={() => onSendTracking(order)} className="cursor-pointer">
                        <TruckIcon className="mr-2 h-4 w-4 text-orange-500" />
                        <span>Update Tracking Info</span>
                      </DropdownMenuItem>
                    )}
                    {onSendTracking && (
                      <DropdownMenuItem onClick={() => onSendTracking(order)} className="cursor-pointer">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span>Complete Delivery (POD Required)</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {order.status === 'delivery_confirmation_pending' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-amber-600">
                      Pending POD
                    </DropdownMenuLabel>
                    {onSendTracking && (
                      <DropdownMenuItem onClick={() => onSendTracking(order)} className="cursor-pointer">
                        <CheckCircle className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Confirm Delivery (POD Required)</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Financial Section - Highlighted */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 mb-4 border border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-medium">
                Total Amount
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {getCurrencySymbol(order.currency)} {order.total_amount?.toLocaleString()}
                </span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {order.currency}
                </Badge>
              </div>
            </div>
            <DollarSign className="h-10 w-10 text-primary/20" />
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <Package className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Items</p>
            <p className="text-sm font-semibold text-foreground">{order.order_items?.length || 0}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <Clock className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-semibold text-foreground">
              {format(new Date(order.created_at), 'MMM d')}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {getAddressBadge(order)}
            </div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-xs font-semibold text-foreground">
              {order.delivery_address_id ? 'Set' : 'Needed'}
            </p>
          </div>
        </div>

        {/* Secondary Info - Badges */}
        <div className="flex flex-wrap gap-2">
          {getOriginBadge(order)}
          {order.quotes && (
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-700 border-indigo-300">
              <FileSpreadsheet className="mr-1 h-3 w-3" />
              Quote: {order.quotes.quote_number}
            </Badge>
          )}
          {order.payment_verified_at && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Payment Verified
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
