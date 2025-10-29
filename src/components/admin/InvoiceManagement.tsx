import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { InvoicePDFPreviewDialog } from './InvoicePDFPreviewDialog';
import { ensureSignedUrl } from '@/lib/storageHelpers';
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

  const handleRegenerate = async (invoice: Invoice) => {
    setRegeneratingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
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
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('invoice_number')}
                >
                  <div className="flex items-center gap-2">
                    Invoice #
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('total_amount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(invoice.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.invoice_number}</span>
                      {!invoice.file_url && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          No PDF
                        </Badge>
                      )}
                    </div>
                    {invoice.orders && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Order: {invoice.orders.order_number}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {getInvoiceTypeDisplay(invoice.invoice_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {invoice.customers?.company_name || 'N/A'}
                      </span>
                      {invoice.customers?.email && (
                        <span className="text-xs text-muted-foreground">
                          {invoice.customers.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {invoice.currency} {invoice.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.file_url && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoiceForPreview(invoice);
                              setPreviewDialogOpen(true);
                            }}
                            title="Preview PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(invoice)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTestStorage(invoice)}
                        title="Test Storage (Check Console)"
                      >
                        🧪
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRegenerate(invoice)}
                        disabled={regeneratingId === invoice.id}
                        title="Regenerate PDF"
                      >
                        <RefreshCw className={`h-4 w-4 ${regeneratingId === invoice.id ? 'animate-spin' : ''}`} />
                      </Button>

                      {invoice.order_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/admin/orders`}
                          title="View Order"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {paginatedInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No invoices found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <InvoicePDFPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        invoice={selectedInvoiceForPreview}
      />
    </div>
  );
}