import { useState } from 'react';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Eye, RotateCcw, MapPin, Upload, ChevronDown, ChevronUp } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  estimated_delivery_date?: string;
  tracking_number?: string;
  delivery_address_id?: string;
  delivery_address_requested_at?: string;
  order_items?: any[];
  quotes?: {
    quote_number: string;
    customers?: {
      company_name: string;
      contact_name: string;
    };
  };
}

interface MobileOrderCardProps {
  order: Order;
  onTrack: () => void;
  onReorder: () => void;
  onViewInvoices: () => void;
  onAddAddress: () => void;
  onUploadPayment: () => void;
}

export const MobileOrderCard = ({ 
  order, 
  onTrack, 
  onReorder, 
  onViewInvoices,
  onAddAddress,
  onUploadPayment 
}: MobileOrderCardProps) => {
  const [showItems, setShowItems] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quote_pending': return 'bg-gray-100 text-gray-800';
      case 'quote_sent': return 'bg-blue-100 text-blue-800';
      case 'order_confirmed': return 'bg-cyan-100 text-cyan-800';
      case 'payment_received': return 'bg-emerald-100 text-emerald-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'ready_to_ship': return 'bg-indigo-100 text-indigo-800';
      case 'shipped': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const StatusIcon = order.status === 'shipped' ? Truck : Package;
  const needsAddress = !order.delivery_address_id && ['payment_received', 'processing'].includes(order.status);
  const needsPaymentProof = order.status === 'order_confirmed';

  return (
    <InteractiveCard variant="elevated" className="p-4 space-y-3" onClick={() => onTrack()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">{order.order_number}</div>
            <div className="text-lg font-bold text-foreground">
              {getCurrencySymbol(order.currency)}{Number(order.total_amount).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Status and Date */}
      <div className="flex items-center justify-between text-xs">
        <Badge className={`${getStatusColor(order.status)} text-xs px-2.5 py-1 font-semibold`}>
          {formatStatus(order.status)}
        </Badge>
        <div className="text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {order.estimated_delivery_date && (
            <span> → {new Date(order.estimated_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
      </div>

      {/* Address Alert */}
      {needsAddress && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-2 text-xs text-orange-800 flex items-start gap-2">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Delivery address required</span>
        </div>
      )}

      {/* Order Items - Collapsible */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowItems(!showItems)}
            className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Order Items ({order.order_items.length})</span>
            {showItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showItems && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {order.order_items.slice(0, 5).map((item, idx) => (
                <li key={idx} className="flex justify-between">
                  <span className="truncate mr-2">• {item.product_name}</span>
                  <span className="whitespace-nowrap">{item.quantity} {item.unit}</span>
                </li>
              ))}
              {order.order_items.length > 5 && (
                <li className="text-primary">+{order.order_items.length - 5} more items</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {needsAddress ? (
          <Button 
            onClick={(e) => {
              console.log('🔵 Add Address clicked:', order.order_number);
              e.stopPropagation();
              onAddAddress();
            }}
            size="sm" 
            className="flex-1 h-9 text-xs"
          >
            <MapPin className="h-3 w-3 mr-1" />
            Add Address
          </Button>
        ) : needsPaymentProof ? (
          <Button 
            onClick={(e) => {
              console.log('🔵 Upload Payment clicked:', order.order_number);
              e.stopPropagation();
              onUploadPayment();
            }}
            size="sm" 
            className="flex-1 h-9 text-xs"
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload Proof
          </Button>
        ) : (
          <>
              <Button 
                onClick={(e) => {
                  console.log('🔵 Track button clicked:', order.order_number);
                  e.stopPropagation();
                  onTrack();
                }}
                size="sm" 
                className="flex-1 h-9"
              >
                <Eye className="h-3 w-3 mr-1" />
                <span className="text-xs">Track</span>
              </Button>
            <Button 
              onClick={(e) => {
                console.log('🔵 Reorder button clicked:', order.order_number);
                e.stopPropagation();
                onReorder();
              }}
              variant="outline" 
              size="sm" 
              className="flex-1 h-9"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span className="text-xs">Reorder</span>
            </Button>
          </>
        )}
      </div>
    </InteractiveCard>
  );
};
