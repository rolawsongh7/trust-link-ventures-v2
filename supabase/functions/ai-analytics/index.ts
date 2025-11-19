import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('AI Analytics: Starting analysis for', orders.length, 'orders,', customers.length, 'customers,', quotes.length, 'quotes');

    // Prepare data summary for AI analysis
    const dataSummary = {
      orders: {
        total: orders.length,
        totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
        avgOrderValue: orders.length > 0 ? orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / orders.length : 0,
        statusBreakdown: orders.reduce((acc: any, o: any) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {}),
        recentOrders: orders.slice(0, 10).map((o: any) => ({
          total: o.total_amount,
          status: o.status,
          date: o.created_at,
          customer_id: o.customer_id
        }))
      },
      customers: {
        total: customers.length,
        topCustomers: customers
          .map((c: any) => {
            const customerOrders = orders.filter((o: any) => o.customer_id === c.id);
            const totalSpent = customerOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
            return {
              name: c.company_name,
              totalSpent,
              orderCount: customerOrders.length,
              lastOrderDate: customerOrders.length > 0 ? customerOrders[customerOrders.length - 1].created_at : null
            };
          })
          .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
          .slice(0, 10)
      },
      quotes: {
        total: quotes.length,
        accepted: quotes.filter((q: any) => q.status === 'accepted').length,
        rejected: quotes.filter((q: any) => q.status === 'rejected').length,
        sent: quotes.filter((q: any) => q.status === 'sent').length,
        conversionRate: quotes.length > 0 ? (quotes.filter((q: any) => q.status === 'accepted').length / quotes.length * 100).toFixed(2) : 0
      },
      timeframe
    };

    // Call Lovable AI for intelligent insights
    const systemPrompt = `You are an expert business intelligence analyst specializing in B2B seafood distribution analytics.

Your task is to analyze business data and provide actionable insights that drive profitability.

Focus on:
1. Profitability Drivers - Identify patterns that lead to higher profit margins
2. Customer Behavior - Spot trends in customer ordering patterns
3. Risk Identification - Flag customers at risk of churning
4. Revenue Opportunities - Suggest specific actions to increase revenue
5. Operational Efficiency - Recommend process improvements

Return your analysis as structured JSON using the provided tool.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this business data and provide actionable insights:\n\n${JSON.stringify(dataSummary, null, 2)}` 
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_business_insights",
            description: "Generate structured business intelligence insights",
            parameters: {
              type: "object",
              properties: {
                profitability_drivers: {
                  type: "object",
                  properties: {
                    top_customers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          customer: { type: "string" },
                          revenue_contribution: { type: "string" },
                          insight: { type: "string" }
                        }
                      }
                    },
                    growth_opportunities: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          opportunity: { type: "string" },
                          potential_impact: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium", "low"] }
                        }
                      }
                    }
                  }
                },
                risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      risk_type: { type: "string" },
                      description: { type: "string" },
                      severity: { type: "string", enum: ["high", "medium", "low"] },
                      recommendation: { type: "string" }
                    }
                  }
                },
                predictions: {
                  type: "object",
                  properties: {
                    revenue_trend: { type: "string" },
                    churn_risk_customers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          customer: { type: "string" },
                          risk_score: { type: "string" },
                          reason: { type: "string" }
                        }
                      }
                    }
                  }
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      expected_impact: { type: "string" },
                      category: { type: "string", enum: ["pricing", "retention", "efficiency", "growth"] },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    }
                  }
                }
              },
              required: ["profitability_drivers", "risks", "predictions", "recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_business_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received:', JSON.stringify(aiData).substring(0, 200));

    // Extract insights from tool call response
    let insights;
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      insights = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
    } else {
      // Fallback if no tool call
      insights = {
        profitability_drivers: {
          top_customers: [],
          growth_opportunities: []
        },
        risks: [],
        predictions: {
          revenue_trend: "Unable to analyze",
          churn_risk_customers: []
        },
        recommendations: []
      };
    }

    // Log insights to audit
    await supabase.from('audit_logs').insert({
      event_type: 'ai_analytics_generated',
      event_data: {
        insights_generated: true,
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
        metadata: {
          analyzed_at: new Date().toISOString(),
          data_points: {
            orders: orders.length,
            customers: customers.length,
            quotes: quotes.length
          }
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
