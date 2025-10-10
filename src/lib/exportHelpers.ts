import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

interface ExportOptions {
  format: 'csv' | 'excel';
  includeHeaders?: boolean;
  selectedColumns?: string[];
  filename?: string;
}

export class DataExporter {
  /**
   * Export orders data to CSV or Excel format
   */
  static async exportOrders(
    orders: any[],
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate input
      if (!orders || orders.length === 0) {
        throw new Error('No data to export');
      }

      // Sanitize and transform data for export
      const exportData = this.sanitizeForExport(orders);

      if (options.format === 'csv') {
        await this.exportToCSV(exportData, options);
      } else {
        await this.exportToExcel(exportData, options);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Export error:', error);
      const errorMessage = error.message || 'Failed to export data';
      toast({
        title: 'Export Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sanitize and transform order data for export
   */
  private static sanitizeForExport(orders: any[]): any[] {
    return orders.map((order) => ({
      'Order Number': order.order_number || 'N/A',
      'Customer': order.customers?.company_name || order.customers?.contact_name || 'N/A',
      'Status': (order.status || 'unknown').replace(/_/g, ' ').toUpperCase(),
      'Total Amount': order.total_amount ? `${order.total_amount}` : '0',
      'Currency': order.currency || 'USD',
      'Created Date': order.created_at
        ? new Date(order.created_at).toLocaleDateString()
        : 'N/A',
      'Quote Number': order.quotes?.quote_number || 'None',
      'Origin': order.quote_id ? 'Auto-generated' : 'Manual',
      'Delivery Address': order.delivery_address_id ? 'Confirmed' : 'Pending',
      'Shipped Date': order.shipped_at
        ? new Date(order.shipped_at).toLocaleDateString()
        : 'N/A',
      'Delivered Date': order.delivered_at
        ? new Date(order.delivered_at).toLocaleDateString()
        : 'N/A',
      'Items Count': order.order_items?.length || 0,
    }));
  }

  /**
   * Export data to CSV format
   */
  private static exportToCSV(data: any[], options: ExportOptions): void {
    const csv = Papa.unparse(data, {
      quotes: true,
      header: options.includeHeaders !== false,
      skipEmptyLines: true,
    });

    const filename = options.filename || `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');

    toast({
      title: 'Export Successful',
      description: `Exported ${data.length} orders to CSV`,
    });
  }

  /**
   * Export data to Excel format
   */
  private static exportToExcel(data: any[], options: ExportOptions): void {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();

      // Set column widths for better readability
      const columnWidths = [
        { wch: 15 }, // Order Number
        { wch: 25 }, // Customer
        { wch: 15 }, // Status
        { wch: 12 }, // Total Amount
        { wch: 8 },  // Currency
        { wch: 12 }, // Created Date
        { wch: 15 }, // Quote Number
        { wch: 15 }, // Origin
        { wch: 18 }, // Delivery Address
        { wch: 12 }, // Shipped Date
        { wch: 12 }, // Delivered Date
        { wch: 10 }, // Items Count
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

      const filename = options.filename || `orders-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Export Successful',
        description: `Exported ${data.length} orders to Excel`,
      });
    } catch (error: any) {
      console.error('Excel export error:', error);
      throw new Error('Failed to generate Excel file. Try CSV format instead.');
    }
  }

  /**
   * Trigger file download in browser
   */
  private static downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export quotes data
   */
  static async exportQuotes(
    quotes: any[],
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!quotes || quotes.length === 0) {
        throw new Error('No quotes to export');
      }

      const exportData = quotes.map((quote) => ({
        'Quote Number': quote.quote_number || 'N/A',
        'Title': quote.title || 'N/A',
        'Customer': quote.customers?.company_name || quote.customer_email || 'N/A',
        'Status': (quote.status || 'unknown').replace(/_/g, ' ').toUpperCase(),
        'Total Amount': quote.total_amount ? `${quote.total_amount}` : '0',
        'Currency': quote.currency || 'USD',
        'Valid Until': quote.valid_until
          ? new Date(quote.valid_until).toLocaleDateString()
          : 'N/A',
        'Created Date': quote.created_at
          ? new Date(quote.created_at).toLocaleDateString()
          : 'N/A',
        'Origin': (quote.origin_type || 'manual').toUpperCase(),
        'Approved': quote.approved_at ? 'Yes' : 'No',
      }));

      if (options.format === 'csv') {
        const csv = Papa.unparse(exportData, {
          quotes: true,
          header: options.includeHeaders !== false,
        });
        const filename = options.filename || `quotes-export-${new Date().toISOString().split('T')[0]}.csv`;
        this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      } else {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotes');
        const filename = options.filename || `quotes-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
      }

      toast({
        title: 'Export Successful',
        description: `Exported ${quotes.length} quotes`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export quotes',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  }
}
