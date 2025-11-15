import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking for expiring quotes...')

    // Find quotes expiring within 3 days that haven't been accepted
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const { data: expiringQuotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers (
          company_name,
          email,
          contact_name
        )
      `)
      .lte('valid_until', threeDaysFromNow.toISOString())
      .in('status', ['sent', 'draft'])
      .order('valid_until', { ascending: true })

    if (quotesError) {
      console.error('Error fetching expiring quotes:', quotesError)
      throw quotesError
    }

    console.log(`Found ${expiringQuotes?.length || 0} expiring quotes`)

    if (!expiringQuotes || expiringQuotes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No expiring quotes found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let notificationsSent = 0
    let emailsSent = 0

    for (const quote of expiringQuotes) {
      const daysUntilExpiry = Math.ceil(
        (new Date(quote.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      // Create notification for admin
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: quote.created_by || null,
          type: 'quote_expiring',
          title: `Quote ${quote.quote_number} expiring soon`,
          message: `Quote for ${quote.customers?.company_name || 'customer'} expires in ${daysUntilExpiry} days`,
          data: {
            quote_id: quote.id,
            quote_number: quote.quote_number,
            days_until_expiry: daysUntilExpiry,
            customer_name: quote.customers?.company_name
          }
        })

      if (!notificationError) {
        notificationsSent++
      }

      // Send reminder email to customer if email exists
      if (quote.customer_email || quote.customers?.email) {
        const customerEmail = quote.customer_email || quote.customers?.email

        try {
          const { error: emailError } = await supabase.functions.invoke('send-quote-email', {
            body: {
              quoteId: quote.id,
              customerEmail: customerEmail,
              emailType: 'expiry_reminder',
              customMessage: `Your quote ${quote.quote_number} will expire in ${daysUntilExpiry} days. Please review and let us know if you have any questions.`
            }
          })

          if (!emailError) {
            emailsSent++
          } else {
            console.error(`Failed to send email for quote ${quote.quote_number}:`, emailError)
          }
        } catch (emailErr) {
          console.error(`Error invoking email function for quote ${quote.quote_number}:`, emailErr)
        }
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        event_type: 'quote_expiry_reminder_sent',
        action: 'remind',
        resource_type: 'quote',
        resource_id: quote.id,
        event_data: {
          quote_number: quote.quote_number,
          days_until_expiry: daysUntilExpiry,
          customer_email: quote.customer_email || quote.customers?.email,
          notification_sent: !notificationError,
          email_sent: emailsSent > 0
        },
        severity: 'low'
      })
    }

    console.log(`Processed ${expiringQuotes.length} expiring quotes`)
    console.log(`Sent ${notificationsSent} notifications and ${emailsSent} emails`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expiring quotes check completed',
        count: expiringQuotes.length,
        notifications_sent: notificationsSent,
        emails_sent: emailsSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in check-expiring-quotes:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})