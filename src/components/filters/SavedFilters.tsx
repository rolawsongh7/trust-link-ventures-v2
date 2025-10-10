import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  columns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SavedFiltersProps {
  entityType: 'orders' | 'quotes' | 'leads' | 'customers';
  currentFilters: Record<string, any>;
  onApplyView: (view: SavedView) => void;
}

const defaultViews: Record<string, SavedView[]> = {
  orders: [
    { id: '1', name: 'Pending Payment', filters: { status: ['pending_payment'] } },
    { id: '2', name: 'Ready to Ship', filters: { status: ['ready_to_ship'] } },
    { id: '3', name: 'High Value Orders', filters: { amountRange: { min: 10000 } } },
  ],
  quotes: [
    { id: '1', name: 'Pending Quotes', filters: { status: ['sent'] } },
    { id: '2', name: 'Accepted This Month', filters: { status: ['accepted'], dateRange: 'this_month' } },
  ],
  customers: [
    { id: '1', name: 'Active Customers', filters: { status: 'active' } },
    { id: '2', name: 'High Priority', filters: { priority: 'high' } },
  ],
  leads: [
    { id: '1', name: 'Hot Leads', filters: { lead_score: { min: 80 } } },
    { id: '2', name: 'New This Week', filters: { status: ['new'], dateRange: 'this_week' } },
  ],
};

export const SavedFilters: React.FC<SavedFiltersProps> = ({
  entityType,
  currentFilters,
  onApplyView,
}) => {
  const [views, setViews] = useState<SavedView[]>(defaultViews[entityType] || []);
  const [newViewName, setNewViewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const saveCurrentView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }

    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName,
      filters: currentFilters,
    };

    setViews(prev => [...prev, newView]);
    toast.success(`View "${newViewName}" saved`);
    setNewViewName('');
    setDialogOpen(false);
  };

  const deleteView = (id: string) => {
    setViews(prev => prev.filter(v => v.id !== id));
    toast.success('View deleted');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Saved Views</CardTitle>
            <CardDescription>Quick access to common filters</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Save Current View
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current View</DialogTitle>
                <DialogDescription>
                  Save your current filters and settings as a reusable view
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>View Name</Label>
                  <Input
                    placeholder="e.g., High Priority Orders"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Filters</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <pre>{JSON.stringify(currentFilters, null, 2)}</pre>
                  </div>
                </div>
                <Button onClick={saveCurrentView} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save View
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {views.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No saved views yet
            </p>
          ) : (
            views.map((view) => (
              <div
                key={view.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{view.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {Object.keys(view.filters).length} filters
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onApplyView(view)}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteView(view.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
