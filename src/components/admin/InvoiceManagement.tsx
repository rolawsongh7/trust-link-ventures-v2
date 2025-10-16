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
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  total_amount: number;
  currency: string;
  status: string;
  file_url: string | null;
  created_at: string;
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

export default function InvoiceManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

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

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || invoice.invoice_type === typeFilter;
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDownload = async (invoice: Invoice) => {
    if (!invoice.file_url) {
      toast({
        title: "No PDF available",
        description: "Please regenerate the PDF first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(invoice.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the PDF.",
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

  const getInvoiceTypeIcon = (type: string) => {
    switch (type) {
      case 'packing_list': return <Package className="h-4 w-4" />;
      case 'commercial': return <Receipt className="h-4 w-4" />;
      case 'proforma': return <FileCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getInvoiceTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      packing_list: "secondary",
      commercial: "default",
      proforma: "outline",
    };
    return variants[type] || "outline";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "outline",
      sent: "secondary",
      paid: "default",
    };
    return variants[status] || "outline";
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
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredInvoices?.map((invoice) => (
          <Card key={invoice.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {getInvoiceTypeIcon(invoice.invoice_type)}
                    <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                    <Badge variant={getInvoiceTypeBadge(invoice.invoice_type)}>
                      {invoice.invoice_type.replace('_', ' ')}
                    </Badge>
                    <Badge variant={getStatusBadge(invoice.status)}>
                      {invoice.status}
                    </Badge>
                    {!invoice.file_url && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        No PDF
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer:</span>
                      <p className="font-medium">{invoice.customers?.company_name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">
                        {invoice.currency} {invoice.total_amount.toFixed(2)}
                      </p>
                    </div>
                    
                    {invoice.orders && (
                      <div>
                        <span className="text-muted-foreground">Order:</span>
                        <p className="font-medium">{invoice.orders.order_number}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p className="font-medium">
                        {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {invoice.file_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(invoice)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  ) : null}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRegenerate(invoice)}
                    disabled={regeneratingId === invoice.id}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingId === invoice.id ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>

                  {invoice.order_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.location.href = `/admin/orders`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Order
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredInvoices?.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
