import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, AlertTriangle, CheckCircle, Download, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileCurrencyMismatchCard } from './mobile/MobileCurrencyMismatchCard';

interface CurrencyMismatch {
  type: 'order-quote' | 'invoice-order';
  orderId?: string;
  orderNumber?: string;
  orderCurrency?: string;
  quoteId?: string;
  quoteNumber?: string;
  quoteCurrency?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceCurrency?: string;
}

interface CurrencyStats {
  totalOrders: number;
  totalQuotes: number;
  totalInvoices: number;
  currencyBreakdown: {
    currency: string;
    orders: number;
    quotes: number;
    invoices: number;
    totalAmount: number;
  }[];
  mismatches: CurrencyMismatch[];
  recentCurrencyChanges: any[];
}

export const CurrencyAuditDashboard = () => {
  const [stats, setStats] = useState<CurrencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    fetchCurrencyAudit();
  }, []);

  const fetchCurrencyAudit = async () => {
    try {
      setLoading(true);

      // Fetch orders with quotes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          currency,
          total_amount,
          quote_id,
          quotes!quote_id (
            id,
            quote_number,
            currency
          )
        `);

      if (ordersError) throw ordersError;

      // Fetch invoices with orders
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          currency,
          order_id,
          orders (
            id,
            order_number,
            currency
          )
        `);

      if (invoicesError) throw invoicesError;

      // Fetch quotes
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, quote_number, currency, total_amount');

      if (quotesError) throw quotesError;

      // Fetch recent currency changes
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('id, created_at, event_data, event_type, user_id')
        .in('event_type', ['order_currency_changed', 'quote_currency_changed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditError) throw auditError;

      // Detect mismatches
      const mismatches: CurrencyMismatch[] = [];

      // Check order-quote mismatches
      orders?.forEach(order => {
        if (order.quotes && order.currency !== order.quotes.currency) {
          mismatches.push({
            type: 'order-quote',
            orderId: order.id,
            orderNumber: order.order_number,
            orderCurrency: order.currency,
            quoteId: order.quotes.id,
            quoteNumber: order.quotes.quote_number,
            quoteCurrency: order.quotes.currency
          });
        }
      });

      // Check invoice-order mismatches
      invoices?.forEach(invoice => {
        if (invoice.orders && invoice.currency !== invoice.orders.currency) {
          mismatches.push({
            type: 'invoice-order',
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            invoiceCurrency: invoice.currency,
            orderId: invoice.orders.id,
            orderNumber: invoice.orders.order_number,
            orderCurrency: invoice.orders.currency
          });
        }
      });

      // Calculate currency breakdown
      const currencyMap = new Map<string, { orders: number; quotes: number; invoices: number; totalAmount: number }>();

      orders?.forEach(order => {
        const curr = order.currency;
        const existing = currencyMap.get(curr) || { orders: 0, quotes: 0, invoices: 0, totalAmount: 0 };
        existing.orders += 1;
        existing.totalAmount += order.total_amount || 0;
        currencyMap.set(curr, existing);
      });

      quotes?.forEach(quote => {
        const curr = quote.currency;
        const existing = currencyMap.get(curr) || { orders: 0, quotes: 0, invoices: 0, totalAmount: 0 };
        existing.quotes += 1;
        existing.totalAmount += quote.total_amount || 0;
        currencyMap.set(curr, existing);
      });

      invoices?.forEach(invoice => {
        const curr = invoice.currency;
        const existing = currencyMap.get(curr) || { orders: 0, quotes: 0, invoices: 0, totalAmount: 0 };
        existing.invoices += 1;
        currencyMap.set(curr, existing);
      });

      const currencyBreakdown = Array.from(currencyMap.entries()).map(([currency, data]) => ({
        currency,
        ...data
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      setStats({
        totalOrders: orders?.length || 0,
        totalQuotes: quotes?.length || 0,
        totalInvoices: invoices?.length || 0,
        currencyBreakdown,
        mismatches,
        recentCurrencyChanges: auditLogs || []
      });
    } catch (error) {
      console.error('Error fetching currency audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAuditReport = () => {
    if (!stats) return;

    const workbook = XLSX.utils.book_new();

    // Currency Breakdown Sheet
    const breakdownData = stats.currencyBreakdown.map(item => ({
      'Currency': item.currency,
      'Total Orders': item.orders,
      'Total Quotes': item.quotes,
      'Total Invoices': item.invoices,
      'Total Amount': item.totalAmount.toFixed(2)
    }));
    const breakdownSheet = XLSX.utils.json_to_sheet(breakdownData);
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Currency Breakdown');

    // Mismatches Sheet
    const mismatchData = stats.mismatches.map(m => ({
      'Type': m.type === 'order-quote' ? 'Order-Quote Mismatch' : 'Invoice-Order Mismatch',
      'Order Number': m.orderNumber || '',
      'Order Currency': m.orderCurrency || '',
      'Quote Number': m.quoteNumber || '',
      'Quote Currency': m.quoteCurrency || '',
      'Invoice Number': m.invoiceNumber || '',
      'Invoice Currency': m.invoiceCurrency || ''
    }));
    const mismatchSheet = XLSX.utils.json_to_sheet(mismatchData);
    XLSX.utils.book_append_sheet(workbook, mismatchSheet, 'Currency Mismatches');

    // Recent Changes Sheet
    const changesData = stats.recentCurrencyChanges.map(change => ({
      'Date': format(new Date(change.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Type': change.event_type,
      'Details': JSON.stringify(change.event_data)
    }));
    const changesSheet = XLSX.utils.json_to_sheet(changesData);
    XLSX.utils.book_append_sheet(workbook, changesSheet, 'Recent Changes');

    XLSX.writeFile(workbook, `currency-audit-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getCurrencyColor = (currency: string) => {
    const colors: Record<string, string> = {
      'USD': 'bg-blue-100 text-blue-700 border-blue-300',
      'EUR': 'bg-green-100 text-green-700 border-green-300',
      'GBP': 'bg-purple-100 text-purple-700 border-purple-300',
      'GHS': 'bg-orange-100 text-orange-700 border-orange-300'
    };
    return colors[currency] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Currency Audit Dashboard</CardTitle>
            <CardDescription>Loading currency audit data...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Currency Audit Dashboard</h2>
          <p className="text-muted-foreground">Monitor currency consistency across quotes, orders, and invoices</p>
        </div>
        <Button onClick={exportAuditReport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Currency Mismatches Alert */}
      {stats.mismatches.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats.mismatches.length} currency mismatch{stats.mismatches.length > 1 ? 'es' : ''} detected!</strong> 
            <span className="block mt-1">These need immediate attention to ensure accurate invoicing and payments.</span>
          </AlertDescription>
        </Alert>
      )}

      {stats.mismatches.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            No currency mismatches detected. All quotes, orders, and invoices have consistent currencies.
          </AlertDescription>
        </Alert>
      )}

      {/* Currency Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Distribution</CardTitle>
          <CardDescription>Transaction volume by currency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.currencyBreakdown.map(item => (
              <div key={item.currency} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge className={getCurrencyColor(item.currency)}>
                    {item.currency}
                  </Badge>
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="text-muted-foreground">Orders</div>
                      <div className="font-semibold">{item.orders}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Quotes</div>
                      <div className="font-semibold">{item.quotes}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Invoices</div>
                      <div className="font-semibold">{item.invoices}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="text-lg font-bold">{item.totalAmount.toLocaleString()} {item.currency}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mismatches Detail */}
      {stats.mismatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Currency Mismatches
            </CardTitle>
            <CardDescription>
              These records have inconsistent currencies across related documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="space-y-3">
                {stats.mismatches.map((mismatch, index) => (
                  <MobileCurrencyMismatchCard key={index} mismatch={mismatch} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats.mismatches.map((mismatch, index) => (
                  <div key={index} className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Badge variant="destructive" className="text-xs">
                          {mismatch.type === 'order-quote' ? 'Order ≠ Quote' : 'Invoice ≠ Order'}
                        </Badge>
                        {mismatch.type === 'order-quote' && (
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Order:</span> 
                              <span className="ml-2 font-medium">{mismatch.orderNumber}</span>
                              <Badge variant="outline" className="ml-2">{mismatch.orderCurrency}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Quote:</span> 
                              <span className="ml-2 font-medium">{mismatch.quoteNumber}</span>
                              <Badge variant="outline" className="ml-2">{mismatch.quoteCurrency}</Badge>
                            </div>
                          </div>
                        )}
                        {mismatch.type === 'invoice-order' && (
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Invoice:</span> 
                              <span className="ml-2 font-medium">{mismatch.invoiceNumber}</span>
                              <Badge variant="outline" className="ml-2">{mismatch.invoiceCurrency}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Order:</span> 
                              <span className="ml-2 font-medium">{mismatch.orderNumber}</span>
                              <Badge variant="outline" className="ml-2">{mismatch.orderCurrency}</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Currency Changes */}
      {stats.recentCurrencyChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Currency Changes</CardTitle>
            <CardDescription>Last 10 currency modifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentCurrencyChanges.map(change => {
                const eventData = change.event_data as any;
                return (
                  <div key={change.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {change.event_type === 'order_currency_changed' ? 'Order' : 'Quote'} Currency Change
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(change.created_at), 'PPp')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{eventData.old_currency}</Badge>
                      <span>→</span>
                      <Badge variant="outline">{eventData.new_currency}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {eventData.order_number || eventData.quote_number}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};