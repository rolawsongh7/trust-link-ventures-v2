import { supabase } from '@/integrations/supabase/client';

const SESSION_TIMEOUT_MINUTES = 10; // 10 minutes of inactivity
const SESSION_CHECK_INTERVAL = 60000; // Check every minute

export class SessionManager {
  private lastActivity: number = Date.now();
  private checkInterval: NodeJS.Timeout | null = null;
  private timeoutCallback: (() => void) | null = null;

  constructor(onTimeout?: () => void) {
    this.timeoutCallback = onTimeout || null;
    this.startMonitoring();
    this.setupActivityListeners();
  }

  private setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });
  }

  private updateActivity() {
    this.lastActivity = Date.now();
  }

  private startMonitoring() {
    this.checkInterval = setInterval(() => {
      this.checkTimeout();
    }, SESSION_CHECK_INTERVAL);
  }

  private async checkTimeout() {
    const now = Date.now();
    const inactiveTime = now - this.lastActivity;
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (inactiveTime >= timeoutMs) {
      console.log('[SessionManager] Session timeout detected');
      await this.handleTimeout();
    }
  }

  private async handleTimeout() {
    try {
      console.log('[SessionManager] Starting timeout handling');
      
      // Log the timeout event
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          event_type: 'session_timeout',
          action: 'logout',
          resource_type: 'session',
          severity: 'low',
          event_data: {
            reason: 'Automatic logout due to inactivity',
            inactive_duration_minutes: SESSION_TIMEOUT_MINUTES
          }
        });
      }

      // Sign out the user and WAIT for completion
      console.log('[SessionManager] Signing out user');
      await supabase.auth.signOut();
      console.log('[SessionManager] Sign out complete');

      // Wait a moment to ensure auth state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));

      // Call the timeout callback if provided (after signout completes)
      if (this.timeoutCallback) {
        console.log('[SessionManager] Calling timeout callback');
        this.timeoutCallback();
      }
    } catch (error) {
      console.error('[SessionManager] Error handling timeout:', error);
    }
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public resetTimer() {
    this.updateActivity();
  }

  public getInactiveTime(): number {
    return Date.now() - this.lastActivity;
  }

  public getRemainingTime(): number {
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;
    const inactiveTime = this.getInactiveTime();
    return Math.max(0, timeoutMs - inactiveTime);
  }
}

// Singleton instance for admin sessions
let adminSessionManager: SessionManager | null = null;

export const initializeAdminSessionManager = (onTimeout?: () => void): SessionManager => {
  if (!adminSessionManager) {
    adminSessionManager = new SessionManager(onTimeout);
  }
  return adminSessionManager;
};

export const destroyAdminSessionManager = () => {
  if (adminSessionManager) {
    adminSessionManager.destroy();
    adminSessionManager = null;
  }
};

export const getAdminSessionManager = (): SessionManager | null => {
  return adminSessionManager;
};
