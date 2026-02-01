/**
 * Phase 5.1: Trust History Panel
 * 
 * Displays a timeline of trust tier changes for a customer.
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { useCustomerTrustHistory } from '@/hooks/useCustomerTrust';
import { TrustBadge } from './TrustBadge';
import type { TrustTier } from '@/utils/trustHelpers';

interface TrustHistoryPanelProps {
  customerId: string;
  maxHeight?: string;
}

export const TrustHistoryPanel: React.FC<TrustHistoryPanelProps> = ({
  customerId,
  maxHeight = '300px'
}) => {
  const { data: history, isLoading } = useCustomerTrustHistory(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Trust History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Trust History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No trust history yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Trust History
          <Badge variant="secondary" className="ml-auto">
            {history.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="px-4 pb-4 space-y-3">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className="relative pl-6 pb-3 border-l-2 border-muted last:border-transparent"
              >
                {/* Timeline dot */}
                <div className={`absolute left-[-5px] top-1 w-2 h-2 rounded-full ${
                  entry.is_manual_override 
                    ? 'bg-amber-500' 
                    : 'bg-primary'
                }`} />

                <div className="space-y-1">
                  {/* Tier change */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.previous_tier ? (
                      <>
                        <TrustBadge 
                          tier={entry.previous_tier as TrustTier} 
                          variant="compact" 
                          showTooltip={false} 
                        />
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    ) : null}
                    <TrustBadge 
                      tier={entry.new_tier as TrustTier} 
                      variant="compact" 
                      showTooltip={false} 
                    />
                    {entry.is_manual_override && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="h-3 w-3" />
                        Override
                      </Badge>
                    )}
                    {!entry.is_manual_override && entry.previous_tier && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Auto
                      </Badge>
                    )}
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-muted-foreground">
                    {entry.change_reason}
                  </p>

                  {/* Score change */}
                  {entry.previous_score !== null && (
                    <p className="text-xs text-muted-foreground">
                      Score: {entry.previous_score} → {entry.new_score}
                    </p>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TrustHistoryPanel;
