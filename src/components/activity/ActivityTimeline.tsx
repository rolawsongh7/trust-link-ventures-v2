import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ShoppingCart, Users, TrendingUp, Mail, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  user_id?: string;
}

export const ActivityTimeline: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (eventType: string) => {
    if (eventType.includes('order')) return ShoppingCart;
    if (eventType.includes('quote')) return FileText;
    if (eventType.includes('customer')) return Users;
    if (eventType.includes('lead')) return TrendingUp;
    if (eventType.includes('email')) return Mail;
    return Clock;
  };

  const getActivityColor = (eventType: string) => {
    if (eventType.includes('create') || eventType.includes('insert')) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (eventType.includes('update') || eventType.includes('edit')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (eventType.includes('delete') || eventType.includes('remove')) return 'bg-red-500/10 text-red-600 border-red-500/20';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
        <CardDescription>Recent actions across all entities</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activities yet</div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.event_type);
                return (
                  <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getActivityColor(activity.event_type)}>
                          {formatEventType(activity.event_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {activity.event_data && (
                        <div className="text-sm text-muted-foreground">
                          {activity.event_data.order_number && (
                            <span>Order: {activity.event_data.order_number}</span>
                          )}
                          {activity.event_data.quote_number && (
                            <span>Quote: {activity.event_data.quote_number}</span>
                          )}
                          {activity.event_data.action && (
                            <span className="ml-2">- {activity.event_data.action}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
