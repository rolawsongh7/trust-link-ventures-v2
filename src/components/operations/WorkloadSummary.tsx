import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserX, AlertCircle } from 'lucide-react';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import type { Order } from '@/hooks/useOrdersQuery';
import { cn } from '@/lib/utils';

interface WorkloadSummaryProps {
  orders: Order[];
}

interface StaffWorkload {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  status: 'light' | 'balanced' | 'overloaded';
}

function getWorkloadStatus(count: number): 'light' | 'balanced' | 'overloaded' {
  if (count > 10) return 'overloaded';
  if (count >= 5) return 'balanced';
  return 'light';
}

const workloadColors = {
  light: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  balanced: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  overloaded: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const workloadLabels = {
  light: 'Light',
  balanced: 'Balanced',
  overloaded: 'Overloaded',
};

export function WorkloadSummary({ orders }: WorkloadSummaryProps) {
  const { staffMembers: rawStaffMembers, loading } = useStaffMembers();
  
  // Map staff members to expected format
  const staffMembers = rawStaffMembers.map(s => ({
    id: s.id,
    name: s.full_name || s.email.split('@')[0],
    email: s.email,
  }));
  
  // Filter to active orders only (not delivered/cancelled)
  const activeOrders = orders.filter(o => 
    !['delivered', 'cancelled'].includes(o.status)
  );
  
  // Calculate unassigned count
  const unassignedCount = activeOrders.filter(o => !o.assigned_to).length;
  
  // Calculate workload per staff member
  const staffWorkloads: StaffWorkload[] = staffMembers.map(staff => {
    const assignedOrders = activeOrders.filter(o => o.assigned_to === staff.id);
    const orderCount = assignedOrders.length;
    
    return {
      id: staff.id,
      name: staff.name || staff.email.split('@')[0],
      email: staff.email,
      orderCount,
      status: getWorkloadStatus(orderCount),
    };
  }).sort((a, b) => b.orderCount - a.orderCount);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Staff Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Unassigned alert */}
        {unassignedCount > 0 && (
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg border',
            unassignedCount > 5 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : 'bg-muted/50 border-border'
          )}>
            <div className="flex items-center gap-2">
              <UserX className={cn(
                'h-4 w-4',
                unassignedCount > 5 ? 'text-amber-500' : 'text-muted-foreground'
              )} />
              <span className="text-sm font-medium">Unassigned</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                'font-semibold',
                unassignedCount > 5 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                  : ''
              )}
            >
              {unassignedCount}
            </Badge>
          </div>
        )}
        
        {/* Staff list */}
        <div className="space-y-2">
          {staffWorkloads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No staff members found
            </p>
          ) : (
            staffWorkloads.map(staff => (
              <div 
                key={staff.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {staff.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={cn('text-xs', workloadColors[staff.status])}
                  >
                    {workloadLabels[staff.status]}
                  </Badge>
                  <span className="text-sm font-semibold w-8 text-right">
                    {staff.orderCount}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Legend */}
        <div className="pt-3 border-t flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Light (&lt;5)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Balanced (5-10)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Overloaded (&gt;10)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
