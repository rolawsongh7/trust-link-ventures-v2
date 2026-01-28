import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Mail, 
  Clock, 
  Search,
  Filter,
  AlertTriangle,
  Activity,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  user_id?: string;
  severity?: string;
}

interface AnomalyAlert {
  type: string;
  message: string;
  count: number;
  percentage: number;
}

export const EnhancedAuditTimeline: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, searchQuery, filterType]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
      detectAnomalies(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.event_type.toLowerCase().includes(query) ||
        JSON.stringify(a.event_data).toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.event_type.includes(filterType));
    }

    setFilteredActivities(filtered);
  };

  const detectAnomalies = (data: Activity[]) => {
    const alerts: AnomalyAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayActivities = data.filter(a => 
      new Date(a.created_at) >= today
    );

    // Check for unusual activity spikes
    const typeCount: Record<string, number> = {};
    todayActivities.forEach(a => {
      const baseType = a.event_type.split('_')[0];
      typeCount[baseType] = (typeCount[baseType] || 0) + 1;
    });

    // Detect spikes (more than 10 of same type today)
    Object.entries(typeCount).forEach(([type, count]) => {
      if (count > 10) {
        alerts.push({
          type: type,
          message: `Unusual spike in ${type} activities today`,
          count: count,
          percentage: Math.round((count / todayActivities.length) * 100)
        });
      }
    });

    // Check for high severity events
    const highSeverity = data.filter(a => a.severity === 'high' || a.severity === 'critical');
    if (highSeverity.length > 0) {
      const recentHighSeverity = highSeverity.filter(a => 
        new Date(a.created_at) >= today
      );
      if (recentHighSeverity.length > 0) {
        alerts.push({
          type: 'security',
          message: `${recentHighSeverity.length} high-severity events today`,
          count: recentHighSeverity.length,
          percentage: 0
        });
      }
    }

    setAnomalies(alerts);
  };

  const getActivityIcon = (eventType: string) => {
    if (eventType.includes('order')) return ShoppingCart;
    if (eventType.includes('quote')) return FileText;
    if (eventType.includes('customer')) return Users;
    if (eventType.includes('lead')) return TrendingUp;
    if (eventType.includes('email')) return Mail;
    return Clock;
  };

  const getActivityColor = (eventType: string, severity?: string) => {
    if (severity === 'high' || severity === 'critical') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-300';
    }
    if (eventType.includes('create') || eventType.includes('insert')) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-300';
    }
    if (eventType.includes('update') || eventType.includes('edit')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300';
    }
    if (eventType.includes('delete') || eventType.includes('remove')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-300';
    }
    return 'bg-muted text-muted-foreground border-muted';
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'order', label: 'Orders' },
    { value: 'quote', label: 'Quotes' },
    { value: 'customer', label: 'Customers' },
    { value: 'lead', label: 'Leads' },
    { value: 'payment', label: 'Payments' },
    { value: 'delivery', label: 'Deliveries' }
  ];

  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    
    filteredActivities.forEach(activity => {
      const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  return (
    <div className="space-y-6">
      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Activity Anomalies Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {anomalies.map((anomaly, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-amber-200 dark:border-amber-800"
                >
                  <Activity className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">{anomaly.message}</span>
                  {anomaly.percentage > 0 && (
                    <Badge variant="secondary">+{anomaly.percentage}%</Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Timeline Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                {filteredActivities.length} events · Showing recent activity
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchActivities}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin" />
                <p className="text-sm">Loading activities...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No activities found</p>
                {searchQuery && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      {/* Date Header */}
                      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
                        <Badge variant="outline" className="text-xs font-medium">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                          <span className="ml-2 text-muted-foreground">
                            ({dayActivities.length} events)
                          </span>
                        </Badge>
                      </div>

                      {/* Day's Activities */}
                      {dayActivities.map((activity, index) => {
                        const Icon = getActivityIcon(activity.event_type);
                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="flex gap-4 pb-3 border-b border-border/50 last:border-0"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge 
                                  className={cn(
                                    'text-xs',
                                    getActivityColor(activity.event_type, activity.severity)
                                  )}
                                >
                                  {formatEventType(activity.event_type)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(activity.created_at), 'h:mm a')}
                                </span>
                              </div>
                              {activity.event_data && (
                                <div className="text-sm text-muted-foreground">
                                  {activity.event_data.order_number && (
                                    <span className="font-medium text-foreground">
                                      Order: {activity.event_data.order_number}
                                    </span>
                                  )}
                                  {activity.event_data.quote_number && (
                                    <span className="font-medium text-foreground">
                                      Quote: {activity.event_data.quote_number}
                                    </span>
                                  )}
                                  {activity.event_data.action && (
                                    <span className="ml-2">— {activity.event_data.action}</span>
                                  )}
                                  {activity.event_data.customer_name && (
                                    <span className="ml-2">
                                      ({activity.event_data.customer_name})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
