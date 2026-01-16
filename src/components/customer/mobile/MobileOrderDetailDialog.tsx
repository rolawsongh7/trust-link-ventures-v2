import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, MapPin, Calendar, DollarSign, FileText, RotateCcw, Truck, Upload, AlertTriangle } from 'lucide-react';
import { ProofOfDeliverySection } from '../ProofOfDeliverySection';

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
  delivered_at?: string;
  delivery_proof_url?: string;
  proof_of_delivery_url?: string;
  delivery_signature?: string;
  order_items?: any[];
  quotes?: {
    quote_number: string;
    customers?: {
      company_name: string;
      contact_name: string;
    };
  };
}

interface MobileOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onTrack: () => void;
  onReorder: () => void;
  onViewInvoices: () => void;
  onAddAddress?: () => void;
  onUploadPayment?: () => void;
  onReportIssue?: () => void;
}

export const MobileOrderDetailDialog = ({
  open,
  onOpenChange,
  order,
  onTrack,
  onReorder,
  onViewInvoices,
  onAddAddress,
  onUploadPayment,
  onReportIssue
}: MobileOrderDetailDialogProps) => {
  if (!order) return null;

  const canReportIssue = ['shipped', 'delivered', 'delivery_failed'].includes(order.status);

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

  const needsAddress = !order.delivery_address_id && ['payment_received', 'processing'].includes(order.status);
  const needsPaymentProof = order.status === 'order_confirmed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Order Number & Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order Number</span>
                <span className="font-semibold">{order.order_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold text-foreground">
                  {getCurrencySymbol(order.currency)}{Number(order.total_amount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={`${getStatusColor(order.status)} text-sm px-3 py-1`}>
                {formatStatus(order.status)}
              </Badge>
            </div>

            {/* Dates */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(order.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              {order.estimated_delivery_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Est. Delivery:</span>
                  <span>{new Date(order.estimated_delivery_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>

            {/* Address Alert */}
            {needsAddress && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800 flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Delivery address required to proceed with shipping</span>
              </div>
            )}

            {/* Order Items */}
            {order.order_items && order.order_items.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4" />
                  <span>Order Items ({order.order_items.length})</span>
                </div>
                <ul className="space-y-2 text-sm">
                  {order.order_items.map((item, idx) => (
                    <li key={idx} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quote Info */}
            {order.quotes && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Quote:</span>
                  <span className="font-medium">{order.quotes.quote_number}</span>
                </div>
              </div>
            )}

            {/* Tracking Number */}
            {order.tracking_number && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tracking:</span>
                  <span className="font-mono font-medium">{order.tracking_number}</span>
                </div>
              </div>
            )}

            {/* Proof of Delivery */}
            {order.status === 'delivered' && (
              <div className="pt-2 border-t">
                <ProofOfDeliverySection
                  deliveryProofUrl={order.delivery_proof_url}
                  proofOfDeliveryUrl={order.proof_of_delivery_url}
                  deliverySignature={order.delivery_signature}
                  deliveredAt={order.delivered_at}
                  compact
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              {needsAddress ? (
                <Button onClick={onAddAddress} className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  Add Delivery Address
                </Button>
              ) : needsPaymentProof ? (
                <Button onClick={onUploadPayment} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Payment Proof
                </Button>
              ) : (
                <>
                  {/* Track Order - Show for all statuses except cancelled */}
                  {!['cancelled'].includes(order.status) && (
                    <Button
                      onClick={() => {
                        onOpenChange(false); // Close dialog first
                        setTimeout(() => onTrack(), 100); // Then trigger track with delay
                      }}
                      variant={['shipped', 'delivered'].includes(order.status) ? "default" : "outline"}
                      className="w-full"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {['shipped', 'delivered'].includes(order.status) 
                        ? 'Track Order' 
                        : 'View Order Status'
                      }
                    </Button>
                  )}
                  <Button onClick={onViewInvoices} variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View Invoices
                  </Button>
                  <Button onClick={onReorder} variant="outline" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reorder
                  </Button>
                  {/* Report Issue */}
                  {canReportIssue && onReportIssue && (
                    <Button 
                      onClick={onReportIssue} 
                      variant="outline" 
                      className="w-full text-destructive hover:text-destructive"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
