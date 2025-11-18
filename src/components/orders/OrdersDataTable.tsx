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
  CheckCircle
} from 'lucide-react';
import { Column } from '@/components/ui/data-table';
import { DataExporter } from '@/lib/exportHelpers';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { OrderCard } from './OrderCard';
import { OrdersSearchFilters } from './OrdersSearchFilters';
import { SearchFilters } from '@/types/filters';
import { AddressLinkDialog } from './AddressLinkDialog';
import { PaymentReceiptPreviewDialog } from './PaymentReceiptPreviewDialog';

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
}

const getOriginBadge = (order: Order) => {
  if (order.quote_id) {
    return (
      <Badge variant="default" className="bg-blue-500 text-white">
        <span className="mr-1">🤖</span>
        Auto
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="bg-amber-500 text-white">
      <span className="mr-1">✍️</span>
      Manual
    </Badge>
  );
};

const getAddressBadge = (order: Order) => {
  if (order.delivery_address_id) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        ✅ Confirmed
      </Badge>
    );
  }
  
  if (['payment_received', 'processing', 'ready_to_ship'].includes(order.status)) {
    return (
      <Badge variant="destructive">
        ⚠️ Required
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-gray-500">
      ❌ Not Set
    </Badge>
  );
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
    currency: []
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
      currency: []
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
      label: 'Order Number',
      sortable: true,
      width: '150px',
      render: (value: string) => (
        <div className="font-medium">{value}</div>
      ),
    },
    {
      key: 'customer_name' as keyof Order,
      label: 'Customer',
      sortable: true,
      render: (value: any, row: Order) => (
        <div className="max-w-[200px] truncate">
          {row.customers?.company_name || (
            <span className="text-muted-foreground italic text-sm">No customer</span>
          )}
        </div>
      ),
    },
    {
      key: 'quote_id' as keyof Order,
      label: 'Quote Link',
      sortable: false,
      width: '180px',
      render: (value: any, row: Order) => {
        if (row.quotes && row.quotes.quote_number) {
          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 border-blue-200">
                <Link2 className="w-3 h-3 mr-1" />
                {row.quotes.quote_number}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewQuote(row)}
                title="View related quote"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Manual Order
          </Badge>
        );
      },
    },
    {
      key: 'origin' as keyof Order,
      label: 'Origin',
      sortable: false,
      width: '120px',
      render: (value: any, row: Order) => (
        <div title={row.quote_id ? "Auto-generated from accepted quote" : "Manually created order"}>
          {getOriginBadge(row)}
        </div>
      ),
    },
    {
      key: 'total_amount' as keyof Order,
      label: 'Amount',
      sortable: true,
      width: '140px',
      render: (value: number, row: Order) => (
        <div className="font-medium">
          {value.toLocaleString()} {row.currency}
        </div>
      ),
    },
    {
      key: 'status' as keyof Order,
      label: 'Status',
      sortable: true,
      filterable: true,
      width: '150px',
      render: (value: string, row: Order) => (
        <Badge className={getStatusColor(value)}>
          {value.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'payment_reference' as keyof Order,
      label: 'Payment Details',
      sortable: false,
      width: '200px',
      render: (value: any, row: Order) => {
        if (!value && !row.payment_proof_url) {
          return <Badge variant="secondary">Not Confirmed</Badge>;
        }
        
        return (
          <div className="space-y-1">
            {value && (
              <div className="font-mono text-xs font-semibold text-primary">
                {value}
              </div>
            )}
            {row.payment_proof_url && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptPreviewDialog({
                    open: true,
                    order: row,
                  });
                }}
              >
                <Eye className="mr-1 h-3 w-3" />
                View Receipt
              </Button>
            )}
          </div>
        );
      }
    },
    {
      key: 'delivery_address_id' as keyof Order,
      label: 'Delivery Address',
      sortable: false,
      width: '160px',
      render: (value: any, row: Order) => getAddressBadge(row),
    },
    {
      key: 'created_at' as keyof Order,
      label: 'Created',
      sortable: true,
      width: '120px',
      render: (value: string) => new Date(value).toLocaleDateString(),
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
            
            <DropdownMenuSeparator />
            
            {/* Quick Status Actions */}
            {row.status === 'payment_received' && (
              <DropdownMenuItem onClick={() => onQuickStatusChange(row, 'processing')}>
                <Package className="mr-2 h-4 w-4" />
                Start Processing
              </DropdownMenuItem>
            )}
            
            {row.status === 'processing' && (
              <DropdownMenuItem onClick={() => onQuickStatusChange(row, 'ready_to_ship')}>
                <Package className="mr-2 h-4 w-4" />
                Mark Ready to Ship
              </DropdownMenuItem>
            )}
            
            {row.status === 'shipped' && (
              <DropdownMenuItem onClick={() => onQuickStatusChange(row, 'delivered')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Delivered
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
