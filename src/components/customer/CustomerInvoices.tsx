import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureSignedUrl } from '@/lib/storageHelpers';
import { ensureCustomerRecord } from '@/lib/customerUtils';
import { MobileInvoiceCard } from './mobile/MobileInvoiceCard';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { InvoiceFilterPanel } from './filters/InvoiceFilterPanel';
import { InvoiceStatistics, type InvoiceStats } from './InvoiceStatistics';
import { InvoiceSearchFilters } from '@/types/filters';
import { getDateRangeForPeriod, isDateInRange } from '@/lib/dateHelpers';

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
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<InvoiceSearchFilters>({
    searchTerm: '',
    status: [],
    invoiceType: [],
    dateRange: null,
    timePeriod: 'all',
    amountRange: null,
    currency: []
  });
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
      // Check if file_url exists
      if (!invoice.file_url) {
        throw new Error('Invoice PDF not available yet. Please try again later or contact support.');
      }

      // Get signed URL for the stored PDF
      const signedUrl = await ensureSignedUrl(invoice.file_url, 3600); // 1 hour expiry

      // Fetch the PDF
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice PDF');
      }

      const blob = await response.blob();
      
      // Download
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
        description: error instanceof Error ? error.message : 'Failed to download invoice. Please try again or contact support.',
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

  // Filter invoices based on current filters
  const filteredInvoices = useMemo(() => {
    let filtered = invoices || [];

    // Apply search term
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.invoice_number.toLowerCase().includes(search) ||
        inv.orders?.order_number?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(inv => filters.status.includes(inv.status));
    }

    // Apply invoice type filter
    if (filters.invoiceType.length > 0) {
      filtered = filtered.filter(inv => filters.invoiceType.includes(inv.invoice_type));
    }

    // Apply time period filter
    if (filters.timePeriod !== 'all') {
      const dateRange = getDateRangeForPeriod(filters.timePeriod);
      if (dateRange) {
        filtered = filtered.filter(inv => 
          isDateInRange(new Date(inv.issue_date), dateRange)
        );
      }
    }

    // Apply custom date range (overrides time period)
    if (filters.dateRange) {
      filtered = filtered.filter(inv => 
        isDateInRange(new Date(inv.issue_date), filters.dateRange)
      );
    }

    // Apply amount range filter
    if (filters.amountRange) {
      filtered = filtered.filter(inv => 
        inv.total_amount >= (filters.amountRange?.min || 0) &&
        inv.total_amount <= (filters.amountRange?.max || Infinity)
      );
    }

    // Apply currency filter
    if (filters.currency.length > 0) {
      filtered = filtered.filter(inv => 
        filters.currency.includes(inv.currency || inv.orders?.currency || 'USD')
      );
    }

    return filtered;
  }, [invoices, filters]);

  // Calculate statistics
  const stats = useMemo((): InvoiceStats => {
    const totalAmountByCurrency: Record<string, number> = {};
    const unpaidByCurrency: Record<string, number> = {};

    filteredInvoices.forEach(inv => {
      const currency = inv.currency || inv.orders?.currency || 'USD';
      const amount = Number(inv.total_amount);

      // Total amount
      totalAmountByCurrency[currency] = (totalAmountByCurrency[currency] || 0) + amount;

      // Unpaid balance (sent or draft status)
      if (inv.status === 'sent' || inv.status === 'draft') {
        unpaidByCurrency[currency] = (unpaidByCurrency[currency] || 0) + amount;
      }
    });

    const allAmounts = filteredInvoices.map(inv => Number(inv.total_amount));
    const averageValue = allAmounts.length > 0 
      ? allAmounts.reduce((sum, val) => sum + val, 0) / allAmounts.length 
      : 0;

    return {
      totalCount: filteredInvoices.length,
      totalAmountByCurrency,
      unpaidByCurrency,
      averageValue
    };
  }, [filteredInvoices]);

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
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <FileText className="h-4 w-4 mr-2" />
            {invoices.length} Total
          </Badge>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <InvoiceFilterPanel
          filters={filters}
          onFilterChange={setFilters}
          totalInvoices={invoices.length}
          filteredCount={filteredInvoices.length}
        />
      )}

      {/* Statistics */}
      <InvoiceStatistics stats={stats} loading={loading} />

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
          {filteredInvoices.map((invoice) => (
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
                  {filteredInvoices.map((invoice) => (
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
