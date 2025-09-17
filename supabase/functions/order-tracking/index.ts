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

function generateTrackingPage(order: any, token: string): string {
  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { 
        color: '#f59e0b', 
        text: 'Pending Confirmation', 
        description: 'Your order has been received and is awaiting confirmation.',
        progress: 20
      };
      case 'confirmed': return { 
        color: '#3b82f6', 
        text: 'Confirmed', 
        description: 'Your order has been confirmed and is being prepared.',
        progress: 40
      };
      case 'processing': return { 
        color: '#8b5cf6', 
        text: 'Processing', 
        description: 'Your order is currently being processed and prepared for shipment.',
        progress: 60
      };
      case 'shipped': return { 
        color: '#f97316', 
        text: 'Shipped', 
        description: 'Your order has been shipped and is on its way to you.',
        progress: 80
      };
      case 'delivered': return { 
        color: '#10b981', 
        text: 'Delivered', 
        description: 'Your order has been successfully delivered.',
        progress: 100
      };
      case 'cancelled': return { 
        color: '#ef4444', 
        text: 'Cancelled', 
        description: 'This order has been cancelled.',
        progress: 0
      };
      default: return { 
        color: '#6b7280', 
        text: status, 
        description: 'Order status is being updated.',
        progress: 0
      };
    }
  };

  const statusInfo = getStatusInfo(order.status);

  // Generate order items HTML
  const itemsHtml = order.order_items.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500;">${item.product_name}</div>
        ${item.product_description ? `<div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${item.product_description}</div>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${item.quantity} ${item.unit}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ${order.currency} ${item.unit_price.toLocaleString()}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">
        ${order.currency} ${item.total_price.toLocaleString()}
      </td>
    </tr>
  `).join('');

  // Generate progress steps
  const steps = [
    { name: 'Order Placed', status: 'completed' },
    { name: 'Confirmed', status: order.status === 'pending' ? 'pending' : 'completed' },
    { name: 'Processing', status: ['pending', 'confirmed'].includes(order.status) ? 'pending' : 'completed' },
    { name: 'Shipped', status: ['pending', 'confirmed', 'processing'].includes(order.status) ? 'pending' : 'completed' },
    { name: 'Delivered', status: order.status === 'delivered' ? 'completed' : 'pending' }
  ];

  const stepsHtml = steps.map((step, index) => `
    <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: ${step.status === 'completed' ? '#10b981' : '#e5e7eb'};
        color: ${step.status === 'completed' ? 'white' : '#6b7280'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 8px;
      ">
        ${step.status === 'completed' ? '✓' : index + 1}
      </div>
      <div style="font-size: 12px; color: ${step.status === 'completed' ? '#10b981' : '#6b7280'}; text-align: center;">
        ${step.name}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Tracking - ${order.order_number}</title>
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
          padding: 0;
          max-width: 800px;
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 30px;
        }
        .status-card {
          background: ${statusInfo.color}15;
          border: 2px solid ${statusInfo.color}30;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .status-badge {
          background: ${statusInfo.color};
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          display: inline-block;
          margin-bottom: 10px;
        }
        .progress-bar {
          background: #e5e7eb;
          height: 8px;
          border-radius: 4px;
          margin: 20px 0;
          overflow: hidden;
        }
        .progress-fill {
          background: ${statusInfo.color};
          height: 100%;
          width: ${statusInfo.progress}%;
          transition: width 0.3s ease;
        }
        .steps-container {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .order-details {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #f8fafc;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .refresh-btn {
          background: #1e40af;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
        }
        @media (max-width: 600px) {
          .steps-container {
            flex-direction: column;
            gap: 20px;
          }
          .container {
            margin: 10px;
          }
          body {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Tracking</h1>
          <p style="margin: 0; opacity: 0.9;">Order #${order.order_number}</p>
        </div>

        <div class="content">
          <div class="status-card">
            <div class="status-badge">${statusInfo.text}</div>
            <p style="margin: 0; color: #374151;">${statusInfo.description}</p>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>

          <div class="steps-container">
            ${stepsHtml}
          </div>

          <div class="order-details">
            <h3 style="margin-top: 0; color: #1e40af;">Order Information</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
              <div>
                <p><strong>Order Date:</strong><br>${new Date(order.created_at).toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong><br>${order.currency} ${order.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p><strong>Customer:</strong><br>${order.customers?.company_name || 'N/A'}</p>
                ${order.quotes ? `<p><strong>From Quote:</strong><br>${order.quotes.quote_number}</p>` : ''}
              </div>
            </div>
          </div>

          <h3 style="color: #1e40af;">Order Items</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td colspan="3" style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb;">
                  Total Amount:
                </td>
                <td style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb;">
                  ${order.currency} ${order.total_amount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: center;">
            <button onclick="location.reload()" class="refresh-btn">
              🔄 Refresh Status
            </button>
          </div>
        </div>

        <div class="footer">
          <strong>SeaPro SAS</strong><br>
          For questions about your order, contact us at orders@seapro.com or +233 123 456 789
        </div>
      </div>

      <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
          location.reload();
        }, 30000);
      </script>
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

    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('magic_link_tokens')
      .select(`
        *,
        orders (
          *,
          customers(company_name, contact_name),
          quotes(quote_number, title),
          order_items(*)
        )
      `)
      .eq('token', token)
      .eq('token_type', 'order_tracking')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Tracking Link</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid or Expired Tracking Link</h1>
          <p>This tracking link is no longer valid or has expired.</p>
          <p>Please contact us for assistance.</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 400
      });
    }

    // Show tracking page
    return new Response(generateTrackingPage(tokenData.orders, token), {
      headers: { 'Content-Type': 'text/html' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error in order-tracking function:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tracking Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #ef4444; }
        </style>
      </head>
      <body>
        <h1 class="error">Error Loading Tracking Information</h1>
        <p>We encountered an error while loading your tracking information.</p>
        <p>Please try again later or contact us for assistance.</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
};

serve(handler);