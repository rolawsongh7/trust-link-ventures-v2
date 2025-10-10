import React from 'react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

interface OfflineOperation {
  id: string;
  operation: () => Promise<any>;
  timestamp: number;
  retryCount: number;
}

export class ErrorRecovery {
  private static offlineQueue: Map<string, OfflineOperation> = new Map();
  private static isOnline = navigator.onLine;

  static {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Execute an operation with automatic retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      onRetry = () => {},
      shouldRetry = (error) => !error.message?.includes('auth')
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
        
        onRetry(attempt + 1, error);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 30000)));
      }
    }
    
    throw lastError;
  }

  /**
   * Handle network errors with automatic retry and fallback
   */
  static async recoverFromNetworkError<T>(
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T | null> {
    try {
      return await this.withRetry(operation, {
        shouldRetry: (error) => {
          // Retry on network errors
          return error.code === 'PGRST116' || 
                 error.message?.includes('network') ||
                 error.message?.includes('timeout') ||
                 error.message?.includes('fetch');
        },
        onRetry: (attempt, error) => {
          toast({
            title: `Retrying... (${attempt}/3)`,
            description: error.message,
            variant: 'default'
          });
        }
      });
    } catch (error) {
      console.error('Network error recovery failed:', error);
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  /**
   * Queue an operation to be retried when online
   */
  static queueOfflineOperation(
    id: string,
    operation: () => Promise<any>
  ): void {
    if (this.isOnline) {
      // If online, execute immediately
      operation().catch(err => {
        console.error('Failed to execute operation:', err);
        toast({
          title: 'Operation Failed',
          description: err.message,
          variant: 'destructive'
        });
      });
      return;
    }

    this.offlineQueue.set(id, {
      id,
      operation,
      timestamp: Date.now(),
      retryCount: 0
    });

    toast({
      title: 'Operation Queued',
      description: 'Will retry when connection is restored',
      variant: 'default'
    });
  }

  /**
   * Process all queued offline operations
   */
  private static async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.size === 0) return;

    toast({
      title: 'Connection Restored',
      description: `Processing ${this.offlineQueue.size} queued operations...`,
      variant: 'default'
    });

    const operations = Array.from(this.offlineQueue.values());
    
    for (const op of operations) {
      try {
        await this.withRetry(op.operation, {
          maxRetries: 2,
          retryDelay: 500
        });
        this.offlineQueue.delete(op.id);
      } catch (error: any) {
        console.error(`Failed to process queued operation ${op.id}:`, error);
        op.retryCount++;
        
        // Remove after 3 failed retry attempts
        if (op.retryCount >= 3) {
          this.offlineQueue.delete(op.id);
          toast({
            title: 'Operation Failed',
            description: `Could not complete operation: ${error.message}`,
            variant: 'destructive'
          });
        }
      }
    }

    if (this.offlineQueue.size === 0) {
      toast({
        title: 'Sync Complete',
        description: 'All queued operations processed successfully',
        variant: 'default'
      });
    }
  }

  /**
   * Create an error boundary component
   */
  static createErrorBoundary(componentName: string) {
    interface ErrorBoundaryProps {
      children: React.ReactNode;
    }
    
    interface ErrorBoundaryState {
      hasError: boolean;
      error: Error | null;
    }
    
    return class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
      constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
      }

      componentDidCatch(error: any, errorInfo: any) {
        console.error(`Error in ${componentName}:`, error, errorInfo);
        
        // Log to audit trail if needed
        toast({
          title: 'Component Error',
          description: `An error occurred in ${componentName}`,
          variant: 'destructive'
        });
      }

      render() {
        if (this.state.hasError) {
          return React.createElement(
            Card,
            { className: "m-4" },
            React.createElement(
              CardContent,
              { className: "p-6" },
              React.createElement("h2", { className: "text-lg font-semibold mb-2" }, "Something went wrong"),
              React.createElement("p", { className: "text-muted-foreground mb-4" }, 
                `We're sorry, but something unexpected happened in ${componentName}.`
              ),
              this.state.error && React.createElement("p", 
                { className: "text-sm text-muted-foreground mb-4 font-mono bg-muted p-2 rounded" },
                this.state.error.message
              ),
              React.createElement(Button, 
                { onClick: () => this.setState({ hasError: false, error: null }) },
                "Try Again"
              )
            )
          );
        }

        return this.props.children;
      }
    };
  }

  /**
   * Get network status
   */
  static getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get number of queued operations
   */
  static getQueueSize(): number {
    return this.offlineQueue.size;
  }
}
