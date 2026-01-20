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
import { Clock, User, ArrowRight, Download, CreditCard, AlertTriangle, CheckCircle2, XCircle, Upload } from "lucide-react";
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

interface PaymentAuditEntry {
  id: string;
  created_at: string;
  event_type: string;
  user_id: string | null;
  event_data: {
    amount?: number;
    amount_confirmed?: number;
    payment_method?: string;
    payment_reference?: string;
    mismatch_acknowledged?: boolean;
    reason?: string;
    justification?: string;
  };
  admin_name?: string;
}

interface OrderStatusHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  order?: {
    payment_reference?: string;
    payment_proof_url?: string;
    payment_confirmed_at?: string;
    payment_verified_at?: string;
    payment_verified_by?: string;
    payment_amount_confirmed?: number;
    payment_method?: string;
    payment_proof_uploaded_at?: string;
    payment_rejected_at?: string;
    payment_date?: string;
    currency?: string;
  };
}

const OrderStatusHistory = ({ open, onOpenChange, orderId, order }: OrderStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [currencyChanges, setCurrencyChanges] = useState<CurrencyChangeEntry[]>([]);
  const [paymentAudit, setPaymentAudit] = useState<PaymentAuditEntry[]>([]);
  const [verifierName, setVerifierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && orderId) {
      fetchHistory();
      fetchCurrencyChanges();
      fetchPaymentAudit();
      if (order?.payment_verified_by) {
        fetchVerifierName(order.payment_verified_by);
      }
    }
  }, [orderId, open, order?.payment_verified_by]);

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

  const fetchPaymentAudit = async () => {
    if (!orderId) return;
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, event_type, user_id, event_data')
        .in('event_type', ['payment_verified', 'payment_rejected', 'payment_mismatch_override', 'payment_clarification_requested'])
        .eq('resource_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentAudit((data || []) as unknown as PaymentAuditEntry[]);
    } catch (error) {
      console.error('Error fetching payment audit:', error);
    }
  };

  const fetchVerifierName = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setVerifierName(data.full_name || data.email || 'Admin');
      }
    } catch (error) {
      console.error('Error fetching verifier name:', error);
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
      'delivery_failed': 'bg-orange-500',
      'payment_rejected': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatCurrency = (amount: number) => {
    const currency = order?.currency || 'GHS';
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        {/* Payment Timeline Section */}
        {(order?.payment_proof_uploaded_at || order?.payment_verified_at || order?.payment_rejected_at) && (
          <div className="bg-card border rounded-lg p-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Timeline
            </h4>
            <div className="space-y-3">
              {/* Proof Uploaded */}
              {order.payment_proof_uploaded_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Payment Proof Uploaded</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(order.payment_proof_uploaded_at), 'PPpp')}
                    </p>
                  </div>
                </div>
              )}

              {/* Verified */}
              {order.payment_verified_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-700 dark:text-green-300">Payment Verified</p>
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      {order.payment_amount_confirmed && (
                        <p>Amount: <span className="font-medium">{formatCurrency(order.payment_amount_confirmed)}</span></p>
                      )}
                      {order.payment_method && (
                        <p>Method: <span className="font-medium capitalize">{order.payment_method.replace(/_/g, ' ')}</span></p>
                      )}
                      {order.payment_date && (
                        <p>Payment Date: <span className="font-medium">{format(new Date(order.payment_date), 'PPP')}</span></p>
                      )}
                      {verifierName && (
                        <p>Verified by: <span className="font-medium">{verifierName}</span></p>
                      )}
                      <p>Verified at: {format(new Date(order.payment_verified_at), 'PPpp')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {order.payment_rejected_at && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300">Payment Rejected</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(order.payment_rejected_at), 'PPpp')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Legacy Payment Info Section */}
        {order?.payment_reference && !order?.payment_verified_at && (
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
        
        {/* Status History */}
        <div className="space-y-6">
          <h4 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Status History
          </h4>
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
