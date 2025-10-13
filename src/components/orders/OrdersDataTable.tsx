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
  FileSpreadsheet
} from 'lucide-react';
import { Column } from '@/components/ui/data-table';
import { DataExporter } from '@/lib/exportHelpers';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { OrderCard } from './OrderCard';
import { OrdersSearchFilters } from './OrdersSearchFilters';
import { SearchFilters } from '@/types/filters';
import { AddressLinkDialog } from './AddressLinkDialog';

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
  const [filters, setFilters] = useState<SearchFilters>({
    customer: '',
    orderNumber: '',
    status: [],
    dateRange: null,
    amountRange: null,
    origin: 'all'
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
      origin: 'all'
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
          {row.customers?.company_name}
        </div>
      ),
    },
    {
      key: 'quote_id' as keyof Order,
      label: 'Quote Link',
      sortable: false,
      width: '180px',
      render: (value: any, row: Order) => {
        if (row.quotes) {
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
          <Badge variant="outline" className="text-gray-500">
            No Quote
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
                  window.open(row.payment_proof_url, '_blank');
                }}
              >
                <FileText className="mr-1 h-3 w-3" />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
            
            {!['shipped', 'delivered', 'cancelled'].includes(row.status) && (
              <DropdownMenuItem onClick={() => onConfirmPayment(row)}>
                <DollarSign className="mr-2 h-4 w-4" />
                {row.payment_reference ? 'Update Payment Info' : 'Confirm Payment'}
              </DropdownMenuItem>
            )}
            
            {['shipped', 'ready_to_ship', 'processing'].includes(row.status) && (
              <DropdownMenuItem onClick={() => onSendTracking(row)}>
                <Send className="mr-2 h-4 w-4" />
                Send Tracking Link
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
                onGenerateInvoice={() => {}}
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
          onOpenChange={(open) => !open && setAddressLinkDialog(null)}
          orderId={addressLinkDialog.orderId}
          orderNumber={addressLinkDialog.orderNumber}
          customerId={addressLinkDialog.customerId}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
