import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Play, Pause, Settings, Activity, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssistantSettings {
  id: string;
  is_enabled: boolean;
  current_mode: 'qa' | 'workflow';
}

interface Responsibility {
  id: string;
  mode: 'qa' | 'workflow';
  name: string;
  description: string;
  is_enabled: boolean;
  status: 'active' | 'inactive' | 'running' | 'completed' | 'failed';
  last_run_at: string | null;
}

interface Log {
  id: string;
  responsibility_name: string;
  action: string;
  status: string;
  details: any;
  created_at: string;
}

const VirtualAssistantDashboard = () => {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime updates
    const logsChannel = supabase
      .channel('assistant-logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'virtual_assistant_logs'
      }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchSettings(), fetchResponsibilities(), fetchLogs()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('virtual_assistant_settings')
      .select('*')
      .single();

    if (error) throw error;
    setSettings(data);
  };

  const fetchResponsibilities = async () => {
    const { data, error } = await supabase
      .from('virtual_assistant_responsibilities')
      .select('*')
      .order('mode', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    setResponsibilities(data || []);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('virtual_assistant_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setLogs(data || []);
  };

  const toggleAssistant = async (enabled: boolean) => {
    const { error } = await supabase
      .from('virtual_assistant_settings')
      .update({ is_enabled: enabled })
      .eq('id', settings?.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update assistant status",
        variant: "destructive"
      });
      return;
    }

    setSettings(prev => prev ? { ...prev, is_enabled: enabled } : null);
    toast({
      title: enabled ? "Assistant Enabled" : "Assistant Disabled",
      description: enabled ? "Virtual assistant is now active" : "Virtual assistant has been paused"
    });
  };

  const switchMode = async (mode: 'qa' | 'workflow') => {
    const { error } = await supabase
      .from('virtual_assistant_settings')
      .update({ current_mode: mode })
      .eq('id', settings?.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to switch mode",
        variant: "destructive"
      });
      return;
    }

    setSettings(prev => prev ? { ...prev, current_mode: mode } : null);
  };

  const toggleResponsibility = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from('virtual_assistant_responsibilities')
      .update({ is_enabled: enabled })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update responsibility",
        variant: "destructive"
      });
      return;
    }

    setResponsibilities(prev =>
      prev.map(r => r.id === id ? { ...r, is_enabled: enabled } : r)
    );
  };

  const runResponsibility = async (resp: Responsibility) => {
    const endpoint = resp.mode === 'qa' ? 'virtual-assistant-qa' : 'virtual-assistant-workflow';
    
    toast({
      title: "Running...",
      description: `Executing ${resp.name}...`
    });

    try {
      const { error } = await supabase.functions.invoke(endpoint, {
        body: {
          responsibilityId: resp.id,
          responsibilityName: resp.name,
          mode: resp.mode
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${resp.name} completed successfully`
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute responsibility",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'completed':
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const qaResponsibilities = responsibilities.filter(r => r.mode === 'qa');
  const workflowResponsibilities = responsibilities.filter(r => r.mode === 'workflow');

  if (loading) {
    return <div className="flex items-center justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Virtual Assistant AI Agent</CardTitle>
                <CardDescription>
                  Automated QA testing and workflow automation for Trust Link Ventures
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={settings?.is_enabled ? "default" : "secondary"}>
                {settings?.is_enabled ? "Active" : "Paused"}
              </Badge>
              <Switch
                checked={settings?.is_enabled || false}
                onCheckedChange={toggleAssistant}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Mode Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={settings?.current_mode === 'qa' ? 'default' : 'outline'}
              onClick={() => switchMode('qa')}
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              QA Mode
            </Button>
            <Button
              variant={settings?.current_mode === 'workflow' ? 'default' : 'outline'}
              onClick={() => switchMode('workflow')}
              className="flex-1"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Workflow Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Responsibilities */}
      <Tabs value={settings?.current_mode || 'qa'} onValueChange={(v) => switchMode(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qa">QA Responsibilities</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Responsibilities</TabsTrigger>
        </TabsList>

        <TabsContent value="qa" className="space-y-4">
          {qaResponsibilities.map((resp) => (
            <Card key={resp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(resp.status)}
                    <div>
                      <CardTitle className="text-base">{resp.description}</CardTitle>
                      <CardDescription className="text-sm">{resp.name}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resp.is_enabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runResponsibility(resp)}
                        disabled={!settings?.is_enabled}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                    )}
                    <Switch
                      checked={resp.is_enabled}
                      onCheckedChange={(checked) => toggleResponsibility(resp.id, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          {workflowResponsibilities.map((resp) => (
            <Card key={resp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(resp.status)}
                    <div>
                      <CardTitle className="text-base">{resp.description}</CardTitle>
                      <CardDescription className="text-sm">{resp.name}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resp.is_enabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runResponsibility(resp)}
                        disabled={!settings?.is_enabled}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                    )}
                    <Switch
                      checked={resp.is_enabled}
                      onCheckedChange={(checked) => toggleResponsibility(resp.id, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions and results from the virtual assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  {getStatusIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{log.responsibility_name}</p>
                    <p className="text-xs text-muted-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={log.status === 'success' ? 'default' : 'secondary'}>
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default VirtualAssistantDashboard;