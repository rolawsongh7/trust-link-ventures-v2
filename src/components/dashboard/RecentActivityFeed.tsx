import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Users, Package, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'quote' | 'customer' | 'order' | 'alert';
  title: string;
  time: string;
  status: string;
}

export const RecentActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const activities: Activity[] = [];

      // Fetch recent quotes
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, quote_number, status, created_at, customers(company_name)')
        .order('created_at', { ascending: false })
        .limit(3);

      quotes?.forEach((quote) => {
        activities.push({
          id: quote.id,
          type: 'quote',
          title: `Quote ${quote.quote_number} ${quote.status === 'sent' ? 'sent to' : 'created for'} ${(quote.customers as any)?.company_name || 'customer'}`,
          time: quote.created_at,
          status: quote.status,
        });
      });

      // Fetch recent customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id, company_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      customers?.forEach((customer) => {
        activities.push({
          id: customer.id,
          type: 'customer',
          title: `New customer registered: ${customer.company_name}`,
          time: customer.created_at,
          status: 'completed',
        });
      });

      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      orders?.forEach((order) => {
        activities.push({
          id: order.id,
          type: 'order',
          title: `Order ${order.order_number} ${order.status}`,
          time: order.created_at,
          status: order.status,
        });
      });

      // Sort by time and limit to 8 most recent
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(activities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote':
        return <FileText className="h-5 w-5 text-white" />;
      case 'customer':
        return <Users className="h-5 w-5 text-white" />;
      case 'order':
        return <Package className="h-5 w-5 text-white" />;
      default:
        return <Activity className="h-5 w-5 text-white" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      draft: { bg: 'bg-[#94A3B8]', text: 'text-white' },
      sent: { bg: 'bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9]', text: 'text-white' },
      accepted: { bg: 'bg-gradient-to-r from-[#10B981] to-[#059669]', text: 'text-white' },
      active: { bg: 'bg-gradient-to-r from-[#10B981] to-[#059669]', text: 'text-white' },
      completed: { bg: 'bg-gradient-to-r from-[#10B981] to-[#059669]', text: 'text-white' },
      pending: { bg: 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]', text: 'text-white' },
      processing: { bg: 'bg-gradient-to-r from-[#8B5CF6] to-[#6366F1]', text: 'text-white' },
      quote_pending: { bg: 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]', text: 'text-white' },
    };

    const config = statusConfig[status] || { bg: 'bg-[#94A3B8]', text: 'text-white' };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#1E293B]">Recent Activity</h2>
        <p className="text-sm text-[#64748B] mt-1">Latest updates from your business</p>
      </div>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-[#E2E8F0]"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#E2E8F0] rounded w-3/4"></div>
                <div className="h-3 bg-[#E2E8F0] rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-[#0EA5E9]/10 flex items-center justify-center">
            <Activity className="h-8 w-8 text-[#3B82F6]/50" />
          </div>
          <p className="text-[#64748B]">No recent activity</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#3B82F6] via-[#8B5CF6] to-[#EC4899]"></div>
          
          <div className="space-y-6">
            {activities.map((activity, index) => {
              const iconColor = activity.type === 'quote' 
                ? 'from-[#3B82F6] to-[#0EA5E9]'
                : activity.type === 'customer'
                ? 'from-[#10B981] to-[#059669]'
                : 'from-[#8B5CF6] to-[#6366F1]';
              
              return (
                <div key={activity.id} className="relative flex gap-4 group">
                  {/* Timeline dot */}
                  <div className={`relative z-10 h-10 w-10 rounded-full bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-lg ring-4 ring-white group-hover:scale-110 transition-transform`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Activity card */}
                  <div className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-[#0F172A]">{activity.title}</p>
                        <p className="text-xs text-[#64748B]">
                          {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        {getStatusBadge(activity.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
