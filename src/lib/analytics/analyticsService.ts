import type { Order } from '@/hooks/useOrdersQuery';
import type { Quote } from '@/hooks/useQuotesQuery';
import type { Customer } from '@/hooks/useCustomersQuery';

interface TimeSeriesData {
  date: string;
  value: number;
}

interface CustomerMetrics {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  daysSinceLastOrder: number;
  lifetimeValue: number;
  churnRisk: 'low' | 'medium' | 'high';
}

interface CohortData {
  cohort: string;
  customers: number;
  retention: number[];
}

export class AnalyticsService {
  /**
   * Calculate revenue time series with daily granularity
   */
  static calculateRevenueTimeSeries(orders: Order[], days: number = 30): TimeSeriesData[] {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const revenueByDate: Record<string, number> = {};
    
    orders.forEach(order => {
      if (order.created_at && order.status === 'delivered') {
        const orderDate = new Date(order.created_at);
        if (orderDate >= startDate) {
          const dateKey = orderDate.toISOString().split('T')[0];
          revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + (order.total_amount || 0);
        }
      }
    });

    // Fill in missing dates with 0
    const result: TimeSeriesData[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        value: revenueByDate[dateKey] || 0
      });
    }

    return result;
  }

  /**
   * Generate sparkline data for the last 7 days
   */
  static generateSparklineData(orders: Order[]): number[] {
    const last7Days = this.calculateRevenueTimeSeries(orders, 7);
    return last7Days.map(d => d.value);
  }

  /**
   * Calculate customer metrics including churn risk
   */
  static calculateCustomerMetrics(
    orders: Order[], 
    customers: Customer[]
  ): CustomerMetrics[] {
    const now = new Date();
    
    return customers.map(customer => {
      const customerOrders = orders.filter(o => o.customer_id === customer.id);
      const totalRevenue = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const orderCount = customerOrders.length;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
      
      // Calculate days since last order
      let daysSinceLastOrder = Infinity;
      if (customerOrders.length > 0) {
        const sortedOrders = customerOrders.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        const lastOrderDate = new Date(sortedOrders[0].created_at || 0);
        daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Simple churn risk calculation
      let churnRisk: 'low' | 'medium' | 'high' = 'low';
      if (daysSinceLastOrder > 90) {
        churnRisk = 'high';
      } else if (daysSinceLastOrder > 60) {
        churnRisk = 'medium';
      }

      // Estimate lifetime value (simple: current total * 1.5 for future value)
      const lifetimeValue = totalRevenue * 1.5;

      return {
        customerId: customer.id,
        customerName: customer.company_name,
        totalRevenue,
        orderCount,
        avgOrderValue,
        daysSinceLastOrder,
        lifetimeValue,
        churnRisk
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Calculate cohort retention analysis
   */
  static calculateCohortAnalysis(customers: Customer[], orders: Order[]): CohortData[] {
    const cohorts: Record<string, { customers: Set<string>; ordersByMonth: Record<number, Set<string>> }> = {};

    // Group customers by signup month (cohort)
    customers.forEach(customer => {
      if (customer.created_at) {
        const cohortMonth = new Date(customer.created_at).toISOString().substring(0, 7); // YYYY-MM
        if (!cohorts[cohortMonth]) {
          cohorts[cohortMonth] = {
            customers: new Set(),
            ordersByMonth: {}
          };
        }
        cohorts[cohortMonth].customers.add(customer.id);
      }
    });

    // Track orders by month relative to cohort
    orders.forEach(order => {
      if (order.customer_id && order.created_at) {
        const customer = customers.find(c => c.id === order.customer_id);
        if (customer?.created_at) {
          const cohortMonth = new Date(customer.created_at).toISOString().substring(0, 7);
          const orderMonth = new Date(order.created_at);
          const customerMonth = new Date(customer.created_at);
          
          // Calculate months since joining
          const monthsSinceJoining = 
            (orderMonth.getFullYear() - customerMonth.getFullYear()) * 12 +
            (orderMonth.getMonth() - customerMonth.getMonth());

          if (cohorts[cohortMonth]) {
            if (!cohorts[cohortMonth].ordersByMonth[monthsSinceJoining]) {
              cohorts[cohortMonth].ordersByMonth[monthsSinceJoining] = new Set();
            }
            cohorts[cohortMonth].ordersByMonth[monthsSinceJoining].add(order.customer_id);
          }
        }
      }
    });

    // Calculate retention percentages
    return Object.entries(cohorts)
      .map(([cohort, data]) => {
        const totalCustomers = data.customers.size;
        const retention: number[] = [];
        
        // Calculate retention for up to 12 months
        for (let month = 0; month < 12; month++) {
          const activeCustomers = data.ordersByMonth[month]?.size || 0;
          const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
          retention.push(Math.round(retentionRate));
        }

        return {
          cohort,
          customers: totalCustomers,
          retention
        };
      })
      .sort((a, b) => a.cohort.localeCompare(b.cohort));
  }

  /**
   * Calculate profit margin by category
   */
  static calculateProfitByCategory(orders: Order[]): { category: string; revenue: number; margin: number }[] {
    // Simplified: In real scenario, you'd have cost data
    const categoryRevenue: Record<string, number> = {};
    
    orders.forEach(order => {
      if (order.status === 'delivered') {
        // Assuming we'd extract category from order items
        const category = 'Seafood'; // Placeholder
        categoryRevenue[category] = (categoryRevenue[category] || 0) + (order.total_amount || 0);
      }
    });

    return Object.entries(categoryRevenue).map(([category, revenue]) => ({
      category,
      revenue,
      margin: Math.random() * 40 + 20 // Placeholder: 20-60% margin
    }));
  }

  /**
   * Detect anomalies in revenue patterns
   */
  static detectAnomalies(timeSeries: TimeSeriesData[]): { date: string; value: number; isAnomaly: boolean }[] {
    if (timeSeries.length < 7) return timeSeries.map(d => ({ ...d, isAnomaly: false }));

    // Calculate rolling average and standard deviation
    const values = timeSeries.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    // Mark points beyond 2 standard deviations as anomalies
    return timeSeries.map(d => ({
      ...d,
      isAnomaly: Math.abs(d.value - mean) > 2 * stdDev
    }));
  }

  /**
   * Calculate conversion funnel metrics
   */
  static calculateConversionFunnel(quotes: Quote[], orders: Order[]): {
    stage: string;
    count: number;
    conversion: number;
  }[] {
    const totalQuotes = quotes.length;
    const sentQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'accepted').length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    return [
      { stage: 'Quotes Created', count: totalQuotes, conversion: 100 },
      { stage: 'Quotes Sent', count: sentQuotes, conversion: totalQuotes > 0 ? (sentQuotes / totalQuotes) * 100 : 0 },
      { stage: 'Quotes Accepted', count: acceptedQuotes, conversion: sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0 },
      { stage: 'Orders Created', count: totalOrders, conversion: acceptedQuotes > 0 ? (totalOrders / acceptedQuotes) * 100 : 0 },
      { stage: 'Orders Delivered', count: deliveredOrders, conversion: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0 }
    ];
  }
}
