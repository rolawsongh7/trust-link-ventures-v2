import React from 'react';
import { ActionKPIs } from './ActionKPIs';
import { ExecutiveSummary } from './ExecutiveSummary';
import { EnhancedAIInsights } from './EnhancedAIInsights';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface ExecutiveInsightsTabProps {
  orders: Order[];
  quotes: Quote[];
  customers: Customer[];
}

export const ExecutiveInsightsTab: React.FC<ExecutiveInsightsTabProps> = ({
  orders,
  quotes,
  customers
}) => {
  return (
    <div className="space-y-6">
      {/* Action KPIs - What needs attention */}
      <ActionKPIs orders={orders} customers={customers} />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* AI Insights - Takes 2 columns */}
        <div className="lg:col-span-2">
          <EnhancedAIInsights 
            orders={orders} 
            quotes={quotes} 
            customers={customers} 
          />
        </div>

        {/* Weekly Summary - Takes 1 column */}
        <div className="lg:col-span-1">
          <ExecutiveSummary 
            orders={orders} 
            quotes={quotes} 
            customers={customers} 
          />
        </div>
      </div>
    </div>
  );
};
