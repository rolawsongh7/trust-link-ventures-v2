import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Calendar } from 'lucide-react';
import { InvoiceSearchFilters, INVOICE_STATUSES, INVOICE_TYPES } from '@/types/filters';

interface InvoiceFilterPanelProps {
  filters: InvoiceSearchFilters;
  onFilterChange: (filters: InvoiceSearchFilters) => void;
  totalInvoices: number;
  filteredCount: number;
}

export const InvoiceFilterPanel = ({ 
  filters, 
  onFilterChange, 
  totalInvoices,
  filteredCount 
}: InvoiceFilterPanelProps) => {
  
  const handleClearFilters = () => {
    onFilterChange({
      searchTerm: '',
      status: [],
      invoiceType: ['commercial'], // Reset to commercial default
      dateRange: null,
      timePeriod: 'all',
      amountRange: null,
      currency: []
    });
  };

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFilterChange({ ...filters, status: newStatus });
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.invoiceType.includes(type)
      ? filters.invoiceType.filter(t => t !== type)
      : [...filters.invoiceType, type];
    onFilterChange({ ...filters, invoiceType: newTypes });
  };

  const hasActiveFilters = 
    filters.searchTerm || 
    filters.status.length > 0 || 
    (filters.invoiceType.length > 0 && 
     !(filters.invoiceType.length === 1 && filters.invoiceType[0] === 'commercial')) || 
    filters.timePeriod !== 'all';

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      proforma: 'Proforma',
      commercial: 'Commercial',
      packing_list: 'Packing List'
    };
    return labels[type] || type;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Invoice or order #"
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="space-y-2">
          <Label htmlFor="timePeriod" className="text-sm font-medium">Time Period</Label>
          <Select
            value={filters.timePeriod}
            onValueChange={(value) => onFilterChange({ 
              ...filters, 
              timePeriod: value as InvoiceSearchFilters['timePeriod'] 
            })}
          >
            <SelectTrigger id="timePeriod">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="quarter">Past Quarter</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <div className="space-y-2 pt-2">
            {INVOICE_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => handleStatusToggle(status)}
                />
                <label
                  htmlFor={`status-${status}`}
                  className="text-sm font-normal cursor-pointer capitalize"
                >
                  {status}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Type Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Invoice Type</Label>
          <div className="space-y-2 pt-2">
            {INVOICE_TYPES.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={filters.invoiceType.includes(type)}
                  onCheckedChange={() => handleTypeToggle(type)}
                />
                <label
                  htmlFor={`type-${type}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {getTypeLabel(type)}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredCount}</span> of{' '}
          <span className="font-semibold text-foreground">{totalInvoices}</span> invoices
        </p>
      </div>
    </Card>
  );
};
