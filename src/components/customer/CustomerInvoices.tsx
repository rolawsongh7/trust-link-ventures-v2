import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadInvoiceFromUrl } from '@/lib/storageHelpers';
import { ensureCustomerRecord } from '@/lib/customerUtils';
import { MobileInvoiceCard } from './mobile/MobileInvoiceCard';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  currency: string;
  status: string;
  order_id: string;
  file_url: string | null;
  orders?: {
    order_number: string;
    currency: string;
  };
}

export const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    if (profile?.email) {
      fetchInvoices();

      const subscription = supabase
        .channel('customer-invoices-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'invoices' },
          () => {
            fetchInvoices();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile]);

  const fetchInvoices = async () => {
    if (!profile?.email) {
      console.error('No profile email found');
      toast({
        title: 'Authentication Error',
        description: 'Unable to retrieve your profile. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const customer = await ensureCustomerRecord(profile.email);

      if (!customer) {
        console.error('❌ No customer record found');
        toast({
          title: 'No Customer Profile',
          description: `Your account (${profile.email}) is not linked to a customer profile. Please contact support.`,
          variant: 'destructive',
        });
        setInvoices([]);
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          orders(order_number, currency)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error Loading Invoices',
        description: error instanceof Error ? error.message : 'Failed to load invoices.',
        variant: 'destructive',
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    setDownloading(invoice.id);
    try {
      const blob = await downloadInvoiceFromUrl(
        invoice.id,
        invoice.file_url,
        invoice.invoice_number
      );
      
      if (!blob) {
        throw new Error('Failed to download invoice');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Invoice downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download invoice',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'proforma':
        return 'Proforma Invoice';
      case 'commercial':
        return 'Commercial Invoice';
      case 'packing_list':
        return 'Packing List';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      sent: 'secondary',
      paid: 'default',
      cancelled: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getInvoiceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      proforma: 'bg-blue-100 text-blue-800',
      commercial: 'bg-green-100 text-green-800',
      packing_list: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            My Invoices
          </h1>
          <p className="text-muted-foreground">
            View and download your invoices
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <FileText className="h-4 w-4 mr-2" />
          {invoices.length} Invoices
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground">
              Your invoices will appear here once orders are processed
            </p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <MobileInvoiceCard
              key={invoice.id}
              invoice={invoice}
              onDownload={() => handleDownload(invoice)}
              downloading={downloading === invoice.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Invoice Number</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Order</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Issue Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Due Date</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-medium">
                          {getInvoiceTypeLabel(invoice.invoice_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{invoice.orders?.order_number || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(invoice.issue_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {invoice.orders?.currency || invoice.currency || 'USD'} {Number(invoice.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(invoice)}
                          disabled={downloading === invoice.id}
                        >
                          {downloading === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
