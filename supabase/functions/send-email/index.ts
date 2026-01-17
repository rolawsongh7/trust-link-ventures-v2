import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'welcome' | 'password-reset' | 'security-alert' | 'quote-confirmation' | 'verification' | 'quote_ready' | 'quote_accepted' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'new_quote_request_admin' | 'account_deleted' | 'support_reply';
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    let html = '';
    let from = "Trust Link Ventures <info@trustlinkcompany.com>";

    switch (type) {
      case 'welcome':
        html = generateWelcomeEmail(data?.name || 'User');
        break;
      case 'password-reset':
        html = generatePasswordResetEmail(data?.resetLink || '', data?.name || 'User');
        break;
      case 'security-alert':
        html = generateSecurityAlertEmail(data?.alertType || 'Login from new device', data?.details || {});
        break;
      case 'quote-confirmation':
        html = generateQuoteConfirmationEmail(data);
        break;
      case 'verification':
        html = generateVerificationEmail(data?.verificationLink || '', data?.name || 'User');
        break;
      case 'quote_ready':
        html = generateQuoteReadyEmail(data);
        break;
      case 'quote_accepted':
        html = generateQuoteAcceptedEmail(data);
        break;
      case 'order_confirmed':
        html = generateOrderConfirmedEmail(data);
        break;
      case 'order_shipped':
        html = generateOrderShippedEmail(data);
        break;
      case 'order_delivered':
        html = generateOrderDeliveredEmail(data);
        break;
      case 'new_quote_request_admin':
        html = generateAdminQuoteNotificationEmail(data);
        break;
      case 'account_deleted':
        html = generateAccountDeletedEmail(data);
        break;
      case 'support_reply':
        html = generateSupportReplyEmail(data);
        from = "Trust Link Support <support@trustlinkcompany.com>";
        break;
      default:
        throw new Error('Invalid email type');
    }

    const emailResponse = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateWelcomeEmail(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Trust Link Ventures!</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>Welcome to Trust Link Ventures! We're excited to have you as part of our global community of trusted partnerships.</p>
          <p>Our platform offers:</p>
          <ul>
            <li>Sustainable venture building and partnerships</li>
            <li>Trusted food exports and sourcing</li>
            <li>Global reach with measurable impact</li>
            <li>Ethical sourcing and innovative solutions</li>
          </ul>
          <p>Get started by exploring our services and connecting with our global network.</p>
          <a href="${Deno.env.get('SUPABASE_URL')}" class="button">Explore Services</a>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures</p>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePasswordResetEmail(resetLink: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>We received a request to reset your password for your Trust Link Ventures account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>For security, never share this link with others</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSecurityAlertEmail(alertType: string, details: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fd7e14; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Security Alert</h1>
        </div>
        <div class="content">
          <p>We detected unusual activity on your account:</p>
          <div class="alert">
            <h3>${alertType}</h3>
            <p><strong>Time:</strong> ${details.timestamp || new Date().toLocaleString()}</p>
            <p><strong>Location:</strong> ${details.location || 'Unknown'}</p>
            <p><strong>IP Address:</strong> ${details.ipAddress || 'Unknown'}</p>
            <p><strong>Device:</strong> ${details.device || 'Unknown'}</p>
          </div>
          <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
        </div>
        <div class="footer">
          <p>Trust Link Ventures Security Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteConfirmationEmail(data: any): string {
  const itemsHtml = data?.items?.map((item: any) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.productName}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.unit}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.preferredGrade || 'Standard'}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.specifications || '-'}</td>
    </tr>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .quote-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #28a745; color: white; padding: 12px; text-align: left; }
        .message-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Quote Request Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          <p>Thank you for your quote request! We have received your inquiry and our team will review it shortly.</p>
          
          <div class="quote-details">
            <h3>Quote Details:</h3>
            <p><strong>Request Number:</strong> ${data?.quoteNumber || 'N/A'}</p>
            <p><strong>Company:</strong> ${data?.companyName || 'N/A'}</p>
            <p><strong>Contact:</strong> ${data?.contactName || data?.customerName || 'N/A'}</p>
            <p><strong>Industry:</strong> ${data?.industry || 'N/A'}</p>
          </div>

          ${data?.items && data.items.length > 0 ? `
            <div style="margin: 20px 0;">
              <h3>Requested Products (${data.items.length} items):</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: center;">Unit</th>
                    <th>Grade</th>
                    <th>Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${data?.message && data.message !== 'No additional notes provided' ? `
            <div class="message-box">
              <h4 style="margin-top: 0;">Your Message:</h4>
              <p style="margin-bottom: 0;">${data.message}</p>
            </div>
          ` : ''}

          <p>Our team will contact you within 24-48 hours with a detailed quote and partnership proposal.</p>
          <p>If you have any urgent questions, please contact us at <a href="mailto:info@trustlinkcompany.com">info@trustlinkcompany.com</a></p>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures</p>
          <p style="font-size: 12px; color: #666;">This is an automated confirmation. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateVerificationEmail(verificationLink: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #17a2b8; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>Please verify your email address to complete your account setup with Trust Link Ventures.</p>
          <a href="${verificationLink}" class="button">Verify Email Address</a>
          <p>This verification link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteReadyEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Your Quote is Ready!</h1>
        </div>
        <div class="content">
          <p>Good news! Your quote <strong>${data?.quoteNumber}</strong> is now ready for review.</p>
          <a href="${data?.customerPortalLink}" class="button">View Quote</a>
          <p>Log in to your customer portal to review the details and accept the quote.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br>Trust Link Ventures Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteAcceptedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Quote Accepted</h1>
        </div>
        <div class="content">
          <p>Quote <strong>${data?.quoteNumber}</strong> has been accepted by the customer.</p>
          <p><strong>Customer Email:</strong> ${data?.customerEmail}</p>
          <p>Please process this order accordingly.</p>
        </div>
        <div class="footer">
          <p>Trust Link Ventures System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderConfirmedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Your order <strong>${data?.orderNumber}</strong> has been confirmed and is being processed.</p>
          <a href="${data?.trackingLink}" class="button">Track Order</a>
          <p>You can track your order status anytime from your customer portal.</p>
        </div>
        <div class="footer">
          <p>Thank you for your business!<br>Trust Link Ventures Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderShippedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fd7e14; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Order Shipped!</h1>
        </div>
        <div class="content">
          <p>Great news! Your order <strong>${data?.orderNumber}</strong> has been shipped.</p>
          ${data?.trackingNumber ? `
            <div class="info-box">
              <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
            </div>
          ` : ''}
          <a href="${data?.trackingLink}" class="button">Track Shipment</a>
          <p>You can track your shipment progress from your customer portal.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br>Trust Link Ventures Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderDeliveredEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Order Delivered!</h1>
        </div>
        <div class="content">
          <p>Your order <strong>${data?.orderNumber}</strong> has been successfully delivered.</p>
          <p>We hope you're satisfied with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures!<br>We look forward to serving you again.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAdminQuoteNotificationEmail(data: any): string {
  const itemsHtml = data?.items?.map((item: any) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.productName}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.unit}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.preferredGrade || 'Standard'}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.specifications || '-'}</td>
    </tr>
  `).join('') || '';

  const urgencyColor = data?.urgency === 'high' ? '#dc3545' : data?.urgency === 'low' ? '#28a745' : '#ffc107';
  const urgencyLabel = (data?.urgency || 'medium').toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .customer-card { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .urgency-badge { display: inline-block; padding: 5px 12px; border-radius: 4px; color: white; font-weight: bold; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .message-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Quote Request</h1>
          <p style="margin: 0; font-size: 18px;">Quote ${data?.quoteNumber || 'N/A'}</p>
        </div>
        <div class="content">
          <div style="margin-bottom: 20px;">
            <span class="urgency-badge" style="background-color: ${urgencyColor};">
              ${urgencyLabel} PRIORITY
            </span>
          </div>

          <h3>Customer Information:</h3>
          <div class="customer-card">
            <p><strong>Company:</strong> ${data?.companyName || 'N/A'}</p>
            <p><strong>Contact:</strong> ${data?.customerName || 'N/A'}</p>
            <p><strong>Email:</strong> <a href="mailto:${data?.customerEmail}">${data?.customerEmail || 'N/A'}</a></p>
            <p><strong>Phone:</strong> ${data?.customerPhone || 'Not provided'}</p>
            <p><strong>Country:</strong> ${data?.country || 'Not provided'}</p>
            <p><strong>Industry:</strong> ${data?.industry || 'N/A'}</p>
          </div>

          ${data?.items && data.items.length > 0 ? `
            <h3>Requested Products (${data.items.length} items):</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: center;">Unit</th>
                  <th>Grade</th>
                  <th>Specifications</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          ` : ''}

          ${data?.message && data.message !== 'No additional notes' ? `
            <div class="message-box">
              <h4 style="margin-top: 0;">Customer Message:</h4>
              <p style="margin-bottom: 0;">${data.message}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data?.dashboardLink}" class="button">View in Dashboard</a>
            <a href="mailto:${data?.customerEmail}?subject=Re: Quote Request ${data?.quoteNumber}" class="button" style="background: #28a745;">Respond to Customer</a>
          </div>

          <p style="font-size: 14px; color: #666;">
            <strong>Next Steps:</strong><br>
            1. Review customer requirements and product specifications<br>
            2. Prepare a detailed quote with pricing and terms<br>
            3. Send quote to customer within 24-48 hours
          </p>
        </div>
        <div class="footer">
          <p>Trust Link Ventures Admin System</p>
          <p style="font-size: 12px; color: #666;">This is an automated notification from your quote management system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAccountDeletedEmail(data: any): string {
  const deletedAt = data?.deletedAt ? new Date(data.deletedAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }) : new Date().toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .info-box { background: #f8f9fa; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .deleted-list { margin: 15px 0; padding-left: 20px; }
        .deleted-list li { margin: 8px 0; color: #555; }
        .notice { background: #e7f3ff; border: 1px solid #b3d7ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Deletion Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.name || 'Valued Customer'},</p>
          
          <p>This email confirms that your Trust Link Ventures account has been <strong>permanently deleted</strong> as requested.</p>
          
          <div class="info-box">
            <p><strong>Deletion Date:</strong> ${deletedAt}</p>
            ${data?.reason && data.reason !== 'Not specified' ? `<p><strong>Reason Provided:</strong> ${data.reason}</p>` : ''}
          </div>

          <h3>What Was Removed:</h3>
          <ul class="deleted-list">
            <li>Your account profile and login credentials</li>
            <li>Saved delivery addresses</li>
            <li>Notification preferences and settings</li>
            <li>Security settings and device information</li>
            <li>Shopping cart items</li>
            <li>Communication history</li>
          </ul>

          <div class="notice">
            <strong>Note:</strong> For business record-keeping purposes, your order and quote history has been anonymized but retained. Your personal information has been removed from these records.
          </div>

          <p>If you did not request this deletion or believe this was done in error, please contact our support team immediately at <a href="mailto:info@trustlinkcompany.com">info@trustlinkcompany.com</a>.</p>

          <p>We're sorry to see you go. If you ever wish to return, you're always welcome to create a new account.</p>

          <p>Thank you for being a part of Trust Link Ventures.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Team</strong></p>
          <p style="font-size: 12px; color: #888;">This is a final confirmation email. No further action is required on your part.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSupportReplyEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .message-box { background: #f8f9fa; border-left: 4px solid #0066cc; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .ref-box { background: #e7f3ff; padding: 10px 15px; border-radius: 6px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Message from Trust Link Support</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          
          <p>We have received your inquiry and here is our response:</p>
          
          <div class="ref-box">
            <strong>Reference:</strong> ${data?.threadSubject || 'Support Inquiry'}
          </div>

          <div class="message-box">
            ${(data?.content || '').replace(/\n/g, '<br>')}
          </div>

          ${data?.orderId ? `<p><strong>Related Order:</strong> ${data.orderNumber || data.orderId}</p>` : ''}

          <p>If you have any further questions, please reply to this email or contact us through your customer portal.</p>

          ${data?.portalLink ? `<a href="${data.portalLink}" class="button">View in Customer Portal</a>` : ''}
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Support Team</strong></p>
          <p style="font-size: 12px; color: #888;">Do not reply directly to this email. Use your customer portal or contact support@trustlinkcompany.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);