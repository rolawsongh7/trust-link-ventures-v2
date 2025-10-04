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
    const { responsibilityId, responsibilityName, mode } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update responsibility status
    await supabase
      .from('virtual_assistant_responsibilities')
      .update({ status: 'running', last_run_at: new Date().toISOString() })
      .eq('id', responsibilityId);

    // Log start
    await supabase.from('virtual_assistant_logs').insert({
      responsibility_id: responsibilityId,
      mode,
      responsibility_name: responsibilityName,
      action: 'started',
      status: 'running',
      details: { timestamp: new Date().toISOString() }
    });

    // Execute workflow based on responsibility
    let workflowResult;

    switch (responsibilityName) {
      case 'auto_convert_quotes':
        workflowResult = await handleAutoConvertQuotes(supabase);
        break;
      case 'rfq_automation':
        workflowResult = await handleRFQAutomation(supabase, lovableApiKey);
        break;
      case 'notifications_reminders':
        workflowResult = await handleNotificationsReminders(supabase);
        break;
      case 'analytics_insights':
        workflowResult = await handleAnalyticsInsights(supabase, lovableApiKey);
        break;
      default:
        workflowResult = { message: `Workflow ${responsibilityName} is configured but not yet implemented` };
    }

    // Update responsibility status
    await supabase
      .from('virtual_assistant_responsibilities')
      .update({ status: 'completed' })
      .eq('id', responsibilityId);

    // Log completion
    await supabase.from('virtual_assistant_logs').insert({
      responsibility_id: responsibilityId,
      mode,
      responsibility_name: responsibilityName,
      action: 'completed',
      status: 'success',
      details: {
        result: workflowResult,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ success: true, result: workflowResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in virtual-assistant-workflow:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAutoConvertQuotes(supabase: any) {
  // This is already handled by database trigger, just report status
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    message: 'Auto-convert quotes is active (handled by database trigger)',
    recentOrdersCount: recentOrders?.length || 0
  };
}

async function handleRFQAutomation(supabase: any, apiKey: string) {
  const { data: pendingRFQs } = await supabase
    .from('rfqs')
    .select('*')
    .eq('status', 'pending')
    .limit(5);

  return {
    message: 'RFQ automation checked',
    pendingRFQs: pendingRFQs?.length || 0
  };
}

async function handleNotificationsReminders(supabase: any) {
  // Check for expiring quotes
  const { data: expiringQuotes } = await supabase
    .from('quotes')
    .select('*')
    .gte('valid_until', new Date().toISOString())
    .lte('valid_until', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

  return {
    message: 'Notifications checked',
    expiringQuotesCount: expiringQuotes?.length || 0
  };
}

async function handleAnalyticsInsights(supabase: any, apiKey: string) {
  // Fetch recent data for analysis
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // Use AI to generate insights
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a business analytics assistant. Analyze the provided data and provide actionable insights.'
        },
        {
          role: 'user',
          content: `Analyze this data and provide insights:
Quotes: ${quotes?.length || 0} recent quotes
Orders: ${orders?.length || 0} recent orders
Provide: conversion rate insights, trends, and recommendations.`
        }
      ],
    }),
  });

  const aiData = await aiResponse.json();
  const insights = aiData.choices[0].message.content;

  return {
    message: 'Analytics insights generated',
    quotesAnalyzed: quotes?.length || 0,
    ordersAnalyzed: orders?.length || 0,
    insights
  };
}