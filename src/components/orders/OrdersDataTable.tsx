import React from 'react';
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
  Link2
} from 'lucide-react';
import { Column } from '@/components/ui/data-table';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  delivery_address_id?: string;
  quote_id?: string;
  customers: {
    company_name: string;
  };
  quotes?: {
    quote_number: string;
    title: string;
  } | null;
  customer_addresses?: {
    street_address: string;
    city: string;
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
  getStatusColor,
}) => {
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
      key: 'id' as keyof Order,
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
      key: 'id' as keyof Order,
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
            
            {row.status === 'order_confirmed' && (
              <DropdownMenuItem onClick={() => onConfirmPayment(row)}>
                <DollarSign className="mr-2 h-4 w-4" />
                Confirm Payment
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

  return (
    <DataTable
      data={orders}
      columns={columns}
      searchable={true}
      searchPlaceholder="Search by order number or customer..."
    />
  );
};
