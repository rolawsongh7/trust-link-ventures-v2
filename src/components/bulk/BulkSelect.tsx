import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkSelectProps<T extends { id: string }> {
  items: T[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function useBulkSelect<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return {
    selectedIds,
    toggleSelectAll,
    toggleSelectItem,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
  };
}

export const BulkSelectHeader: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ checked, indeterminate, onCheckedChange }) => {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label="Select all"
      className={indeterminate ? 'data-[state=indeterminate]:bg-primary' : ''}
    />
  );
};

export const BulkSelectCell: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ checked, onCheckedChange }) => {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label="Select row"
    />
  );
};
