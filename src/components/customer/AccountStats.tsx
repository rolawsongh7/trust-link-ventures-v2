import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MessageSquare, DollarSign, TrendingUp, Calendar, Award, Clock } from 'lucide-react';
import { useCounterAnimation } from '@/hooks/useCounterAnimation';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { format, formatDistanceToNow } from 'date-fns';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend }) => (
  <div className="p-4 rounded-xl border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 rounded-lg bg-maritime-500/10 text-maritime-600">
        {icon}
      </div>
      {trend && (
        <span className="text-xs text-emerald-600 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

export const AccountStats: React.FC = () => {
  const { user, profile } = useCustomerAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalQuotes: 0,
    totalSpent: 0,
    memberSince: '',
    accountStatus: '',
  });

  const ordersCount = useCounterAnimation({ end: stats.totalOrders, duration: 1500 });
  const quotesCount = useCounterAnimation({ end: stats.totalQuotes, duration: 1500 });
  const spentCount = useCounterAnimation({ end: stats.totalSpent, duration: 2000, suffix: '' });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      // First, get the customer_id from customer_users table using auth user ID
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      const customerId = customerMapping?.customer_id || profile?.id;

      // Fetch orders count and total
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_id', customerId)
        .not('status', 'eq', 'cancelled');

      // Fetch quotes count
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('id')
        .eq('customer_id', customerId);

      // Get customer created date and status
      const { data: customer } = await supabase
        .from('customers')
        .select('created_at, customer_status')
        .eq('id', customerId)
        .single();

      setStats({
        totalOrders: orders?.length || 0,
        totalQuotes: quotes?.length || 0,
        totalSpent: orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
        memberSince: customer?.created_at || '',
        accountStatus: customer?.customer_status || 'active',
      });
    };

    fetchStats();
  }, [user?.id, profile?.id]);

  const memberSinceDate = stats.memberSince ? new Date(stats.memberSince) : null;
  const memberDuration = memberSinceDate ? formatDistanceToNow(memberSinceDate, { addSuffix: false }) : '';

  return (
    <Card className="border-l-4 border-l-maritime-500 shadow-lg hover:shadow-xl transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-maritime-500" />
          Account Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3" ref={ordersCount.ref}>
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Orders"
            value={ordersCount.count}
          />
          <StatCard
            icon={<MessageSquare className="h-5 w-5" />}
            label="Quotes"
            value={quotesCount.count}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Total Spent"
            value={`$${spentCount.count}`}
          />
        </div>

        {/* Additional Info */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Member Since
            </span>
            <span className="font-medium">
              {memberSinceDate ? format(memberSinceDate, 'MMMM yyyy') : 'N/A'}
              {memberDuration && (
                <span className="text-muted-foreground ml-1">({memberDuration})</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Award className="h-4 w-4" />
              Account Status
            </span>
            <span className="font-medium flex items-center gap-1 capitalize">
              {stats.accountStatus === 'active' && '✓ '}
              {stats.accountStatus}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
