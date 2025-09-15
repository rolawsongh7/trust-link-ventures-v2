import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (req.method === 'GET') {
    // Validate token and show quote submission form
    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('magic_link_tokens')
      .select(`
        *,
        rfqs (
          id,
          title,
          description,
          deadline
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(generateErrorPage('Invalid or expired token'), {
        headers: { 'Content-Type': 'text/html' },
        status: 400
      });
    }

    // Check if quote already submitted
    const { data: existingSubmission } = await supabase
      .from('quote_submissions')
      .select('id')
      .eq('magic_token', token)
      .single();

    if (existingSubmission) {
      return new Response(generateSuccessPage('Quote already submitted'), {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      });
    }

    return new Response(generateQuoteForm(tokenData, token), {
      headers: { 'Content-Type': 'text/html' },
      status: 200
    });
  }

  if (req.method === 'POST') {
    // Handle quote submission
    try {
      const formData = await req.formData();
      const submissionToken = formData.get('token') as string;

      if (!submissionToken) {
        throw new Error('Missing token');
      }

      // Verify token again
      const { data: tokenData, error: tokenError } = await supabase
        .from('magic_link_tokens')
        .select('*')
        .eq('token', submissionToken)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Invalid or expired token');
      }

      // Extract form data
      const supplierName = formData.get('supplier_name') as string;
      const supplierCompany = formData.get('supplier_company') as string;
      const supplierPhone = formData.get('supplier_phone') as string;
      const quoteAmount = parseFloat(formData.get('quote_amount') as string);
      const currency = formData.get('currency') as string || 'USD';
      const deliveryDate = formData.get('delivery_date') as string;
      const validityDays = parseInt(formData.get('validity_days') as string) || 30;
      const notes = formData.get('notes') as string;

      // Handle file upload if present
      const file = formData.get('quote_file') as File;
      let fileUrl = null;

      if (file && file.size > 0) {
        const fileName = `quote-${tokenData.rfq_id}-${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('quotes')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        fileUrl = uploadData.path;
      }

      // Insert quote submission
      const { error: insertError } = await supabase
        .from('quote_submissions')
        .insert({
          rfq_id: tokenData.rfq_id,
          supplier_email: tokenData.supplier_email,
          supplier_name: supplierName,
          supplier_company: supplierCompany,
          supplier_phone: supplierPhone,
          quote_amount: quoteAmount,
          currency: currency,
          delivery_date: deliveryDate,
          validity_days: validityDays,
          notes: notes,
          file_url: fileUrl,
          magic_token: submissionToken
        });

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      // Mark token as used
      await supabase
        .from('magic_link_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', submissionToken);

      return new Response(generateSuccessPage('Quote submitted successfully!'), {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      });

    } catch (error: any) {
      console.error('Error processing quote submission:', error);
      return new Response(generateErrorPage(`Error: ${error.message}`), {
        headers: { 'Content-Type': 'text/html' },
        status: 500
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

function generateQuoteForm(tokenData: any, token: string): string {
  const rfq = tokenData.rfqs;
  const deadline = rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'Not specified';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Submit Quote - ${rfq.title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .rfq-info { background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #374151; }
        input, textarea, select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 16px; }
        textarea { height: 100px; resize: vertical; }
        .file-input { background-color: #f9fafb; }
        .submit-btn { background-color: #2563eb; color: white; padding: 12px 30px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; width: 100%; }
        .submit-btn:hover { background-color: #1d4ed8; }
        .required { color: #ef4444; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Submit Your Quote</h1>
          <p>Trust Link Ventures Limited</p>
        </div>

        <div class="rfq-info">
          <h3>RFQ Details:</h3>
          <p><strong>Title:</strong> ${rfq.title}</p>
          ${rfq.description ? `<p><strong>Description:</strong> ${rfq.description}</p>` : ''}
          <p><strong>Deadline:</strong> ${deadline}</p>
          <p><strong>Your Email:</strong> ${tokenData.supplier_email}</p>
        </div>

        <form method="POST" enctype="multipart/form-data">
          <input type="hidden" name="token" value="${token}">
          
          <div class="grid">
            <div class="form-group">
              <label for="supplier_name">Contact Person <span class="required">*</span></label>
              <input type="text" id="supplier_name" name="supplier_name" required>
            </div>
            
            <div class="form-group">
              <label for="supplier_company">Company Name <span class="required">*</span></label>
              <input type="text" id="supplier_company" name="supplier_company" required>
            </div>
          </div>

          <div class="form-group">
            <label for="supplier_phone">Phone Number</label>
            <input type="tel" id="supplier_phone" name="supplier_phone">
          </div>

          <div class="grid">
            <div class="form-group">
              <label for="quote_amount">Quote Amount <span class="required">*</span></label>
              <input type="number" id="quote_amount" name="quote_amount" step="0.01" min="0" required>
            </div>
            
            <div class="form-group">
              <label for="currency">Currency</label>
              <select id="currency" name="currency">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GHS">GHS</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div class="grid">
            <div class="form-group">
              <label for="delivery_date">Expected Delivery Date</label>
              <input type="date" id="delivery_date" name="delivery_date">
            </div>
            
            <div class="form-group">
              <label for="validity_days">Quote Valid for (days)</label>
              <input type="number" id="validity_days" name="validity_days" value="30" min="1">
            </div>
          </div>

          <div class="form-group">
            <label for="quote_file">Upload Quote Document (PDF)</label>
            <input type="file" id="quote_file" name="quote_file" accept=".pdf" class="file-input">
          </div>

          <div class="form-group">
            <label for="notes">Additional Notes</label>
            <textarea id="notes" name="notes" placeholder="Any additional information about your quote..."></textarea>
          </div>

          <button type="submit" class="submit-btn">Submit Quote</button>
        </form>
      </div>
    </body>
    </html>
  `;
}

function generateSuccessPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote Submission Success</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .success-icon { color: #10b981; font-size: 48px; margin-bottom: 20px; }
        h1 { color: #374151; margin-bottom: 20px; }
        p { color: #6b7280; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>
        <h1>Success!</h1>
        <p>${message}</p>
        <p>Thank you for submitting your quote. We will review it and get back to you soon.</p>
        <p><strong>Trust Link Ventures Limited</strong><br>
        Email: info@trustlinkventures.com</p>
      </div>
    </body>
    </html>
  `;
}

function generateErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .error-icon { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
        h1 { color: #374151; margin-bottom: 20px; }
        p { color: #6b7280; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">✗</div>
        <h1>Error</h1>
        <p>${message}</p>
        <p>If you believe this is an error, please contact us at info@trustlinkventures.com</p>
      </div>
    </body>
    </html>
  `;
}