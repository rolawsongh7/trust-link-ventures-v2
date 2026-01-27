import React, { useState, useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreHorizontal, 
  Edit, 
  History, 
  Mail, 
  MapPin, 
  DollarSign, 
  Send, 
  Eye,
  Lock,
  Unlock,
  Link2,
  Download,
  FileText,
  FileSpreadsheet,
  Package,
  CheckCircle,
  Zap,
  PenLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Receipt
} from 'lucide-react';
import { Column } from '@/components/ui/data-table';
import { DataExporter } from '@/lib/exportHelpers';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { OrderCard } from './OrderCard';
import { OrdersSearchFilters } from './OrdersSearchFilters';
import { SearchFilters } from '@/types/filters';
import { AddressLinkDialog } from './AddressLinkDialog';
import { PaymentReceiptPreviewDialog } from './PaymentReceiptPreviewDialog';
import { OrderStatusProgress } from './OrderStatusProgress';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  delivery_address_id?: string;
  delivery_address_requested_at?: string;
  customer_id: string;
  quote_id?: string;
  payment_reference?: string;
  payment_proof_url?: string;
  payment_proof_uploaded_at?: string;
  payment_verified_by?: string;
  payment_verified_at?: string;
  payment_amount_confirmed?: number;
  payment_status_reason?: string;
  notes?: string;
  order_items: any[];
  customers: {
    id: string;
    company_name: string;
    contact_name?: string;
    email?: string;
  };
  quotes?: {
    quote_number: string;
    title: string;
  } | null;
  customer_addresses?: {
    street_address: string;
    city: string;
    region: string;
    ghana_digital_address?: string;
  } | null;
}

interface OrdersDataTableProps {
  orders: Order[];
  onEditDetails: (order: Order) => void;
  onViewHistory: (order: Order) => void;
  onRequestAddress: (order: Order) => void;
  onConfirmPayment: (order: Order) => void;
  onSendTracking: (order: Order) => void;
  onViewQuote: (order: Order) => void;
  onRefresh: () => void;
  onQuickStatusChange: (order: Order, newStatus: 'processing' | 'ready_to_ship' | 'delivered') => void;
  onVerifyPayment: (order: Order) => void;
  getStatusColor: (status: string) => string;
  onRequestBalancePayment?: (order: Order) => void;
  onMoveToProcessingPartial?: (order: Order) => void;
}

// Professional icon-based origin indicator
const getOriginIndicator = (order: Order) => {
  if (order.quote_id) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 gap-1">
              <Zap className="h-3 w-3" />
              Auto
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Auto-generated from accepted quote</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 gap-1">
            <PenLine className="h-3 w-3" />
            Manual
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Manually created order</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Professional address status indicator (icon only)
const getAddressIndicator = (order: Order) => {
  if (order.delivery_address_id) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/50">
              <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Delivery address confirmed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (['payment_received', 'processing', 'ready_to_ship'].includes(order.status)) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/50">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Address required for shipping</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>No address set</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Payment status indicator (simplified)
const getPaymentIndicator = (order: Order) => {
  // Check if payment was rejected
  if ((order as any).payment_rejected_at) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 gap-1">
              <XCircle className="h-3 w-3" />
              Rejected
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {(order as any).payment_status_reason && <div className="text-xs">{(order as any).payment_status_reason}</div>}
            Payment proof was rejected
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Check for verified PARTIAL payment
  if (order.payment_verified_at && order.payment_status_reason?.toLowerCase().includes('partial')) {
    const confirmed = order.payment_amount_confirmed || 0;
    const balance = order.total_amount - confirmed;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 gap-1">
              <DollarSign className="h-3 w-3" />
              Partial ({order.currency} {balance.toLocaleString()} due)
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div>Received: {order.currency} {confirmed.toLocaleString()}</div>
              <div className="font-semibold">Balance: {order.currency} {balance.toLocaleString()}</div>
              {order.payment_reference && <div className="font-mono text-xs">{order.payment_reference}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (order.payment_verified_at) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {order.payment_reference && <div className="font-mono text-xs">{order.payment_reference}</div>}
            Payment verified
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (order.payment_proof_url) {
    return (
      <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  
  if (order.payment_reference) {
    return (
      <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 gap-1">
        <Receipt className="h-3 w-3" />
        Ref: {order.payment_reference.slice(0, 8)}...
      </Badge>
    );
  }
  
  return (
    <span className="text-muted-foreground text-sm">—</span>
  );
};

// Check if order can transition to processing (requires verified payment)
const canTransitionToProcessing = (order: Order): { allowed: boolean; reason?: string } => {
  if (!order.payment_verified_at) {
    return { allowed: false, reason: 'Payment must be verified before processing' };
  }
  return { allowed: true };
};

// Check if order has verified partial payment
const hasVerifiedPartialPayment = (order: Order): boolean => {
  if (!order.payment_verified_at) return false;
  const confirmedAmount = order.payment_amount_confirmed || 0;
  return confirmedAmount > 0 && confirmedAmount < order.total_amount;
};

// Get remaining balance for partial payments
const getRemainingBalance = (order: Order): number => {
  const confirmedAmount = order.payment_amount_confirmed || 0;
  return order.total_amount - confirmedAmount;
};

export const OrdersDataTable: React.FC<OrdersDataTableProps> = ({
  orders,
  onEditDetails,
  onViewHistory,
  onRequestAddress,
  onConfirmPayment,
  onSendTracking,
  onViewQuote,
  onRefresh,
  onQuickStatusChange,
  onVerifyPayment,
  getStatusColor,
  onRequestBalancePayment,
  onMoveToProcessingPartial,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { isMobile, isTablet } = useMobileDetection();
  const [addressLinkDialog, setAddressLinkDialog] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
    customerId: string;
  } | null>(null);
  const [receiptPreviewDialog, setReceiptPreviewDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({
    open: false,
    order: null,
  });
  const [filters, setFilters] = useState<SearchFilters>({
    customer: '',
    orderNumber: '',
    status: [],
    dateRange: null,
    amountRange: null,
    origin: 'all',
    currency: [],
    paymentStatus: 'all'
  });

  // Apply filters to orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Customer filter
      if (filters.customer && !order.customers?.company_name?.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      // Order number filter
      if (filters.orderNumber && !order.order_number.toLowerCase().includes(filters.orderNumber.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(order.status)) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const orderDate = new Date(order.created_at);
        if (orderDate < filters.dateRange.from || orderDate > filters.dateRange.to) {
          return false;
        }
      }

      // Amount range filter
      if (filters.amountRange && (filters.amountRange.min > 0 || filters.amountRange.max > 0)) {
        if (filters.amountRange.min > 0 && order.total_amount < filters.amountRange.min) {
          return false;
        }
        if (filters.amountRange.max > 0 && order.total_amount > filters.amountRange.max) {
          return false;
        }
      }

      // Origin filter
      if (filters.origin !== 'all') {
        if (filters.origin === 'auto' && !order.quote_id) {
          return false;
        }
        if (filters.origin === 'manual' && order.quote_id) {
          return false;
        }
      }

      // Currency filter
      if (filters.currency.length > 0 && !filters.currency.includes(order.currency)) {
        return false;
      }

      // Payment status filter
      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        if (filters.paymentStatus === 'verified' && !order.payment_verified_at) {
          return false;
        }
        if (filters.paymentStatus === 'unverified' && (order.payment_verified_at || (order as any).payment_rejected_at)) {
          return false;
        }
        if (filters.paymentStatus === 'rejected' && !(order as any).payment_rejected_at) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filters]);

  const handleClearFilters = () => {
    setFilters({
      customer: '',
      orderNumber: '',
      status: [],
      dateRange: null,
      amountRange: null,
      origin: 'all',
      currency: [],
      paymentStatus: 'all'
    });
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      await DataExporter.exportOrders(orders, { format });
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'order_number' as keyof Order,
      label: 'Order',
      sortable: true,
      width: '200px',
      render: (value: string, row: Order) => (
        <div className="space-y-1.5">
          <div className="font-semibold text-foreground">{value}</div>
          <div className="flex items-center gap-2">
            {getOriginIndicator(row)}
            {row.quotes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewQuote(row); }}
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <Link2 className="h-3 w-3 mr-0.5" />
                      {row.quotes.quote_number}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{row.quotes.title || 'View quote'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'customer_name' as keyof Order,
      label: 'Customer',
      sortable: true,
      width: '180px',
      render: (value: any, row: Order) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[180px]">
                <div className="font-medium truncate">
                  {row.customers?.company_name || (
                    <span className="text-muted-foreground italic">No customer</span>
                  )}
                </div>
                {row.customers?.contact_name && (
                  <div className="text-xs text-muted-foreground truncate">
                    {row.customers.contact_name}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="font-medium">{row.customers?.company_name}</div>
                {row.customers?.contact_name && <div>{row.customers.contact_name}</div>}
                {row.customers?.email && <div className="text-xs">{row.customers.email}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      key: 'total_amount' as keyof Order,
      label: 'Amount',
      sortable: true,
      width: '130px',
      render: (value: number, row: Order) => (
        <div className="font-semibold tabular-nums">
          {row.currency} {value.toLocaleString()}
        </div>
      ),
    },
    {
      key: 'status' as keyof Order,
      label: 'Status',
      sortable: true,
      filterable: true,
      width: '200px',
      render: (value: string, row: Order) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(value)}>
              {value.replace(/_/g, ' ')}
            </Badge>
            {getAddressIndicator(row)}
          </div>
          <OrderStatusProgress currentStatus={value} size="sm" />
        </div>
      ),
    },
    {
      key: 'payment_reference' as keyof Order,
      label: 'Payment',
      sortable: false,
      width: '140px',
      render: (value: any, row: Order) => (
        <div className="flex items-center gap-2">
          {getPaymentIndicator(row)}
          {row.payment_proof_url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReceiptPreviewDialog({ open: true, order: row });
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View payment receipt</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    },
    {
      key: 'created_at' as keyof Order,
      label: 'Date',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <div className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short' 
          })}
        </div>
      ),
    },
    {
      key: 'id' as keyof Order,
      label: 'Actions',
      sortable: false,
      width: '80px',
      render: (value: any, row: Order) => (
        <div onClick={(e) => e.stopPropagation()} data-dropdown-cell>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="z-[9999] bg-background border-2 shadow-xl min-w-[220px]"
              onClick={(e) => e.stopPropagation()}
            >
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onEditDetails(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onViewHistory(row)}>
              <History className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>
            
            {row.quotes && (
              <DropdownMenuItem onClick={() => onViewQuote(row)}>
                <Eye className="mr-2 h-4 w-4" />
                View Related Quote
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            {!row.delivery_address_id && (
              <DropdownMenuItem onClick={() => onRequestAddress(row)}>
                <MapPin className="mr-2 h-4 w-4" />
                Request Address
              </DropdownMenuItem>
            )}
            
            {!row.delivery_address_id && row.delivery_address_requested_at && row.customers && (
              <DropdownMenuItem 
                onClick={() => setAddressLinkDialog({
                  open: true,
                  orderId: row.id,
                  orderNumber: row.order_number,
                  customerId: row.customers.id,
                })}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Link Existing Address
              </DropdownMenuItem>
            )}
            
            {/* Payment actions based on status */}
            {row.status === 'pending_payment' && row.payment_proof_url && !row.payment_verified_at && (
              <DropdownMenuItem onClick={() => onVerifyPayment(row)} className="text-green-600">
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Payment Proof
              </DropdownMenuItem>
            )}
            
            {!['shipped', 'delivered', 'cancelled'].includes(row.status) && !row.payment_proof_url && (
              <DropdownMenuItem onClick={() => onConfirmPayment(row)}>
                <DollarSign className="mr-2 h-4 w-4" />
                {row.payment_reference ? 'Update Payment Info' : 'Confirm Payment (Admin)'}
              </DropdownMenuItem>
            )}
            
            {/* Partial Payment Actions */}
            {hasVerifiedPartialPayment(row) && row.status === 'pending_payment' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-amber-600 text-xs">Partial Payment Actions</DropdownMenuLabel>
                {onRequestBalancePayment && (
                  <DropdownMenuItem onClick={() => onRequestBalancePayment(row)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Request Balance Payment
                  </DropdownMenuItem>
                )}
                {onMoveToProcessingPartial && (
                  <DropdownMenuItem onClick={() => onMoveToProcessingPartial(row)}>
                    <Package className="mr-2 h-4 w-4" />
                    Move to Processing (Partial)
                  </DropdownMenuItem>
                )}
              </>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Quick Status Actions - Block processing without verified payment */}
            {row.status === 'payment_received' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem 
                      onClick={() => {
                        const check = canTransitionToProcessing(row);
                        if (check.allowed) {
                          onQuickStatusChange(row, 'processing');
                        }
                      }}
                      disabled={!row.payment_verified_at}
                      className={!row.payment_verified_at ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Start Processing
                      {!row.payment_verified_at && (
                        <AlertTriangle className="ml-auto h-3 w-3 text-amber-500" />
                      )}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  {!row.payment_verified_at && (
                    <TooltipContent>Payment must be verified before processing</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Block shipping for partial payments */}
            {row.status === 'processing' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem 
                      onClick={() => !hasVerifiedPartialPayment(row) && onQuickStatusChange(row, 'ready_to_ship')}
                      disabled={hasVerifiedPartialPayment(row)}
                      className={hasVerifiedPartialPayment(row) ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Mark Ready to Ship
                      {hasVerifiedPartialPayment(row) && (
                        <Lock className="ml-auto h-3 w-3 text-amber-500" />
                      )}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  {hasVerifiedPartialPayment(row) && (
                    <TooltipContent>Full payment required before shipping ({row.currency} {getRemainingBalance(row).toLocaleString()} outstanding)</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            
            {row.status === 'shipped' && (
              <DropdownMenuItem onClick={() => onSendTracking(row)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Delivery (POD Required)
              </DropdownMenuItem>
            )}
            
            {row.status === 'delivery_confirmation_pending' && (
              <DropdownMenuItem onClick={() => onSendTracking(row)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Delivery (POD Required)
              </DropdownMenuItem>
            )}
            
            {row.delivery_address_id && ['payment_received', 'processing', 'ready_to_ship'].includes(row.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSendTracking(row)}>
                  <Send className="mr-2 h-4 w-4" />
                  Manage Shipping & Status
                </DropdownMenuItem>
              </>
            )}
            
            {['shipped'].includes(row.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSendTracking(row)}>
                  <Send className="mr-2 h-4 w-4" />
                  Update Tracking Info
                </DropdownMenuItem>
              </>
            )}
            
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      ),
    },
  ];

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <OrdersSearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting || filteredOrders.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onView={onEditDetails}
                onEdit={onEditDetails}
                onViewHistory={onViewHistory}
                onRequestAddress={onRequestAddress}
                onLinkAddress={(order) => setAddressLinkDialog({ 
                  open: true, 
                  orderId: order.id,
                  orderNumber: order.order_number,
                  customerId: order.customer_id 
                })}
                onViewQuote={onViewQuote}
                onViewPaymentReceipt={(order) => setReceiptPreviewDialog({ open: true, order })}
                onVerifyPayment={onVerifyPayment}
                onConfirmPayment={onConfirmPayment}
                onQuickStatusChange={onQuickStatusChange}
                onSendTracking={onSendTracking}
                getStatusColor={getStatusColor}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // Desktop/Tablet view
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <OrdersSearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting || filteredOrders.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <DataTable
        data={filteredOrders}
        columns={columns}
        searchable={true}
        searchPlaceholder="Quick search by order number or customer..."
      />

      {addressLinkDialog && (
        <AddressLinkDialog
          open={addressLinkDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setAddressLinkDialog(null);
            }
          }}
          orderId={addressLinkDialog.orderId}
          orderNumber={addressLinkDialog.orderNumber}
          customerId={addressLinkDialog.customerId}
          onSuccess={onRefresh}
        />
      )}
      
      <PaymentReceiptPreviewDialog
        open={receiptPreviewDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setReceiptPreviewDialog({ open: false, order: null });
          }
        }}
        order={receiptPreviewDialog.order}
      />
    </div>
  );
};
