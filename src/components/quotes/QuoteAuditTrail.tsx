import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Mail, CheckCircle, XCircle, Eye, Edit, Clock, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AuditEvent {
  id: string;
  event_type: string;
  action: string;
  created_at: string;
  user_id?: string;
  event_data: any;
  severity: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface QuoteAuditTrailProps {
  quoteId: string;
  quoteNumber: string;
}

const QuoteAuditTrail: React.FC<QuoteAuditTrailProps> = ({ quoteId, quoteNumber }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditTrail();
  }, [quoteId]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately for those with user_ids
      const userIds = [...new Set(data?.filter(d => d.user_id).map(d => d.user_id))] as string[];
      let profilesMap: { [key: string]: any } = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        profilesData?.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
      }

      // Attach profiles to events
      const eventsWithProfiles = (data || []).map(event => ({
        ...event,
        profiles: event.user_id ? profilesMap[event.user_id] : undefined
      }));

      setEvents(eventsWithProfiles as AuditEvent[]);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'quote_created':
      case 'data_create':
        return <FileText className="h-4 w-4" />;
      case 'quote_status_changed':
      case 'quote_converted_to_order':
        return <CheckCircle className="h-4 w-4" />;
      case 'quote_sent':
      case 'quote_email_sent':
        return <Mail className="h-4 w-4" />;
      case 'quote_viewed':
      case 'quote_view_token_generated':
        return <Eye className="h-4 w-4" />;
      case 'quote_updated':
      case 'data_update':
        return <Edit className="h-4 w-4" />;
      case 'quote_rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-500 bg-red-50 dark:bg-red-950';
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'low':
      default:
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950';
    }
  };

  const getEventTitle = (event: AuditEvent) => {
    const { event_type, action, event_data } = event;
    
    if (event_type === 'quote_converted_to_order') {
      return `Quote converted to Order #${event_data?.order_number || ''}`;
    }
    if (event_type === 'quote_status_changed') {
      return `Status changed to ${event_data?.new_status || event_data?.status}`;
    }
    if (event_type === 'quote_sent' || event_type === 'quote_email_sent') {
      return `Quote sent to ${event_data?.customer_email || 'customer'}`;
    }
    if (event_type === 'quote_viewed') {
      return 'Quote viewed by customer';
    }
    if (event_type === 'quote_view_token_generated') {
      return 'View-only link generated';
    }
    if (event_type === 'quote_created' || event_type === 'data_create') {
      return 'Quote created';
    }
    if (event_type === 'quote_updated' || event_type === 'data_update') {
      return 'Quote updated';
    }
    
    return `${event_type} - ${action}`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Event', 'User', 'Severity', 'Details'];
    const rows = events.map(event => [
      format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getEventTitle(event),
      event.profiles?.full_name || event.profiles?.email || 'System',
      event.severity,
      JSON.stringify(event.event_data)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${quoteNumber}-audit-trail.csv`;
    a.click();
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.event_type.includes(filter);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audit Trail</CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="status">Status Changes</SelectItem>
                <SelectItem value="email">Email Events</SelectItem>
                <SelectItem value="view">View Events</SelectItem>
                <SelectItem value="converted">Conversions</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No audit events found</p>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <div key={event.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex gap-4">
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    getEventColor(event.severity)
                  )}>
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{getEventTitle(event)}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.profiles?.full_name || event.profiles?.email || 'System'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">
                          View details
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteAuditTrail;