import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function generateSuccessPage(title: string, message: string, isApproval: boolean): string {
  const backgroundColor = isApproval ? '#10b981' : '#ef4444';
  const icon = isApproval ? '✓' : '✗';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .icon {
          width: 80px;
          height: 80px;
          background: ${backgroundColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 30px;
          font-size: 40px;
          color: white;
          font-weight: bold;
        }
        h1 {
          color: #1f2937;
          margin-bottom: 20px;
          font-size: 28px;
        }
        p {
          color: #6b7280;
          line-height: 1.6;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          color: #9ca3af;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="footer">
          <strong>SeaPro SAS</strong><br>
          Thank you for your business
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateChoicePage(quote: any, token: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote Response - ${quote.quote_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        h1 {
          color: #1f2937;
          margin-bottom: 10px;
        }
        .quote-details {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .button-group {
          display: flex;
          gap: 15px;
          margin: 30px 0;
        }
        .btn {
          flex: 1;
          padding: 16px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: opacity 0.2s;
        }
        .btn:hover {
          opacity: 0.9;
        }
        .btn-approve {
          background: #10b981;
        }
        .btn-reject {
          background: #ef4444;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Quote Response Required</h1>
          <p style="color: #6b7280; margin: 0;">Quote Number: ${quote.quote_number}</p>
        </div>

        <div class="quote-details">
          <h3 style="margin-top: 0;">Quote Summary</h3>
          <p><strong>Title:</strong> ${quote.title || 'N/A'}</p>
          <p><strong>Total Amount:</strong> ${quote.currency} ${quote.total_amount?.toLocaleString() || '0'}</p>
          <p><strong>Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</p>
        </div>

        <p style="text-align: center; color: #6b7280;">
          Please choose your response to this quote:
        </p>

        <div class="button-group">
          <a href="?token=${token}&action=approve" class="btn btn-approve">
            ✓ Approve Quote
          </a>
          <a href="?token=${token}&action=reject" class="btn btn-reject">
            ✗ Reject Quote
          </a>
        </div>

        <div class="footer">
          <strong>TrustLink Ventures</strong><br>
          If you have any questions, please contact us at info@trustlinkcompany.com
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateFormPage(quote: any, token: string, action: string): string {
  const isApproval = action === 'approve';
  const actionTitle = isApproval ? 'Approve Quote' : 'Reject Quote';
  const buttonColor = isApproval ? '#10b981' : '#ef4444';
  const buttonText = isApproval ? 'Confirm Approval' : 'Confirm Rejection';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${actionTitle} - ${quote.quote_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .quote-details {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }
        textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
        }
        .submit-btn {
          background: ${buttonColor};
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          transition: opacity 0.2s;
        }
        .submit-btn:hover {
          opacity: 0.9;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${actionTitle}</h1>
          <p style="color: #6b7280; margin: 0;">Quote Number: ${quote.quote_number}</p>
        </div>

        <div class="quote-details">
          <h3>Quote Summary</h3>
          <p><strong>Title:</strong> ${quote.title}</p>
          <p><strong>Total Amount:</strong> ${quote.currency} ${quote.total_amount.toLocaleString()}</p>
          <p><strong>Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</p>
        </div>

        <form method="POST">
          <input type="hidden" name="token" value="${token}">
          <input type="hidden" name="action" value="${action}">
          <input type="hidden" name="quote_id" value="${quote.id}">

          <div class="form-group">
            <label for="notes">Comments (Optional):</label>
            <textarea name="notes" id="notes" placeholder="Please provide any additional comments or feedback..."></textarea>
          </div>

          <button type="submit" class="submit-btn">${buttonText}</button>
        </form>

        <div class="footer">
          <strong>SeaPro SAS</strong><br>
          If you have any questions, please contact us at quotes@seapro.com
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action'); // 'approve' or 'reject'

    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    // If no action specified, show choice page with both buttons
    if (!action) {
      // First verify token exists
      const { data: tokenData, error: tokenError } = await supabase
        .from('magic_link_tokens')
        .select('*, quotes(*)')
        .eq('token', token)
        .eq('token_type', 'quote_approval')
        .single();

      if (tokenError || !tokenData) {
        return new Response(generateSuccessPage(
          'Link Expired',
          'This quote approval link has expired or is invalid. Please contact us if you need assistance.',
          false
        ), {
          headers: { 'Content-Type': 'text/html' },
          status: 400
        });
      }

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response(generateSuccessPage(
          'Link Expired',
          'This quote approval link has expired. Please contact us for a new link.',
          false
        ), {
          headers: { 'Content-Type': 'text/html' },
          status: 400
        });
      }

      // Check if token was already used
      if (tokenData.used_at) {
        return new Response(generateSuccessPage(
          'Already Processed',
          'This quote has already been processed. Thank you!',
          false
        ), {
          headers: { 'Content-Type': 'text/html' },
          status: 400
        });
      }

      return new Response(generateChoicePage(tokenData.quotes, token), {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response('Invalid action', { status: 400 });
    }

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('magic_link_tokens')
      .select(`
        *,
        quotes (
          id,
          quote_number,
          title,
          total_amount,
          currency,
          valid_until,
          customer_email,
          customers(company_name, contact_name)
        )
      `)
      .eq('token', token)
      .eq('token_type', 'quote_approval')
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(generateSuccessPage(
        'Link Expired',
        'This approval link has expired or is no longer valid. Please contact us for a new approval link.',
        false
      ), {
        headers: { 'Content-Type': 'text/html' },
        status: 400
      });
    }

    if (req.method === 'GET') {
      // Show confirmation form
      return new Response(generateFormPage(tokenData.quotes, token, action), {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      });
    }

    if (req.method === 'POST') {
      // Process the approval/rejection
      const formData = await req.formData();
      const notes = formData.get('notes') as string || '';
      const decision = action === 'approve' ? 'approved' : 'rejected';

      // Get client IP and user agent
      const clientIP = req.headers.get('cf-connecting-ip') || 
                      req.headers.get('x-forwarded-for') || 
                      'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Record the approval/rejection
      const { error: approvalError } = await supabase
        .from('quote_approvals')
        .insert({
          quote_id: tokenData.quote_id,
          token: token,
          customer_email: tokenData.supplier_email, // reused field
          decision: decision,
          customer_notes: notes,
          ip_address: clientIP,
          user_agent: userAgent
        });

      if (approvalError) {
        throw new Error(`Failed to record approval: ${approvalError.message}`);
      }

      // Update quote status
      const newStatus = action === 'approve' ? 'accepted' : 'rejected';
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', tokenData.quote_id);

      if (quoteUpdateError) {
        throw new Error(`Failed to update quote: ${quoteUpdateError.message}`);
      }

      // Mark token as used
      await supabase
        .from('magic_link_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      const successMessage = action === 'approve' 
        ? 'Thank you! Your quote has been approved. We will process your order and contact you with the next steps.'
        : 'Thank you for your response. We have recorded your rejection and will be in touch if needed.';

      return new Response(generateSuccessPage(
        action === 'approve' ? 'Quote Approved!' : 'Quote Rejected',
        successMessage,
        action === 'approve'
      ), {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error: any) {
    console.error('Error in quote-approval function:', error);
    return new Response(generateSuccessPage(
      'Error',
      'An error occurred while processing your request. Please contact us directly.',
      false
    ), {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
};

serve(handler);