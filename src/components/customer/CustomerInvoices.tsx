import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadInvoiceFromUrl } from '@/lib/storageHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureCustomerRecord } from '@/lib/customerUtils';

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
  };
}

export const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();

    // Set up real-time subscription
    const subscription = supabase
      .channel('customer-invoices-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('Invoice change detected:', payload);
          fetchInvoices();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.error('No user email found');
        toast({
          title: 'Authentication Error',
          description: 'Unable to retrieve your profile. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      // Debug: Log the email being searched
      console.log('Fetching invoices for email:', user.email);

      // Use the case-insensitive customer lookup utility
      const customer = await ensureCustomerRecord(user.email);

      if (!customer) {
        console.warn('No customer record found for email:', user.email);
        toast({
          title: 'No Customer Profile',
          description: 'Your account is not linked to a customer profile. Please contact support at support@trustlinkventures.com',
          variant: 'destructive',
        });
        setInvoices([]);
        return;
      }

      console.log('Found customer:', customer);

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          orders(order_number)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Invoices found:', data?.length || 0);
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error Loading Invoices',
        description: error instanceof Error ? error.message : 'Failed to load invoices. Please try again.',
        variant: 'destructive',
      });
      setInvoices([]); // Ensure invoices is always an array
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

      // Create download link
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No invoices yet</p>
        </CardContent>
      </Card>
    );
  }

  const getInvoiceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      proforma: 'bg-blue-100 text-blue-800',
      commercial: 'bg-green-100 text-green-800',
      packing_list: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Invoices</h2>
        <Badge variant="secondary">
          {invoices.length} Invoice{invoices.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {invoices.map((invoice) => (
        <Card key={invoice.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {invoice.invoice_number}
                  <Badge className={getInvoiceTypeBadge(invoice.invoice_type)}>
                    {getInvoiceTypeLabel(invoice.invoice_type)}
                  </Badge>
                  {getStatusBadge(invoice.status)}
                </CardTitle>
                <CardDescription>
                  {invoice.orders && `Order: ${invoice.orders.order_number}`}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {invoice.currency} {Number(invoice.total_amount).toLocaleString()}
                </div>
                {invoice.invoice_type !== 'packing_list' && (
                  <div className="text-sm text-muted-foreground">
                    Issued: {new Date(invoice.issue_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {invoice.due_date && invoice.invoice_type !== 'packing_list' && (
                  <div>Due: {new Date(invoice.due_date).toLocaleDateString()}</div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(invoice)}
                disabled={downloading === invoice.id}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading === invoice.id ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
