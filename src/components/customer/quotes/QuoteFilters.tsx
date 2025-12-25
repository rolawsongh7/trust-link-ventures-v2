import React from 'react';
import { Search, LayoutGrid, Table as TableIcon, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { quoteStatusFilterOptions } from '@/utils/quoteStatusConfig';

interface QuoteFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  viewMode: 'table' | 'cards';
  setViewMode: (mode: 'table' | 'cards') => void;
  onClearFilters: () => void;
}

export const QuoteFilters: React.FC<QuoteFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
  onClearFilters
}) => {
  return (
    <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/70 rounded-xl shadow-sm p-4 border border-[hsl(var(--tl-border))]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-trustlink-maritime" />
          <Input
            type="text"
            placeholder="Search quotes..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--tl-border))] focus:ring-2 focus:ring-trustlink-maritime/40 focus:border-trustlink-maritime"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="border-[hsl(var(--tl-border))] focus:ring-2 focus:ring-trustlink-maritime/40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {quoteStatusFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="flex-1 border-2 border-trustlink-gold text-trustlink-gold hover:bg-trustlink-gold/10 transition-all"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
      
      {/* View Toggle - Segmented Control */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-[hsl(var(--tl-text-secondary))]">View:</span>
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              viewMode === 'table'
                ? "bg-white dark:bg-slate-700 text-trustlink-navy dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              viewMode === 'cards'
                ? "bg-white dark:bg-slate-700 text-trustlink-navy dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>
    </div>
  );
};
