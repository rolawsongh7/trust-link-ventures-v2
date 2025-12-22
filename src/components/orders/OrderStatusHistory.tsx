import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Clock, User, ArrowRight, Download } from "lucide-react";
import { openSecureStorageUrl } from "@/lib/storageHelpers";

interface StatusHistoryEntry {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

interface CurrencyChangeEntry {
  id: string;
  created_at: string;
  event_data: {
    order_id?: string;
    quote_id?: string;
    order_number?: string;
    quote_number?: string;
    old_currency: string;
    new_currency: string;
    status: string;
  };
}

interface OrderStatusHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  order?: {
    payment_reference?: string;
    payment_proof_url?: string;
    payment_confirmed_at?: string;
  };
}

const OrderStatusHistory = ({ open, onOpenChange, orderId, order }: OrderStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [currencyChanges, setCurrencyChanges] = useState<CurrencyChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && orderId) {
      fetchHistory();
      fetchCurrencyChanges();
    }
  }, [orderId, open]);

  const fetchHistory = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencyChanges = async () => {
    if (!orderId) return;
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, event_data, user_id')
        .eq('event_type', 'order_currency_changed')
        .contains('event_data', { order_id: orderId })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCurrencyChanges((data || []) as unknown as CurrencyChangeEntry[]);
    } catch (error) {
      console.error('Error fetching currency changes:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'order_confirmed': 'bg-blue-500',
      'pending_payment': 'bg-yellow-500',
      'payment_received': 'bg-green-500',
      'processing': 'bg-purple-500',
      'ready_to_ship': 'bg-indigo-500',
      'shipped': 'bg-cyan-500',
      'delivered': 'bg-emerald-500',
      'cancelled': 'bg-red-500',
      'delivery_failed': 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
      );
    }

    return (
      <div className="space-y-6">
        {/* Currency Changes Section */}
        {currencyChanges.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                Currency Changes
              </Badge>
            </h4>
            <div className="space-y-3">
              {currencyChanges.map((change) => (
                <div key={change.id} className="text-sm bg-background/50 dark:bg-background/30 rounded p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {change.event_data.old_currency}
                    </Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="text-xs">
                      {change.event_data.new_currency}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3" />
                    {format(new Date(change.created_at), 'PPpp')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Order Status: <span className="font-medium">{change.event_data.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Info Section */}
        {order?.payment_reference && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-green-900 mb-2">
                  Payment Confirmed
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-green-700">Reference:</span>
                    <span className="ml-2 font-mono font-semibold">
                      {order.payment_reference}
                    </span>
                  </div>
                  {order.payment_confirmed_at && (
                    <div>
                      <span className="text-green-700">Confirmed:</span>
                      <span className="ml-2">
                        {new Date(order.payment_confirmed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {order.payment_proof_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await openSecureStorageUrl(order.payment_proof_url!);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  View Receipt
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {index < history.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
              )}
              
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-full ${getStatusColor(entry.new_status)} flex items-center justify-center text-white flex-shrink-0 relative z-10`}>
                  <Clock className="w-5 h-5" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.old_status && (
                      <>
                        <Badge variant="outline">
                          {entry.old_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </>
                    )}
                    <Badge className={getStatusColor(entry.new_status)}>
                      {entry.new_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(entry.changed_at), 'PPpp')}</span>
                    </div>
                    
                    {entry.changed_by && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>Changed by admin</span>
                      </div>
                    )}
                    
                    {entry.reason && (
                      <p className="text-xs italic">{entry.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Audit Trail</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default OrderStatusHistory;
