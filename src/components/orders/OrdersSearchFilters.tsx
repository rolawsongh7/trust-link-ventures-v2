import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SearchFilters, ORDER_STATUSES } from '@/types/filters';

interface OrdersSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
}

export const OrdersSearchFilters = ({
  filters,
  onFiltersChange,
  onClearFilters
}: OrdersSearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.customer,
    filters.orderNumber,
    filters.status.length > 0,
    filters.dateRange !== null,
    filters.amountRange !== null,
    filters.origin !== 'all'
  ].filter(Boolean).length;

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    onFiltersChange({ ...filters, status: newStatus });
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Advanced Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearFilters();
                      setIsOpen(false);
                    }}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer">Customer Name</Label>
                <Input
                  id="customer"
                  placeholder="Search by customer..."
                  value={filters.customer}
                  onChange={(e) => onFiltersChange({ ...filters, customer: e.target.value })}
                />
              </div>

              {/* Order Number */}
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., ORD-202401-0001"
                  value={filters.orderNumber}
                  onChange={(e) => onFiltersChange({ ...filters, orderNumber: e.target.value })}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {ORDER_STATUSES.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={filters.status.includes(status)}
                        onCheckedChange={() => handleStatusToggle(status)}
                      />
                      <label
                        htmlFor={status}
                        className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {formatStatus(status)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange ? (
                        `${format(filters.dateRange.from, 'MMM d, yyyy')} - ${format(filters.dateRange.to, 'MMM d, yyyy')}`
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange ? {
                        from: filters.dateRange.from,
                        to: filters.dateRange.to
                      } : undefined}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          onFiltersChange({ 
                            ...filters, 
                            dateRange: { from: range.from, to: range.to }
                          });
                        } else {
                          onFiltersChange({ ...filters, dateRange: null });
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Min"
                        className="pl-8"
                        value={filters.amountRange?.min || ''}
                        onChange={(e) => onFiltersChange({
                          ...filters,
                          amountRange: {
                            min: parseFloat(e.target.value) || 0,
                            max: filters.amountRange?.max || 0
                          }
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Max"
                        className="pl-8"
                        value={filters.amountRange?.max || ''}
                        onChange={(e) => onFiltersChange({
                          ...filters,
                          amountRange: {
                            min: filters.amountRange?.min || 0,
                            max: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Origin */}
              <div className="space-y-2">
                <Label>Order Origin</Label>
                <RadioGroup
                  value={filters.origin}
                  onValueChange={(value: 'all' | 'auto' | 'manual') => 
                    onFiltersChange({ ...filters, origin: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal cursor-pointer">All Orders</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto" className="font-normal cursor-pointer">Auto (from quotes)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="font-normal cursor-pointer">Manual</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.customer && (
              <Badge variant="secondary" className="gap-1">
                Customer: {filters.customer}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, customer: '' })}
                />
              </Badge>
            )}
            {filters.orderNumber && (
              <Badge variant="secondary" className="gap-1">
                Order: {filters.orderNumber}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, orderNumber: '' })}
                />
              </Badge>
            )}
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                Status: {filters.status.length}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, status: [] })}
                />
              </Badge>
            )}
            {filters.dateRange && (
              <Badge variant="secondary" className="gap-1">
                Date Range
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, dateRange: null })}
                />
              </Badge>
            )}
            {filters.amountRange && (
              <Badge variant="secondary" className="gap-1">
                Amount Range
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, amountRange: null })}
                />
              </Badge>
            )}
            {filters.origin !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Origin: {filters.origin}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, origin: 'all' })}
                />
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
