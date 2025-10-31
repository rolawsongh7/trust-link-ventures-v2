import { supabase } from '@/integrations/supabase/client';

class RealtimeConnectionManager {
  private channels = new Map<string, any>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

  getOrCreateChannel(channelName: string, config?: any) {
    if (this.channels.has(channelName)) {
      console.log(`♻️ Reusing existing channel: ${channelName}`);
      return this.channels.get(channelName);
    }

    console.log(`🆕 Creating new channel: ${channelName}`);
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: 'unique-user-id' },
        broadcast: { ack: true, self: true },
        ...config,
      },
    });

    this.channels.set(channelName, channel);
    this.startHeartbeat(channelName, channel);
    return channel;
  }

  private startHeartbeat(channelName: string, channel: any) {
    // Monitor connection health every 30 seconds
    const interval = setInterval(() => {
      if (channel.state === 'joined') {
        channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() },
        });
      }
    }, 30000);

    this.heartbeatIntervals.set(channelName, interval);
  }

  removeChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`🗑️ Removing channel: ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }

    const interval = this.heartbeatIntervals.get(channelName);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(channelName);
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up all realtime connections');
    this.channels.forEach((channel) => supabase.removeChannel(channel));
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.channels.clear();
    this.heartbeatIntervals.clear();
  }

  getActiveChannels() {
    return Array.from(this.channels.keys());
  }

  getConnectionStats() {
    return {
      totalChannels: this.channels.size,
      activeChannels: Array.from(this.channels.values()).filter(
        (ch) => ch.state === 'joined'
      ).length,
      channels: this.getActiveChannels(),
    };
  }
}

export const realtimeManager = new RealtimeConnectionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.cleanup();
  });

  // Reconnect when browser comes back online
  window.addEventListener('online', () => {
    console.log('🌐 Browser back online, realtime will reconnect automatically');
  });
}
