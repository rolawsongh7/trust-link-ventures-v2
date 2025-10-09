import { supabase } from '@/integrations/supabase/client';

interface ErrorLog {
  component: string;
  action: string;
  error: Error;
  context?: Record<string, any>;
  userId?: string;
}

export const logError = async ({ component, action, error, context, userId }: ErrorLog) => {
  try {
    const errorData = {
      component,
      action,
      error_message: error.message,
      error_stack: error.stack,
      context: context || {},
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      page_url: window.location.href,
    };

    console.error(`[${component}] ${action} failed:`, errorData);

    // Log to Supabase audit_logs
    await supabase.from('audit_logs').insert({
      user_id: userId || null,
      event_type: 'client_error',
      action: `${component}_${action}`,
      resource_type: 'error',
      event_data: errorData,
      severity: 'medium',
    });

    // Log to console for development
    if (import.meta.env.DEV) {
      console.group(`🚨 Error in ${component}`);
      console.error('Action:', action);
      console.error('Error:', error);
      console.error('Context:', context);
      console.groupEnd();
    }
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
  }
};

export const createErrorBoundary = (componentName: string) => {
  return async (error: Error, context?: Record<string, any>) => {
    await logError({
      component: componentName,
      action: 'error_boundary_caught',
      error,
      context,
    });
  };
};