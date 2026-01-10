import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Clock, Package, CheckCircle2, TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface OrdersKPISummaryProps {
  orders: Order[];
}

export const OrdersKPISummary: React.FC<OrdersKPISummaryProps> = ({ orders }) => {
  // Calculate KPIs
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const thisMonthOrders = orders.filter(o => new Date(o.created_at) >= thisMonth);
  
  const totalValue = thisMonthOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const pendingPayment = orders.filter(o => o.status === 'pending_payment' || o.status === 'order_confirmed');
  const readyToShip = orders.filter(o => o.status === 'ready_to_ship');
  const deliveredThisMonth = thisMonthOrders.filter(o => o.status === 'delivered');

  const kpis = [
    {
      label: 'Total Value',
      sublabel: 'This Month',
      value: `GHS ${totalValue.toLocaleString()}`,
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Pending Payment',
      sublabel: `${pendingPayment.length} orders`,
      value: `GHS ${pendingPayment.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}`,
      icon: Clock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Ready to Ship',
      sublabel: 'Awaiting dispatch',
      value: readyToShip.length.toString(),
      icon: Package,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Delivered',
      sublabel: 'This Month',
      value: deliveredThisMonth.length.toString(),
      icon: CheckCircle2,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sublabel}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                  <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
