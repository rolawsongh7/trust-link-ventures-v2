import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { quoteRequestId } = await req.json()

    if (!quoteRequestId) {
      return new Response(
        JSON.stringify({ error: 'Quote request ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch quote request details with items
    const { data: quoteRequest, error: quoteError } = await supabase
      .from('quote_requests')
      .select(`
        *,
        quote_request_items (*)
      `)
      .eq('id', quoteRequestId)
      .single()

    if (quoteError) {
      console.error('Error fetching quote request:', quoteError)
      return new Response(
        JSON.stringify({ error: 'Quote request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch customer data separately if customer_id exists
    let customerData = null
    if (quoteRequest.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('company_name, contact_name, email, phone, address, city, country')
        .eq('id', quoteRequest.customer_id)
        .single()
      
      if (!customerError) {
        customerData = customer
      }
    }

    // Generate PDF content
    const pdfContent = await generateQuoteRequestPDF(quoteRequest, customerData)

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-request-${quoteRequest.quote_number || quoteRequest.id}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error in download-quote-request-pdf function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateQuoteRequestPDF(quoteRequest: any, customerData: any): Promise<Uint8Array> {
  // Import PDF generation library
  const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1')
  
  const pdfDoc = await PDFDocument.create()
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  
  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  
  // Header
  page.drawText('TRUST LINK FROZEN FOODS', {
    x: 50,
    y: height - 80,
    size: 20,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  page.drawText('Quote Request Details', {
    x: 50,
    y: height - 110,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  // Quote Request Information
  let yPosition = height - 150
  
  const drawField = (label: string, value: string, y: number) => {
    page.drawText(`${label}:`, {
      x: 50,
      y,
      size: 12,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    })
    page.drawText(value || 'N/A', {
      x: 200,
      y,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })
    return y - 25
  }
  
  yPosition = drawField('Quote Number', quoteRequest.quote_number || 'Generating...', yPosition)
  yPosition = drawField('Title', quoteRequest.title, yPosition)
  yPosition = drawField('Status', quoteRequest.status, yPosition)
  yPosition = drawField('Urgency', quoteRequest.urgency, yPosition)
  yPosition = drawField('Request Type', quoteRequest.request_type, yPosition)
  yPosition = drawField('Created Date', new Date(quoteRequest.created_at).toLocaleDateString(), yPosition)
  
  if (quoteRequest.expected_delivery_date) {
    yPosition = drawField('Expected Delivery', new Date(quoteRequest.expected_delivery_date).toLocaleDateString(), yPosition)
  }
  
  // Customer/Lead Information
  yPosition -= 20
  page.drawText('Customer/Lead Information', {
    x: 50,
    y: yPosition,
    size: 14,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  yPosition -= 30
  
  if (quoteRequest.request_type === 'lead') {
    yPosition = drawField('Company', quoteRequest.lead_company_name, yPosition)
    yPosition = drawField('Contact Name', quoteRequest.lead_contact_name, yPosition)
    yPosition = drawField('Email', quoteRequest.lead_email, yPosition)
    yPosition = drawField('Phone', quoteRequest.lead_phone, yPosition)
    yPosition = drawField('Country', quoteRequest.lead_country, yPosition)
    yPosition = drawField('Industry', quoteRequest.lead_industry, yPosition)
  } else if (customerData) {
    yPosition = drawField('Company', customerData.company_name, yPosition)
    yPosition = drawField('Contact Name', customerData.contact_name, yPosition)
    yPosition = drawField('Email', customerData.email, yPosition)
    yPosition = drawField('Phone', customerData.phone, yPosition)
    yPosition = drawField('Address', customerData.address, yPosition)
    yPosition = drawField('City', customerData.city, yPosition)
    yPosition = drawField('Country', customerData.country, yPosition)
  }
  
  // Message
  if (quoteRequest.message) {
    yPosition -= 20
    page.drawText('Message', {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30
    
    // Word wrap for message
    const words = quoteRequest.message.split(' ')
    let line = ''
    const maxWidth = 500
    
    for (const word of words) {
      const testLine = line + word + ' '
      const testWidth = timesRomanFont.widthOfTextAtSize(testLine, 12)
      
      if (testWidth > maxWidth && line !== '') {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        })
        line = word + ' '
        yPosition -= 20
      } else {
        line = testLine
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= 40
    }
  }
  
  // Requested Items Table
  if (quoteRequest.quote_request_items && quoteRequest.quote_request_items.length > 0) {
    page.drawText('Requested Items', {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30
    
    // Table headers
    const tableHeaders = ['Product Name', 'Quantity', 'Unit', 'Specifications', 'Grade']
    const columnWidths = [150, 60, 50, 150, 100]
    let xPosition = 50
    
    tableHeaders.forEach((header, index) => {
      page.drawText(header, {
        x: xPosition,
        y: yPosition,
        size: 10,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      })
      xPosition += columnWidths[index]
    })
    
    // Draw header line
    page.drawLine({
      start: { x: 50, y: yPosition - 5 },
      end: { x: 510, y: yPosition - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    
    yPosition -= 25
    
    // Table rows
    quoteRequest.quote_request_items.forEach((item: any) => {
      xPosition = 50
      const rowData = [
        item.product_name || '',
        item.quantity?.toString() || '',
        item.unit || '',
        item.specifications || '-',
        item.preferred_grade || '-'
      ]
      
      rowData.forEach((data, index) => {
        const text = data.length > 20 ? data.substring(0, 17) + '...' : data
        page.drawText(text, {
          x: xPosition,
          y: yPosition,
          size: 9,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        })
        xPosition += columnWidths[index]
      })
      
      yPosition -= 20
    })
  }
  
  // Admin Notes
  if (quoteRequest.admin_notes) {
    yPosition -= 20
    page.drawText('Admin Notes', {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30
    
    // Word wrap for admin notes
    const words = quoteRequest.admin_notes.split(' ')
    let line = ''
    const maxWidth = 500
    
    for (const word of words) {
      const testLine = line + word + ' '
      const testWidth = timesRomanFont.widthOfTextAtSize(testLine, 12)
      
      if (testWidth > maxWidth && line !== '') {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        })
        line = word + ' '
        yPosition -= 20
      } else {
        line = testLine
      }
    }
    
    if (line) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })
    }
  }
  
  // Footer
  page.drawText('Generated by Trust Link Frozen Foods CRM System', {
    x: 50,
    y: 50,
    size: 8,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  })
  
  page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
    x: 400,
    y: 50,
    size: 8,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  })
  
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}