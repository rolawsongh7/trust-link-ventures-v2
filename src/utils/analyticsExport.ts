import Papa from 'papaparse';
import type { Order } from '@/hooks/useOrdersQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
}

export interface CustomerHealthData {
  customerId: string;
  customerName: string;
  health: 'green' | 'yellow' | 'red';
  score: number;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  daysSinceLastOrder: number;
  paymentBehavior: string;
  orderTrend: string;
  explanation: string;
}

export interface InsightData {
  type: string;
  title: string;
  summary: string;
  why_it_matters?: string;
  estimated_financial_impact?: {
    amount: number;
    currency: string;
    confidence: string;
  };
  recommended_action: string;
  urgency: string;
  confidence_score?: number;
}

export interface MetricsSummary {
  cashAtRisk: number;
  ordersAtRisk: number;
  healthyCustomers: number;
  atRiskCustomers: number;
  criticalCustomers: number;
  totalRevenue: number;
  avgOrderValue: number;
}

// Generic CSV export
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: ExportColumn[]
): void {
  const formattedData = data.map(row => {
    const formatted: Record<string, any> = {};
    columns.forEach(col => {
      const value = row[col.key];
      formatted[col.label] = col.formatter ? col.formatter(value) : value;
    });
    return formatted;
  });

  const csv = Papa.unparse(formattedData);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// Customer health export
export function exportCustomerHealthReport(customers: CustomerHealthData[]): void {
  const columns: ExportColumn[] = [
    { key: 'customerName', label: 'Customer Name' },
    { key: 'health', label: 'Health Status' },
    { key: 'score', label: 'Health Score' },
    { key: 'totalRevenue', label: 'Total Revenue (GHS)', formatter: (v) => formatCurrency(v) },
    { key: 'orderCount', label: 'Order Count' },
    { key: 'avgOrderValue', label: 'Avg Order Value (GHS)', formatter: (v) => formatCurrency(v) },
    { key: 'daysSinceLastOrder', label: 'Days Since Last Order' },
    { key: 'paymentBehavior', label: 'Payment Behavior' },
    { key: 'orderTrend', label: 'Order Trend' },
    { key: 'explanation', label: 'Notes' }
  ];

  exportToCSV(customers, `customer_health_${getDateStamp()}`, columns);
}

// At-risk orders export
export function exportAtRiskOrders(orders: Order[]): void {
  const columns: ExportColumn[] = [
    { key: 'order_number', label: 'Order Number' },
    { key: 'status', label: 'Status', formatter: (v) => formatStatus(v) },
    { key: 'total_amount', label: 'Amount (GHS)', formatter: (v) => formatCurrency(v) },
    { key: 'created_at', label: 'Created Date', formatter: (v) => formatDate(v) },
    { key: 'estimated_delivery_date', label: 'Est. Delivery', formatter: (v) => formatDate(v) },
    { key: 'payment_verified_at', label: 'Payment Verified', formatter: (v) => v ? 'Yes' : 'No' }
  ];

  exportToCSV(orders, `at_risk_orders_${getDateStamp()}`, columns);
}

// Operations report export
export function exportOperationsReport(orders: Order[]): void {
  const columns: ExportColumn[] = [
    { key: 'order_number', label: 'Order Number' },
    { key: 'status', label: 'Current Status', formatter: (v) => formatStatus(v) },
    { key: 'total_amount', label: 'Amount (GHS)', formatter: (v) => formatCurrency(v) },
    { key: 'created_at', label: 'Created', formatter: (v) => formatDate(v) },
    { key: 'payment_verified_at', label: 'Payment Verified', formatter: (v) => formatDate(v) },
    { key: 'processing_started_at', label: 'Processing Started', formatter: (v) => formatDate(v) },
    { key: 'ready_to_ship_at', label: 'Ready to Ship', formatter: (v) => formatDate(v) },
    { key: 'shipped_at', label: 'Shipped', formatter: (v) => formatDate(v) },
    { key: 'delivered_at', label: 'Delivered', formatter: (v) => formatDate(v) },
    { key: 'failed_delivery_count', label: 'Failed Deliveries' }
  ];

  exportToCSV(orders, `operations_report_${getDateStamp()}`, columns);
}

// Generate executive summary for print/PDF
export function generateExecutiveSummaryHTML(
  metrics: MetricsSummary,
  insights: InsightData[],
  dateRange: { start: Date; end: Date }
): string {
  const topInsights = insights.slice(0, 5);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Executive Analytics Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
    }
    .header {
      border-bottom: 2px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px;
      color: #0066cc;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 18px;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .insight-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
    }
    .insight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .insight-type {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .insight-type.risk { background: #fee; color: #c00; }
    .insight-type.opportunity { background: #efe; color: #080; }
    .insight-type.optimization { background: #eef; color: #008; }
    .insight-type.prediction { background: #fef; color: #808; }
    .insight-urgency {
      font-size: 11px;
      color: #666;
    }
    .insight-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .insight-summary {
      font-size: 14px;
      color: #444;
      margin-bottom: 10px;
    }
    .insight-action {
      font-size: 13px;
      color: #0066cc;
      font-weight: 500;
    }
    .insight-impact {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .insight-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Executive Analytics Report</h1>
    <div class="subtitle">
      Generated: ${new Date().toLocaleDateString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}<br>
      Period: ${formatDate(dateRange.start.toISOString())} — ${formatDate(dateRange.end.toISOString())}
    </div>
  </div>

  <div class="section">
    <h2>1. Key Metrics Summary</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">GHS ${formatCurrency(metrics.cashAtRisk)}</div>
        <div class="metric-label">Cash at Risk</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.ordersAtRisk}</div>
        <div class="metric-label">Orders at Risk</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">GHS ${formatCurrency(metrics.totalRevenue)}</div>
        <div class="metric-label">Total Revenue</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.healthyCustomers}</div>
        <div class="metric-label">Healthy Customers</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.atRiskCustomers}</div>
        <div class="metric-label">At Risk Customers</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">GHS ${formatCurrency(metrics.avgOrderValue)}</div>
        <div class="metric-label">Avg Order Value</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>2. AI Insights (Top ${topInsights.length})</h2>
    ${topInsights.map((insight, idx) => `
      <div class="insight-card">
        <div class="insight-header">
          <span class="insight-type ${insight.type}">${insight.type}</span>
          <span class="insight-urgency">Urgency: ${insight.urgency}</span>
        </div>
        <div class="insight-title">${insight.title}</div>
        <div class="insight-summary">${insight.summary}</div>
        <div class="insight-action">→ ${insight.recommended_action}</div>
        ${insight.estimated_financial_impact ? `
          <div class="insight-impact">
            Estimated Impact: ${insight.estimated_financial_impact.currency} ${formatCurrency(insight.estimated_financial_impact.amount)}
            (${insight.estimated_financial_impact.confidence} confidence)
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>3. Recommended Actions (Prioritized)</h2>
    <ol>
      ${topInsights
        .filter(i => i.urgency === 'immediate' || i.urgency === 'soon')
        .slice(0, 5)
        .map(i => `
          <li style="margin-bottom: 10px;">
            <strong>${i.recommended_action}</strong>
            ${i.estimated_financial_impact ? 
              ` — Expected Impact: ${i.estimated_financial_impact.currency} ${formatCurrency(i.estimated_financial_impact.amount)}` 
              : ''}
          </li>
        `).join('')}
    </ol>
  </div>

  <div class="footer">
    Report generated automatically by Analytics Intelligence System
  </div>
</body>
</html>
  `.trim();
}

// Open print dialog for PDF
export function printExecutiveSummary(
  metrics: MetricsSummary,
  insights: InsightData[],
  dateRange: { start: Date; end: Date }
): void {
  const html = generateExecutiveSummaryHTML(metrics, insights, dateRange);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Delay print to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

// AI Insights export (for PDF)
export function exportAIInsightsReport(insights: InsightData[]): void {
  const dateRange = {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date()
  };
  
  const metrics: MetricsSummary = {
    cashAtRisk: 0,
    ordersAtRisk: 0,
    healthyCustomers: 0,
    atRiskCustomers: 0,
    criticalCustomers: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  };
  
  printExecutiveSummary(metrics, insights, dateRange);
}

// Helpers
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(2);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getDateStamp(): string {
  return new Date().toISOString().split('T')[0];
}
