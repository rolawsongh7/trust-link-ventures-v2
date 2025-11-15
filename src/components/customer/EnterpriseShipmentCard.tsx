import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  TruckIcon,
  CheckCircle2,
  Clock,
  MapPin,
  Download,
  Eye,
  Copy,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DeliveryTimeline } from './DeliveryTimeline';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  estimated_delivery_date?: string;
  tracking_number?: string;
  carrier_name?: string;
  shipped_at?: string;
  delivered_at?: string;
  order_items?: any[];
  customer_addresses?: {
    receiver_name: string;
    ghana_digital_address: string;
    city: string;
    region: string;
  };
  invoices?: {
    invoice_number: string;
    file_url: string;
  }[];
}

interface Props {
  order: Order;
  delay?: number;
}

export const EnterpriseShipmentCard = ({ order, delay = 0 }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'border-l-emerald-500';
      case 'shipped':
      case 'out_for_delivery':
        return 'border-l-blue-500';
      case 'processing':
      case 'ready_to_ship':
        return 'border-l-orange-500';
      case 'order_confirmed':
      case 'payment_confirmed':
        return 'border-l-purple-500';
      case 'cancelled':
      case 'failed_delivery':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'shipped':
      case 'out_for_delivery':
        return <TruckIcon className="h-4 w-4" />;
      case 'processing':
      case 'ready_to_ship':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'cancelled':
      case 'failed_delivery':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
      case 'out_for_delivery':
        return 'default';
      case 'cancelled':
      case 'failed_delivery':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'order_confirmed':
        return 15;
      case 'payment_confirmed':
        return 30;
      case 'processing':
        return 45;
      case 'ready_to_ship':
        return 60;
      case 'shipped':
        return 75;
      case 'out_for_delivery':
        return 90;
      case 'delivered':
        return 100;
      default:
        return 0;
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleDownloadInvoice = () => {
    if (order.invoices && order.invoices.length > 0) {
      window.open(order.invoices[0].file_url, '_blank');
    }
  };

  const itemCount = order.order_items?.length || 0;
  const progress = getProgressPercentage(order.status);
  const isPending = ['processing', 'ready_to_ship'].includes(order.status);

  return (
    <Card
      className={`
        border-l-4 ${getStatusBorderColor(order.status)}
        hover:shadow-xl hover:-translate-y-0.5 
        transition-all duration-300
        bg-gradient-to-br from-background to-muted/20
        animate-in fade-in slide-in-from-bottom-4
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Section: Order Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => copyToClipboard(order.order_number, 'Order number')}
                className="text-xl font-bold hover:text-primary transition-colors flex items-center gap-2 group"
              >
                {order.order_number}
                <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <Badge
                variant={getStatusVariant(order.status)}
                className={`flex items-center gap-1 ${isPending ? 'animate-pulse' : ''}`}
              >
                {getStatusIcon(order.status)}
                {formatStatus(order.status)}
              </Badge>
            </div>

            {order.tracking_number && (
              <button
                onClick={() => copyToClipboard(order.tracking_number!, 'Tracking number')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group font-mono"
              >
                Tracking: {order.tracking_number}
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Right Section: ETA & Amount */}
          <div className="flex flex-col lg:items-end gap-2">
            {order.estimated_delivery_date && order.status !== 'delivered' && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                <p className="text-2xl font-extrabold text-primary">
                  {formatDistanceToNow(new Date(order.estimated_delivery_date), { addSuffix: true })}
                </p>
              </div>
            )}
            {order.status === 'delivered' && order.delivered_at && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-lg font-bold text-emerald-600">
                  {format(new Date(order.delivered_at), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
              <p className="text-2xl font-bold text-primary">
                {order.currency} {order.total_amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Delivery Progress</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Items Count */}
          <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-semibold">{itemCount}</p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ordered</p>
              <p className="font-semibold text-sm">
                {format(new Date(order.created_at), 'MMM dd')}
              </p>
            </div>
          </div>

          {/* Carrier */}
          {order.carrier_name && (
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <TruckIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Carrier</p>
                <p className="font-semibold text-sm">{order.carrier_name}</p>
              </div>
            </div>
          )}

          {/* Delivery Address */}
          {order.customer_addresses && (
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg col-span-2 lg:col-span-1">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Delivering to</p>
                <p className="font-semibold text-sm truncate">
                  {order.customer_addresses.city}, {order.customer_addresses.region}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate(`/portal/orders/${order.id}`)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
          
          {order.invoices && order.invoices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadInvoice}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Invoice
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 ml-auto"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Timeline
              </>
            )}
          </Button>
        </div>

        {/* Expanded Timeline */}
        {expanded && (
          <div className="pt-4 border-t animate-in slide-in-from-top-2">
            <DeliveryTimeline order={order} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
