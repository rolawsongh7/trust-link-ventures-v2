import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Download,
  Calendar,
  Search,
  Filter,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReconciliationOrder {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_verified_at: string | null;
  payment_amount_confirmed: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_mismatch_acknowledged: boolean | null;
  payment_date: string | null;
  created_at: string;
  customers: {
    company_name: string;
    email: string | null;
  } | null;
  invoices: {
    id: string;
    total_amount: number;
    amount_paid: number | null;
  }[] | null;
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mtn_momo: 'MTN MoMo',
  vodafone_cash: 'Vodafone Cash',
  airteltigo: 'AirtelTigo Money',
  mobile_money: 'Mobile Money',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

export default function FinancialReconciliation() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [showMismatchOnly, setShowMismatchOnly] = useState(false);

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return {
          start: customStartDate ? startOfDay(new Date(customStartDate)) : startOfDay(now),
          end: customEndDate ? endOfDay(new Date(customEndDate)) : endOfDay(now),
        };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Fetch orders with payment data
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['reconciliation-orders', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          total_amount,
          currency,
          status,
          payment_verified_at,
          payment_amount_confirmed,
          payment_method,
          payment_reference,
          payment_mismatch_acknowledged,
          payment_date,
          created_at,
          customers (
            company_name,
            email
          ),
          invoices (
            id,
            total_amount,
            amount_paid
          )
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReconciliationOrder[];
    },
    staleTime: 30000,
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          order.order_number.toLowerCase().includes(search) ||
          order.customers?.company_name?.toLowerCase().includes(search) ||
          order.payment_reference?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified' && !order.payment_verified_at) return false;
        if (statusFilter === 'unverified' && order.payment_verified_at) return false;
        if (statusFilter === 'pending_payment' && order.status !== 'pending_payment') return false;
      }

      // Payment method filter
      if (paymentMethodFilter !== 'all' && order.payment_method !== paymentMethodFilter) return false;

      // Mismatch filter
      if (showMismatchOnly) {
        if (!order.payment_amount_confirmed || !order.payment_mismatch_acknowledged) return false;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, paymentMethodFilter, showMismatchOnly]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalInvoiced = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalReceived = orders
      .filter(o => o.payment_verified_at)
      .reduce((sum, o) => sum + (o.payment_amount_confirmed || o.total_amount || 0), 0);
    const outstanding = totalInvoiced - totalReceived;
    const mismatchCount = orders.filter(o => o.payment_mismatch_acknowledged).length;
    const pendingVerification = orders.filter(o => 
      o.status === 'pending_payment' || 
      (!o.payment_verified_at && o.status !== 'cancelled')
    ).length;

    return { totalInvoiced, totalReceived, outstanding, mismatchCount, pendingVerification };
  }, [orders]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Order #',
      'Customer',
      'Invoice Total',
      'Amount Paid',
      'Difference',
      'Payment Method',
      'Reference',
      'Status',
      'Verified At',
      'Created At'
    ];

    const rows = filteredOrders.map(order => {
      const diff = (order.payment_amount_confirmed || 0) - order.total_amount;
      return [
        order.order_number,
        order.customers?.company_name || 'N/A',
        order.total_amount.toFixed(2),
        (order.payment_amount_confirmed || 0).toFixed(2),
        diff.toFixed(2),
        PAYMENT_METHOD_LABELS[order.payment_method || ''] || order.payment_method || 'N/A',
        order.payment_reference || 'N/A',
        order.payment_verified_at ? 'Verified' : 'Pending',
        order.payment_verified_at ? format(new Date(order.payment_verified_at), 'yyyy-MM-dd HH:mm') : '',
        format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${format(dateRange.start, 'yyyy-MM-dd')}-to-${format(dateRange.end, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number, currency = 'GHS') => {
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial Reconciliation</h1>
          <p className="text-muted-foreground">
            Track payments, verify transactions, and reconcile daily totals
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Invoiced
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalInvoiced)}</p>
            <p className="text-xs text-muted-foreground">{orders.length} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalReceived)}</p>
            <p className="text-xs text-muted-foreground">
              {orders.filter(o => o.payment_verified_at).length} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Outstanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.outstanding)}</p>
            <p className="text-xs text-muted-foreground">pending collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Pending Verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.pendingVerification}</p>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>

        <Card className={cn(stats.mismatchCount > 0 && "border-amber-500")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Mismatches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", stats.mismatchCount > 0 && "text-amber-600")}>
              {stats.mismatchCount}
            </p>
            <p className="text-xs text-muted-foreground">amount discrepancies</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Order #, customer, ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Verification Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="unverified">Unverified Only</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="mismatch-only"
              checked={showMismatchOnly}
              onChange={(e) => setShowMismatchOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="mismatch-only" className="text-sm cursor-pointer">
              Show mismatches only
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reconciliation Details</span>
            <Badge variant="secondary">{filteredOrders.length} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Invoice Total</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const paid = order.payment_amount_confirmed || 0;
                    const diff = paid - order.total_amount;
                    const hasMismatch = order.payment_mismatch_acknowledged;
                    const isVerified = !!order.payment_verified_at;

                    return (
                      <TableRow 
                        key={order.id}
                        className={cn(hasMismatch && "bg-amber-50 dark:bg-amber-950/10")}
                      >
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customers?.company_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{order.customers?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total_amount, order.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isVerified ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(paid, order.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isVerified && diff !== 0 ? (
                            <span className={cn(
                              "font-medium",
                              diff < 0 ? "text-red-600" : "text-amber-600"
                            )}>
                              {diff > 0 ? '+' : ''}{formatCurrency(diff, order.currency)}
                            </span>
                          ) : isVerified ? (
                            <span className="text-green-600">✓ Match</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.payment_method ? (
                            <Badge variant="outline">
                              {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {order.payment_reference || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isVerified ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : order.status === 'pending_payment' ? (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline">{order.status}</Badge>
                          )}
                          {hasMismatch && (
                            <Badge variant="outline" className="ml-1 border-amber-500 text-amber-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Mismatch
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Close Summary */}
      {dateFilter === 'today' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Close Summary - {format(new Date(), 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Expected (Invoiced)</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalInvoiced)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Actual (Received)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalReceived)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Variance</p>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.outstanding > 0 ? "text-amber-600" : "text-green-600"
                )}>
                  {stats.outstanding > 0 ? '-' : '+'}{formatCurrency(Math.abs(stats.outstanding))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
