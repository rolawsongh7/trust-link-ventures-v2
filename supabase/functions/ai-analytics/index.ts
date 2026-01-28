import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced system prompt with strict rules for prescriptive insights
const SYSTEM_PROMPT = `You are an expert business intelligence analyst specializing in B2B food distribution analytics for cold-chain operators.

CRITICAL RULES:
1. NO GENERIC ADVICE - Every insight must be specific and actionable
   ❌ "Improve operations"
   ❌ "Focus on customer satisfaction"  
   ✓ "Customer ABC has 3 unpaid invoices totaling GHS 15,000 - schedule a payment call this week"

2. EVERY INSIGHT MUST TIE TO: money (revenue/cost), risk (loss prevention), or growth (opportunity)

3. BE CONSERVATIVE WITH CONFIDENCE
   - Below 70% confidence: explicitly state uncertainty
   - Only claim "high confidence" when data strongly supports it

4. LIMIT OUTPUT: Return 6-8 insights maximum, prioritized by (financial impact × urgency)

5. SAFETY GUARDRAILS:
   - Never suggest legal actions against customers
   - Never recommend terminating customer relationships
   - Phrase recommendations as "Consider..." or "We recommend reviewing..."
   - Default tone: calm, professional, advisory

Return your analysis using the provided tool schema.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orders, customers, quotes, timeframe = '90days' } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('AI Analytics: Starting enhanced analysis for', orders.length, 'orders,', customers.length, 'customers,', quotes.length, 'quotes');

    // Enhanced data pre-processing
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Payment aging analysis
    const pendingPaymentOrders = orders.filter((o: any) => o.status === 'pending_payment');
    const paymentAging = {
      current_0_30: pendingPaymentOrders.filter((o: any) => {
        if (!o.created_at) return false;
        const created = new Date(o.created_at);
        return created >= thirtyDaysAgo;
      }),
      overdue_31_60: pendingPaymentOrders.filter((o: any) => {
        if (!o.created_at) return false;
        const created = new Date(o.created_at);
        return created < thirtyDaysAgo && created >= sixtyDaysAgo;
      }),
      critical_60_plus: pendingPaymentOrders.filter((o: any) => {
        if (!o.created_at) return false;
        const created = new Date(o.created_at);
        return created < sixtyDaysAgo;
      })
    };

    // Order cycle time statistics
    const deliveredOrders = orders.filter((o: any) => o.status === 'delivered' && o.created_at && o.delivered_at);
    const cycleTimes = deliveredOrders.map((o: any) => {
      const created = new Date(o.created_at).getTime();
      const delivered = new Date(o.delivered_at).getTime();
      return (delivered - created) / (1000 * 60 * 60 * 24); // days
    });
    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a: number, b: number) => a + b, 0) / cycleTimes.length : 0;

    // Customer activity decay analysis
    const customerActivity = customers.map((c: any) => {
      const customerOrders = orders.filter((o: any) => o.customer_id === c.id);
      const sortedOrders = customerOrders
        .filter((o: any) => o.created_at)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const lastOrderDate = sortedOrders.length > 0 ? new Date(sortedOrders[0].created_at) : null;
      const daysSinceLastOrder = lastOrderDate ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
      const totalRevenue = customerOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
      
      // Payment behavior
      const pendingPayments = customerOrders.filter((o: any) => o.status === 'pending_payment');
      const paymentIssues = pendingPayments.length;

      return {
        name: c.company_name,
        id: c.id,
        totalRevenue,
        orderCount: customerOrders.length,
        daysSinceLastOrder,
        paymentIssues,
        isAtRisk: daysSinceLastOrder > 60 || paymentIssues >= 2
      };
    }).filter((c: any) => c.orderCount > 0);

    // Quote-to-order conversion timing
    const acceptedQuotes = quotes.filter((q: any) => q.status === 'accepted');
    const sentQuotes = quotes.filter((q: any) => q.status === 'sent');
    const staleQuotes = sentQuotes.filter((q: any) => {
      if (!q.created_at) return false;
      const created = new Date(q.created_at);
      return (now.getTime() - created.getTime()) > 7 * 24 * 60 * 60 * 1000; // > 7 days
    });

    // Prepare enhanced data summary for AI
    const dataSummary = {
      overview: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
        avgOrderValue: orders.length > 0 ? orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / orders.length : 0,
        totalCustomers: customers.length,
        activeCustomers: customerActivity.filter((c: any) => c.daysSinceLastOrder < 90).length
      },
      paymentHealth: {
        totalPendingPayments: pendingPaymentOrders.length,
        totalCashAtRisk: pendingPaymentOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
        aging: {
          current: { count: paymentAging.current_0_30.length, amount: paymentAging.current_0_30.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) },
          overdue: { count: paymentAging.overdue_31_60.length, amount: paymentAging.overdue_31_60.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) },
          critical: { count: paymentAging.critical_60_plus.length, amount: paymentAging.critical_60_plus.reduce((s: number, o: any) => s + (o.total_amount || 0), 0) }
        }
      },
      operationalMetrics: {
        avgCycleTimeDays: avgCycleTime.toFixed(1),
        ordersInProgress: orders.filter((o: any) => ['processing', 'ready_to_ship', 'shipped'].includes(o.status)).length,
        failedDeliveries: orders.filter((o: any) => o.failed_delivery_count && o.failed_delivery_count > 0).length
      },
      customerInsights: {
        topCustomers: customerActivity.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).slice(0, 5),
        atRiskCustomers: customerActivity.filter((c: any) => c.isAtRisk).slice(0, 5),
        growingCustomers: customerActivity.filter((c: any) => c.daysSinceLastOrder < 30 && c.orderCount >= 3).slice(0, 5)
      },
      quoteMetrics: {
        total: quotes.length,
        conversionRate: quotes.length > 0 ? ((acceptedQuotes.length / quotes.length) * 100).toFixed(1) : 0,
        staleQuotesCount: staleQuotes.length,
        staleQuotesValue: staleQuotes.reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0)
      },
      timeframe
    };

    // Call Lovable AI for intelligent insights with enhanced schema
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Analyze this business data and provide 6-8 actionable insights prioritized by financial impact and urgency:\n\n${JSON.stringify(dataSummary, null, 2)}` 
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_prescriptive_insights",
            description: "Generate structured, prescriptive business intelligence insights",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  description: "Array of 6-8 prioritized insights",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["risk", "opportunity", "optimization", "prediction"],
                        description: "Category of the insight"
                      },
                      title: {
                        type: "string",
                        description: "Short, human-readable insight title (max 60 chars)"
                      },
                      summary: {
                        type: "string",
                        description: "Plain-language explanation of what is happening (1-2 sentences)"
                      },
                      why_it_matters: {
                        type: "string",
                        description: "Business impact explanation - tie to money, risk, or growth"
                      },
                      estimated_financial_impact: {
                        type: "object",
                        properties: {
                          amount: { type: "number", description: "Estimated impact in GHS" },
                          currency: { type: "string", default: "GHS" },
                          confidence: { type: "string", enum: ["low", "medium", "high"] }
                        },
                        required: ["amount", "currency", "confidence"]
                      },
                      recommended_action: {
                        type: "string",
                        description: "Specific, realistic action the user can take this week"
                      },
                      urgency: {
                        type: "string",
                        enum: ["immediate", "soon", "monitor"],
                        description: "immediate=act today, soon=this week, monitor=track"
                      },
                      confidence_score: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                        description: "Confidence in this insight (0.0-1.0)"
                      },
                      data_sources: {
                        type: "array",
                        items: { type: "string" },
                        description: "Which data informed this insight"
                      },
                      time_horizon: {
                        type: "string",
                        enum: ["short_term", "medium_term"],
                        description: "short_term=1-2 weeks, medium_term=1-3 months"
                      }
                    },
                    required: ["type", "title", "summary", "why_it_matters", "recommended_action", "urgency", "confidence_score"]
                  }
                },
                executive_summary: {
                  type: "string",
                  description: "2-3 sentence overview of the most critical findings"
                }
              },
              required: ["insights", "executive_summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_prescriptive_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received:', JSON.stringify(aiData).substring(0, 300));

    // Extract insights from tool call response
    let insights;
    let executiveSummary = '';
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const parsed = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
      insights = parsed.insights || [];
      executiveSummary = parsed.executive_summary || '';
    } else {
      // Generate fallback insights from pre-processed data
      insights = generateFallbackInsights(dataSummary, paymentAging, customerActivity, staleQuotes);
      executiveSummary = 'Analysis based on available data patterns.';
    }

    // Log insights to audit
    await supabase.from('audit_logs').insert({
      event_type: 'ai_analytics_generated',
      event_data: {
        insights_generated: true,
        insights_count: insights.length,
        data_points_analyzed: {
          orders: orders.length,
          customers: customers.length,
          quotes: quotes.length
        },
        timestamp: new Date().toISOString()
      },
      severity: 'low'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        executive_summary: executiveSummary,
        metadata: {
          analyzed_at: new Date().toISOString(),
          data_points: {
            orders: orders.length,
            customers: customers.length,
            quotes: quotes.length
          },
          cash_at_risk: dataSummary.paymentHealth.totalCashAtRisk,
          customers_at_risk: customerActivity.filter((c: any) => c.isAtRisk).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-analytics:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate fallback insights when AI call fails
function generateFallbackInsights(dataSummary: any, paymentAging: any, customerActivity: any, staleQuotes: any) {
  const insights: any[] = [];

  // Cash at risk insight
  if (dataSummary.paymentHealth.totalCashAtRisk > 0) {
    insights.push({
      type: 'risk',
      title: 'Outstanding Payments Need Attention',
      summary: `${dataSummary.paymentHealth.totalPendingPayments} orders totaling GHS ${(dataSummary.paymentHealth.totalCashAtRisk / 1000).toFixed(0)}K are awaiting payment.`,
      why_it_matters: 'Delayed payments directly impact cash flow and working capital availability.',
      estimated_financial_impact: {
        amount: dataSummary.paymentHealth.totalCashAtRisk,
        currency: 'GHS',
        confidence: 'high'
      },
      recommended_action: 'Review pending payment orders and send payment reminders to customers.',
      urgency: paymentAging.critical_60_plus.length > 0 ? 'immediate' : 'soon',
      confidence_score: 0.95,
      data_sources: ['orders', 'payments'],
      time_horizon: 'short_term'
    });
  }

  // Critical overdue payments
  if (paymentAging.critical_60_plus.length > 0) {
    const criticalAmount = paymentAging.critical_60_plus.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    insights.push({
      type: 'risk',
      title: 'Critical: 60+ Day Overdue Payments',
      summary: `${paymentAging.critical_60_plus.length} orders over 60 days overdue, totaling GHS ${(criticalAmount / 1000).toFixed(0)}K.`,
      why_it_matters: 'Payments over 60 days overdue have significantly higher default risk.',
      estimated_financial_impact: {
        amount: criticalAmount,
        currency: 'GHS',
        confidence: 'high'
      },
      recommended_action: 'Schedule urgent calls with these customers to discuss payment plans.',
      urgency: 'immediate',
      confidence_score: 0.98,
      data_sources: ['orders', 'payments'],
      time_horizon: 'short_term'
    });
  }

  // At-risk customers
  const atRiskCustomers = customerActivity.filter((c: any) => c.isAtRisk);
  if (atRiskCustomers.length > 0) {
    const atRiskRevenue = atRiskCustomers.reduce((s: number, c: any) => s + c.totalRevenue, 0);
    insights.push({
      type: 'prediction',
      title: `${atRiskCustomers.length} Customers at Churn Risk`,
      summary: `These customers show declining activity or payment issues, representing GHS ${(atRiskRevenue / 1000).toFixed(0)}K in historical revenue.`,
      why_it_matters: 'Retaining existing customers costs 5x less than acquiring new ones.',
      estimated_financial_impact: {
        amount: atRiskRevenue * 0.3, // 30% potential loss
        currency: 'GHS',
        confidence: 'medium'
      },
      recommended_action: 'Proactively reach out to understand their needs and address concerns.',
      urgency: 'soon',
      confidence_score: 0.75,
      data_sources: ['customers', 'orders'],
      time_horizon: 'medium_term'
    });
  }

  // Stale quotes
  if (staleQuotes.length > 0) {
    const staleValue = staleQuotes.reduce((s: number, q: any) => s + (q.total_amount || 0), 0);
    insights.push({
      type: 'opportunity',
      title: 'Stale Quotes Need Follow-Up',
      summary: `${staleQuotes.length} quotes sent over 7 days ago haven't received responses.`,
      why_it_matters: 'Timely follow-up can increase quote-to-order conversion by up to 50%.',
      estimated_financial_impact: {
        amount: staleValue * 0.25, // 25% potential conversion
        currency: 'GHS',
        confidence: 'medium'
      },
      recommended_action: 'Follow up on these quotes with a phone call or personalized email.',
      urgency: 'soon',
      confidence_score: 0.80,
      data_sources: ['quotes'],
      time_horizon: 'short_term'
    });
  }

  return insights;
}
