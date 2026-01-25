import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet, MapPin, Clock, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: string;
  device_type: string;
  browser: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

interface ActiveSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActiveSessionsDialog: React.FC<ActiveSessionsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useCustomerAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchSessions();
    }
  }, [open, user]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Fetch recent login events from audit_logs
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .in('event_type', ['successful_login', 'failed_login'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Group by IP and user agent to show unique login sessions
      const sessionMap = new Map<string, Session>();
      
      data?.forEach((log, index) => {
        const key = `${log.ip_address}-${log.user_agent}`;
        if (!sessionMap.has(key) && log.event_type === 'successful_login') {
          sessionMap.set(key, {
            id: log.id,
            device_type: detectDeviceType(log.user_agent || ''),
            browser: detectBrowser(log.user_agent || ''),
            ip_address: String(log.ip_address || 'Unknown'),
            location: 'Unknown',
            last_active: log.created_at,
            is_current: index === 0,
          });
        }
      });

      setSessions(Array.from(sessionMap.values()));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load login history',
      });
    } finally {
      setLoading(false);
    }
  };

  const detectDeviceType = (userAgent: string): string => {
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  };

  const detectBrowser = (userAgent: string): string => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    toast({
      title: 'Session Management',
      description: 'Session revocation will be available soon. Please sign out to end all sessions.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Recent Login History</DialogTitle>
          <DialogDescription>
            View your recent successful login attempts across different devices
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent login activity found
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-maritime-500/10 text-maritime-600">
                      {getDeviceIcon(session.device_type)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {session.browser} on {session.device_type}
                        </h4>
                        {session.is_current && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{session.ip_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Last active{' '}
                            {formatDistanceToNow(new Date(session.last_active), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        </div>

        <div className="flex-shrink-0 flex justify-between items-center mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {sessions.length} recent login{sessions.length !== 1 ? 's' : ''}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
