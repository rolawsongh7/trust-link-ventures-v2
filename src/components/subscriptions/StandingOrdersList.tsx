// Standing Orders List Component
// Phase 5.3: Admin view for managing recurring orders

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  RefreshCw, 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  Play, 
  Pause, 
  XCircle,
  Eye,
  Zap,
  Search,
  Filter,
} from 'lucide-react';
import { 
  useStandingOrders, 
  useStandingOrderMutations,
  getFrequencyLabel,
  getStandingOrderStatusColor,
  type StandingOrderStatus,
} from '@/hooks/useStandingOrders';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StandingOrdersListProps {
  customerId?: string;
  onCreateNew?: () => void;
}

export function StandingOrdersList({ customerId, onCreateNew }: StandingOrdersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StandingOrderStatus[]>(['active', 'paused']);
  
  const { data: standingOrders, isLoading, refetch } = useStandingOrders({ 
    customerId, 
    status: statusFilter.length > 0 ? statusFilter : undefined,
  });
  const { updateStandingOrderStatus, generateOrderNow } = useStandingOrderMutations();

  const filteredOrders = standingOrders?.filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.name.toLowerCase().includes(term) ||
      order.customers?.company_name?.toLowerCase().includes(term)
    );
  }) || [];

  const toggleStatusFilter = (status: StandingOrderStatus) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Standing Orders
            </CardTitle>
            <CardDescription>
              Recurring order schedules that generate draft quotes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onCreateNew && (
              <Button size="sm" onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Standing Order
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={statusFilter.includes('active') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter.includes('paused') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleStatusFilter('paused')}
            >
              Paused
            </Button>
            <Button
              variant={statusFilter.includes('cancelled') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleStatusFilter('cancelled')}
            >
              Cancelled
            </Button>
          </div>
        </div>

        {/* Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No standing orders found</p>
            {onCreateNew && (
              <Button variant="outline" className="mt-4" onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Standing Order
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {!customerId && <TableHead>Customer</TableHead>}
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Scheduled</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.name}</p>
                        {order.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {order.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    {!customerId && (
                      <TableCell>
                        <Link 
                          to={`/customers/${order.customer_id}`}
                          className="hover:underline"
                        >
                          {order.customers?.company_name || 'Unknown'}
                        </Link>
                      </TableCell>
                    )}
                    <TableCell>{getFrequencyLabel(order.frequency)}</TableCell>
                    <TableCell>
                      {order.status === 'active' ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(order.next_scheduled_date), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {order.total_orders_generated} orders
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStandingOrderStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/standing-orders/${order.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          
                          {order.status === 'active' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => generateOrderNow.mutate(order.id)}
                                disabled={generateOrderNow.isPending}
                              >
                                <Zap className="h-4 w-4 mr-2" />
                                Generate Now
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => updateStandingOrderStatus.mutate({
                                  standingOrderId: order.id,
                                  status: 'paused',
                                })}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {order.status === 'paused' && (
                            <DropdownMenuItem
                              onClick={() => updateStandingOrderStatus.mutate({
                                standingOrderId: order.id,
                                status: 'active',
                              })}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          
                          {order.status !== 'cancelled' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => updateStandingOrderStatus.mutate({
                                  standingOrderId: order.id,
                                  status: 'cancelled',
                                  reason: 'Cancelled by admin',
                                })}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
