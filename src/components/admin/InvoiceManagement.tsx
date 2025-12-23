import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractiveCard } from "@/components/ui/interactive-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Search, 
  Package,
  Receipt,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ArrowUpDown,
  Calendar,
  Filter,
  Eye,
  Beaker,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { InvoicePDFPreviewDialog } from './InvoicePDFPreviewDialog';
import { ensureSignedUrl } from '@/lib/storageHelpers';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileInvoiceCard } from './mobile/MobileInvoiceCard';
import { MobileInvoiceDetailDialog } from './mobile/MobileInvoiceDetailDialog';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  total_amount: number;
  currency: string;
  status: string;
  file_url: string | null;
  created_at: string;
  updated_at: string;
  order_id: string | null;
  quote_id: string | null;
  customer_id: string | null;
  orders: {
    order_number: string;
  } | null;
  quotes: {
    quote_number: string;
  } | null;
  customers: {
    company_name: string;
    email: string;
  } | null;
}

type SortField = 'created_at' | 'invoice_number' | 'total_amount' | 'status';
type SortDirection = 'asc' | 'desc';

export default function InvoiceManagement() {
  const { toast } = useToast();
  const { isMobile } = useMobileDetection();
  const { hasSuperAdminAccess } = useRoleAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          orders(order_number),
          quotes(quote_number),
          customers(company_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices?.filter(invoice => {
      const matchesSearch = 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "all" || invoice.invoice_type === typeFilter;
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== "all") {
        const invoiceDate = new Date(invoice.created_at);
        const now = new Date();
        
        if (dateFilter === "today") {
          matchesDate = invoiceDate.toDateString() === now.toDateString();
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          matchesDate = invoiceDate >= weekAgo;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          matchesDate = invoiceDate >= monthAgo;
        } else if (dateFilter === "failed") {
          matchesDate = !invoice.file_url;
        }
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    }) || [];

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'invoice_number':
          aValue = a.invoice_number;
          bValue = b.invoice_number;
          break;
        case 'total_amount':
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownload = async (invoice: Invoice) => {
    console.group('📥 Invoice Download - Start');
    console.log('Invoice:', {
      id: invoice.id,
      number: invoice.invoice_number,
      file_url: invoice.file_url
    });

    if (!invoice.file_url) {
      console.error('❌ No file_url in invoice');
      console.groupEnd();
      toast({
        title: "No PDF available",
        description: "Please regenerate the PDF first.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔄 Step 1: Converting to signed URL...');
      const signedUrl = await ensureSignedUrl(invoice.file_url);
      console.log('✅ Signed URL obtained:', signedUrl.substring(0, 100) + '...');
      
      console.log('🔄 Step 2: Fetching PDF...');
      const response = await fetch(signedUrl);
      console.log('📥 Fetch response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers.get('content-type'),
          'content-length': response.headers.get('content-length')
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fetch failed:', errorText);
        console.groupEnd();
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('🔄 Step 3: Creating blob...');
      const blob = await response.blob();
      console.log('✅ Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      if (blob.size === 0) {
        console.error('❌ Blob is empty (size = 0)');
        console.groupEnd();
        throw new Error('Downloaded file is empty');
      }
      
      console.log('🔄 Step 4: Triggering download...');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Download complete');
      console.groupEnd();
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully.",
      });
    } catch (error) {
      console.error('❌ Download error:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
      console.groupEnd();
      
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download the PDF.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async (invoiceId: string) => {
    setRegeneratingId(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId },
      });

      if (error) throw error;

      toast({
        title: "PDF regenerated",
        description: "The invoice PDF has been regenerated successfully.",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Regeneration failed",
        description: error.message || "Failed to regenerate PDF.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleTestStorage = async (invoice: Invoice) => {
    console.group('🧪 Storage Test - Start');
    
    try {
      // Test 1: Check if file exists
      console.log('Test 1: Checking if file exists...');
      const folderPath = invoice.file_url?.split('/')[0] || '';
      const { data: fileList, error: listError } = await supabase.storage
        .from('invoices')
        .list(folderPath, {
          search: invoice.invoice_number
        });
      
      console.log('File list result:', { fileList, listError });
      
      // Test 2: Try to get signed URL directly
      console.log('Test 2: Getting signed URL...');
      const { data: signedData, error: signedError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.file_url || '', 3600);
      
      console.log('Signed URL result:', { signedData, signedError });
      
      // Test 3: Check authentication
      console.log('Test 3: Checking auth...');
      const { data: session } = await supabase.auth.getSession();
      console.log('Session exists:', !!session?.session);
      console.log('User ID:', session?.session?.user?.id);
      
      console.groupEnd();
      
      toast({
        title: "Storage Test Complete",
        description: "Check browser console for detailed results",
      });
    } catch (error) {
      console.error('❌ Test error:', error);
      console.groupEnd();
    }
  };

  const getInvoiceTypeDisplay = (type: string) => {
    return type.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'paid': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const handleRegenerateMissingPDFs = async () => {
    setRegeneratingAll(true);
    try {
      toast({
        title: "Scanning invoices...",
        description: "Checking for missing PDF files in storage.",
      });

      const { data, error } = await supabase.functions.invoke('regenerate-missing-invoices');
      
      if (error) throw error;
      
      const result = data as {
        total: number;
        missing: string[];
        regenerated: string[];
        failed: { invoice: string; reason: string }[];
        already_exists: string[];
      };

      toast({
        title: "PDF Regeneration Complete",
        description: (
          <div className="space-y-2 text-sm">
            <p>Total invoices: {result.total}</p>
            <p>Already have PDFs: {result.already_exists.length}</p>
            <p>Missing PDFs found: {result.missing.length}</p>
            <p>Successfully regenerated: {result.regenerated.length}</p>
            <p>Failed: {result.failed.length}</p>
            {result.failed.length > 0 && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-destructive">
                Failed invoices: {result.failed.map(f => f.invoice).join(', ')}
              </div>
            )}
          </div>
        ),
      });

      if (result.regenerated.length > 0) {
        refetch();
      }
    } catch (error: any) {
      console.error('Error regenerating PDFs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate missing PDFs',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PortalPageHeader
        variant="admin"
        title="Invoice Management"
        subtitle="Manage and track all your invoices"
        totalIcon={FileText}
        totalCount={invoices?.length || 0}
        stats={[
          { label: 'Awaiting Payment', count: invoices?.filter(i => i.status === 'sent' || i.status === 'draft').length || 0, icon: Clock },
          { label: 'Paid', count: invoices?.filter(i => i.status === 'paid').length || 0, icon: CheckCircle2 },
          { label: 'Cancelled', count: invoices?.filter(i => i.status === 'cancelled').length || 0, icon: XCircle },
        ]}
      />
      
      {hasSuperAdminAccess && (
        <div className="flex justify-end">
          <Button
            onClick={handleRegenerateMissingPDFs}
            disabled={regeneratingAll}
            variant="outline"
            className="gap-2"
          >
            {regeneratingAll && <RefreshCw className="h-4 w-4 animate-spin" />}
            <Beaker className="h-4 w-4" />
            Regenerate Missing PDFs
          </Button>
        </div>
      )}

      <InteractiveCard variant="glass" className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filters & Quick Views
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Invoice Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="packing_list">Packing List</SelectItem>
                <SelectItem value="commercial">Commercial Invoice</SelectItem>
                <SelectItem value="proforma">Proforma Invoice</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="failed">Failed PDFs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </InteractiveCard>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-3">
          {paginatedInvoices.map((invoice) => (
            <MobileInvoiceCard
              key={invoice.id}
              invoice={invoice}
              onClick={() => {
                setSelectedInvoiceForDetail(invoice);
                setDetailDialogOpen(true);
              }}
              onPreview={() => {
                setSelectedInvoiceForPreview(invoice);
                setPreviewDialogOpen(true);
              }}
              onDownload={() => handleDownload(invoice)}
              onRegenerate={() => handleRegenerate(invoice.id)}
              isRegenerating={regeneratingId === invoice.id}
            />
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <InteractiveCard variant="elevated" className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('invoice_number')}
                    >
                      <div className="flex items-center gap-1">
                        Invoice # <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('total_amount')}
                    >
                      <div className="flex items-center gap-1">
                        Amount <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Date <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>PDF</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No invoices found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getInvoiceTypeDisplay(invoice.invoice_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{invoice.customers?.company_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.customers?.email}
                            </div>
                            {invoice.orders && (
                              <Badge variant="secondary" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {invoice.orders.order_number}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {invoice.total_amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {invoice.currency}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.file_url ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-muted-foreground">Available</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                              <span className="text-xs text-muted-foreground">Missing</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoiceForPreview(invoice);
                                setPreviewDialogOpen(true);
                              }}
                              disabled={!invoice.file_url}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(invoice)}
                              disabled={!invoice.file_url}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {hasSuperAdminAccess && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRegenerate(invoice.id)}
                                  disabled={regeneratingId === invoice.id}
                                >
                                  {regeneratingId === invoice.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTestStorage(invoice)}
                                >
                                  <Beaker className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </InteractiveCard>
      )}
      
      <InvoicePDFPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        invoice={selectedInvoiceForPreview}
      />

      <MobileInvoiceDetailDialog
        invoice={selectedInvoiceForDetail}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onPreview={(invoice) => {
          const fullInvoice = paginatedInvoices.find(i => i.id === invoice.id);
          if (fullInvoice) {
            setSelectedInvoiceForPreview(fullInvoice);
            setPreviewDialogOpen(true);
          }
        }}
        onDownload={(invoice) => {
          const fullInvoice = paginatedInvoices.find(i => i.id === invoice.id);
          if (fullInvoice) handleDownload(fullInvoice);
        }}
        onRegenerate={(id) => handleRegenerate(id)}
        isRegenerating={selectedInvoiceForDetail ? regeneratingId === selectedInvoiceForDetail.id : false}
      />
    </div>
  );
}