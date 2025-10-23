import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get token from URL query parameter
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Invalid Verification Link</div>
              <p>The verification link is invalid or missing the token.</p>
            </div>
          </body>
        </html>
        `,
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    console.log('Verifying newsletter subscription with token:', token);

    // Call the database function to verify the subscription
    const { data, error } = await supabase
      .rpc('verify_newsletter_subscription', { p_token: token });

    if (error) {
      console.error('Verification error:', error);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Verification Failed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Verification Failed</div>
              <p>An error occurred while verifying your subscription. Please try again or contact support.</p>
            </div>
          </body>
        </html>
        `,
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    if (!data.success) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Verification Failed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ ${data.error}</div>
              <p>The verification link may have expired (valid for 24 hours) or was already used.</p>
              <p>Please try subscribing again.</p>
            </div>
          </body>
        </html>
        `,
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    console.log('Newsletter subscription verified successfully:', data.email);

    // Return success page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subscription Confirmed</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 10px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
            }
            .success { 
              color: #16a34a; 
              font-size: 48px; 
              margin-bottom: 20px; 
            }
            h1 { 
              color: #1e40af; 
              font-size: 28px; 
              margin-bottom: 20px; 
            }
            p { 
              color: #666; 
              font-size: 16px; 
              line-height: 1.6; 
            }
            .email { 
              color: #1e40af; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <h1>Subscription Confirmed!</h1>
            <p>Thank you for confirming your email address <span class="email">${data.email}</span>.</p>
            <p>You're now subscribed to our newsletter and will receive updates about premium food products and export opportunities.</p>
            <p style="margin-top: 30px; font-size: 14px; color: #999;">You can close this window.</p>
          </div>
        </body>
      </html>
      `,
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌ An Error Occurred</div>
            <p>An unexpected error occurred. Please try again or contact support.</p>
          </div>
        </body>
      </html>
      `,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
}

Deno.serve(handler);
