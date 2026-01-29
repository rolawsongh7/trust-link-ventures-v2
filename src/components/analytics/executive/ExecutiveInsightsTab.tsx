import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ActionKPIs } from './ActionKPIs';
import { ExecutiveSummary } from './ExecutiveSummary';
import { EnhancedAIInsights } from './EnhancedAIInsights';
import { ExportDialog, type ExportOption } from '@/components/analytics/ExportDialog';
import { 
  printExecutiveSummary,
  exportAtRiskOrders,
  exportAIInsightsReport,
  type MetricsSummary,
  type InsightData
} from '@/utils/analyticsExport';
import { useToast } from '@/hooks/use-toast';
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleExport = async (options: ExportOption[]) => {
    try {
      // Calculate metrics for exports
      const pendingOrders = orders.filter(o => o.status === 'pending_payment');
      const cashAtRisk = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const ordersAtRisk = orders.filter(o => {
        if (o.status === 'delivered' || o.status === 'cancelled') return false;
        if (!o.estimated_delivery_date) return false;
        const eta = new Date(o.estimated_delivery_date);
        const daysUntilDue = (eta.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilDue < 2 || daysUntilDue < 0;
      });

      const metrics: MetricsSummary = {
        cashAtRisk,
        ordersAtRisk: ordersAtRisk.length,
        healthyCustomers: customers.length, // Simplified
        atRiskCustomers: 0,
        criticalCustomers: 0,
        totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        avgOrderValue: orders.length > 0 
          ? orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / orders.length 
          : 0
      };

      const dateRange = {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      // Process each export option
      for (const option of options) {
        switch (option) {
          case 'executive_summary':
            const insights: InsightData[] = [];
            if (cashAtRisk > 0) {
              insights.push({
                type: 'risk',
                title: 'Outstanding Payments',
                summary: `${pendingOrders.length} orders awaiting payment`,
                recommended_action: 'Review and send payment reminders',
                urgency: 'soon',
                estimated_financial_impact: { amount: cashAtRisk, currency: 'GHS', confidence: 'high' }
              });
            }
            printExecutiveSummary(metrics, insights, dateRange);
            break;
          
          case 'at_risk_orders':
            if (ordersAtRisk.length > 0) {
              exportAtRiskOrders(ordersAtRisk);
            } else {
              toast({ title: "No at-risk orders", description: "All orders are on track" });
            }
            break;
          
          case 'ai_insights':
            // Generate AI insights export from current order data
            const aiExportInsights: InsightData[] = [];
            
            if (cashAtRisk > 0) {
              aiExportInsights.push({
                type: 'risk',
                title: 'Outstanding Payments',
                summary: `${pendingOrders.length} orders worth GHS ${(cashAtRisk/1000).toFixed(0)}K are awaiting payment.`,
                recommended_action: 'Review pending orders and send payment reminders',
                urgency: pendingOrders.length > 5 ? 'immediate' : 'soon'
              });
            }
            
            if (ordersAtRisk.length > 0) {
              aiExportInsights.push({
                type: 'risk',
                title: 'Orders at Delivery Risk',
                summary: `${ordersAtRisk.length} orders may miss their SLA.`,
                recommended_action: 'Review operations and expedite processing',
                urgency: 'immediate'
              });
            }
            
            if (aiExportInsights.length > 0) {
              exportAIInsightsReport(aiExportInsights);
            } else {
              toast({ title: "No insights to export", description: "Business metrics are healthy" });
            }
            break;
        }
      }

      toast({
        title: "Export Complete",
        description: `Exported ${options.length} report(s)`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your export",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setExportDialogOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

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

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        availableOptions={['executive_summary', 'at_risk_orders', 'ai_insights']}
        title="Export Executive Insights"
        description="Download key metrics and AI recommendations"
      />
    </div>
  );
};
