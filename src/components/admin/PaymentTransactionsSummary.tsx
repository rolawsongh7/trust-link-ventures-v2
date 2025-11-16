import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Download, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobilePaymentTransactionCard } from './mobile/MobilePaymentTransactionCard';
import { MobilePaymentTransactionDetailDialog } from './mobile/MobilePaymentTransactionDetailDialog';

interface PaymentTransaction {
  id: string;
  ghipss_reference: string;
  ghipss_transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_channel: string;
  created_at: string;
  completed_at: string;
  orders: {
    order_number: string;
    customers: {
      company_name: string;
      email: string;
    };
  };
}

export const PaymentTransactionsSummary = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, dateRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          orders (
            order_number,
            customers (company_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const now = new Date();
      if (dateRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Reference', 'Order', 'Customer', 'Amount', 'Channel', 'Status', 'Date'];
    const rows = transactions.map(t => [
      t.ghipss_reference,
      t.orders?.order_number || '',
      t.orders?.customers?.company_name || '',
      `${t.currency} ${t.amount}`,
      t.payment_channel || '',
      t.status,
      new Date(t.completed_at || t.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const successfulTransactions = transactions.filter(t => t.status === 'success');
  const totalAmount = successfulTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const getStatusBadge = (status: string) => {
    const Icon = status === 'success' ? CheckCircle : status === 'failed' ? XCircle : Clock;
    const colorClass = status === 'success' ? 'bg-green-100 text-green-700' : 
                      status === 'failed' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700';
    return (
      <Badge className={colorClass}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {successfulTransactions.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              GHS {totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {transactions.filter(t => t.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={exportToCSV} disabled={transactions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No transactions found
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <MobilePaymentTransactionCard 
                  key={transaction.id} 
                  transaction={transaction}
                  onClick={() => {
                    setSelectedTransaction(transaction);
                    setTransactionDialogOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {transaction.ghipss_reference}
                      </TableCell>
                      <TableCell>
                        {transaction.orders?.order_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {transaction.orders?.customers?.company_name || 'N/A'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {transaction.currency} {transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {transaction.payment_channel?.replace('_', ' ') || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.completed_at || transaction.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MobilePaymentTransactionDetailDialog
        transaction={selectedTransaction}
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      />
    </div>
  );
};
