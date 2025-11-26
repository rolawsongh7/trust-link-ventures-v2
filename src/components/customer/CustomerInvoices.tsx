import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2, Filter, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { PortalPageHeader } from './PortalPageHeader';
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
    const classes: Record<string, string> = {
      paid: 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20',
      sent: 'bg-[#E3F2FD] text-tl-accent border-tl-accent/20',
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      overdue: 'bg-[#FFEBEE] text-[#C62828] border-[#C62828]/20',
      cancelled: 'bg-[#FFEBEE] text-[#C62828] border-[#C62828]/20',
    };

    const className = `${
      classes[status] || 'bg-gray-100 text-gray-800 border-gray-300'
    } rounded-full px-3 py-1 text-sm font-medium border`;

    return <Badge className={className}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Gradient Header */}
      <Card className="overflow-hidden">
        <PortalPageHeader
          title="My Invoices"
          subtitle="View and download your invoices"
          totalCount={filteredInvoices.length}
          totalIcon={FileText}
          patternId="invoices-grid"
          stats={[
            {
              label: "Paid",
              count: invoices.filter(i => i.status === 'paid').length,
              icon: CheckCircle
            },
            {
              label: "Awaiting Payment",
              count: invoices.filter(i => i.status === 'sent' || i.status === 'draft').length,
              icon: Clock
            },
            {
              label: "Cancelled",
              count: invoices.filter(i => i.status === 'cancelled').length,
              icon: AlertCircle
            }
          ]}
        />
      </Card>

      {/* Filter Toggle Button for Mobile */}
      <div className="sm:hidden">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
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
            <Card key={i} className="bg-tl-surface border border-tl-border rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48 bg-tl-border rounded" />
                  <Skeleton className="h-4 w-full bg-tl-border rounded" />
                  <Skeleton className="h-4 w-3/4 bg-tl-border rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card className="text-center py-12 bg-tl-surface border border-tl-border rounded-lg shadow-sm">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tl-accent/10 flex items-center justify-center">
              <FileText className="h-10 w-10 text-tl-accent" />
            </div>
            <h3 className="text-xl font-semibold text-tl-primary mb-2">No invoices yet</h3>
            <p className="text-tl-muted">Your invoices will appear here once orders are processed</p>
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
      <Card className="bg-tl-surface border border-tl-border border-l-4 border-l-maritime-500 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-tl-primary/5 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-tl-primary">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-tl-primary">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-tl-primary">Order</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-tl-primary">
                      Issue Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-tl-primary">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-tl-primary">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-tl-primary">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-tl-primary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tl-border">
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-tl-bg transition-all duration-200 hover:shadow-sm"
                    >
                      <td className="px-4 py-3">
                        <span className="text-tl-accent font-medium">{invoice.invoice_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="font-medium border-tl-border text-tl-text"
                        >
                          {getInvoiceTypeLabel(invoice.invoice_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-tl-text">
                        {invoice.orders?.order_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-tl-text">
                        {new Date(invoice.issue_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-tl-text">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-tl-primary">
                        {invoice.orders?.currency || invoice.currency || 'USD'}{' '}
                        {Number(invoice.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          className="bg-tl-gradient text-white hover:opacity-95"
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
