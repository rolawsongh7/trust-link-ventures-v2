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
    console.log('Starting PDF generation for quote request...')
    
    // Use SERVICE_ROLE_KEY to bypass RLS policies
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { quoteRequestId } = await req.json()
    console.log('Quote Request ID:', quoteRequestId)

    if (!quoteRequestId) {
      return new Response(
        JSON.stringify({ error: 'Quote request ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch quote request details (separate from items to avoid nested query issues)
    console.log('Fetching quote request details...')
    const { data: quoteRequest, error: quoteError } = await supabase
      .from('quote_requests')
      .select('*')
      .eq('id', quoteRequestId)
      .maybeSingle()

    if (quoteError) {
      console.error('Error fetching quote request:', quoteError)
      return new Response(
        JSON.stringify({ error: 'Database error', details: quoteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!quoteRequest) {
      console.error('Quote request not found for ID:', quoteRequestId)
      return new Response(
        JSON.stringify({ error: 'Quote request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Quote request found:', quoteRequest.quote_number)

    // Fetch quote request items separately
    console.log('Fetching quote request items...')
    const { data: items, error: itemsError } = await supabase
      .from('quote_request_items')
      .select('*')
      .eq('quote_request_id', quoteRequestId)

    if (itemsError) {
      console.error('Error fetching quote request items:', itemsError)
    } else {
      console.log('Found items:', items?.length || 0)
      quoteRequest.quote_request_items = items || []
    }

    // Fetch customer data separately if customer_id exists
    let customerData = null
    if (quoteRequest.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('company_name, contact_name, email, phone, address, city, country')
        .eq('id', quoteRequest.customer_id)
        .maybeSingle()
      
      if (!customerError && customer) {
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
  console.log('Starting PDF generation...')
  
  // Import PDF generation library
  const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1')
  
  const pdfDoc = await PDFDocument.create()
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  
  console.log('Fonts embedded successfully')
  
  let currentPage = pdfDoc.addPage()
  let { width, height } = currentPage.getSize()
  const MARGIN_BOTTOM = 80 // Reserve space for footer
  
  // Helper function to check if we need a new page
  const checkPageOverflow = (yPos: number) => {
    if (yPos < MARGIN_BOTTOM) {
      console.log('Adding new page, current Y:', yPos)
      currentPage = pdfDoc.addPage()
      const pageSize = currentPage.getSize()
      return pageSize.height - 80 // Return new starting Y position
    }
    return yPos
  }
  
  // Header
  console.log('Drawing header...')
  currentPage.drawText('TRUST LINK FROZEN FOODS', {
    x: 50,
    y: height - 80,
    size: 20,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  currentPage.drawText('Quote Request Details', {
    x: 50,
    y: height - 110,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  
  // Quote Request Information
  let yPosition = height - 150
  
  const drawField = (label: string, value: string, y: number) => {
    y = checkPageOverflow(y)
    console.log(`Drawing field: ${label}, Y: ${y}`)
    currentPage.drawText(`${label}:`, {
      x: 50,
      y,
      size: 12,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    })
    currentPage.drawText(value || 'N/A', {
      x: 200,
      y,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })
    return y - 25
  }
  
  console.log('Drawing quote request fields...')
  yPosition = drawField('Quote Number', quoteRequest.quote_number || 'Pending', yPosition)
  yPosition = drawField('Title', quoteRequest.title, yPosition)
  yPosition = drawField('Status', quoteRequest.status, yPosition)
  yPosition = drawField('Urgency', quoteRequest.urgency, yPosition)
  yPosition = drawField('Request Type', quoteRequest.request_type, yPosition)
  yPosition = drawField('Created Date', new Date(quoteRequest.created_at).toLocaleDateString(), yPosition)
  
  if (quoteRequest.expected_delivery_date) {
    yPosition = drawField('Expected Delivery', new Date(quoteRequest.expected_delivery_date).toLocaleDateString(), yPosition)
  }
  
  // Customer/Lead Information
  console.log('Drawing customer/lead information...')
  yPosition -= 20
  yPosition = checkPageOverflow(yPosition)
  currentPage.drawText('Customer/Lead Information', {
    x: 50,
    y: yPosition,
    size: 14,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  })
  yPosition -= 30
  
  // Check if lead fields are populated (regardless of request_type)
  if (quoteRequest.lead_company_name || quoteRequest.lead_email) {
    yPosition = drawField('Company', quoteRequest.lead_company_name || 'N/A', yPosition)
    yPosition = drawField('Contact Name', quoteRequest.lead_contact_name || 'N/A', yPosition)
    yPosition = drawField('Email', quoteRequest.lead_email || 'N/A', yPosition)
    if (quoteRequest.lead_phone) {
      yPosition = drawField('Phone', quoteRequest.lead_phone, yPosition)
    }
    if (quoteRequest.lead_country) {
      yPosition = drawField('Country', quoteRequest.lead_country, yPosition)
    }
    if (quoteRequest.lead_industry) {
      yPosition = drawField('Industry', quoteRequest.lead_industry, yPosition)
    }
  } else if (customerData) {
    yPosition = drawField('Company', customerData.company_name || 'N/A', yPosition)
    yPosition = drawField('Contact Name', customerData.contact_name || 'N/A', yPosition)
    yPosition = drawField('Email', customerData.email || 'N/A', yPosition)
    if (customerData.phone) {
      yPosition = drawField('Phone', customerData.phone, yPosition)
    }
    if (customerData.address) {
      yPosition = drawField('Address', customerData.address, yPosition)
    }
    if (customerData.city) {
      yPosition = drawField('City', customerData.city, yPosition)
    }
    if (customerData.country) {
      yPosition = drawField('Country', customerData.country, yPosition)
    }
  }
  
  // Message
  if (quoteRequest.message) {
    console.log('Drawing message...')
    yPosition -= 20
    yPosition = checkPageOverflow(yPosition)
    currentPage.drawText('Message', {
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
        yPosition = checkPageOverflow(yPosition)
        currentPage.drawText(line, {
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
      yPosition = checkPageOverflow(yPosition)
      currentPage.drawText(line, {
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
    console.log('Drawing items table...')
    yPosition -= 20
    yPosition = checkPageOverflow(yPosition)
    currentPage.drawText('Requested Items', {
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
    
    yPosition = checkPageOverflow(yPosition)
    tableHeaders.forEach((header, index) => {
      currentPage.drawText(header, {
        x: xPosition,
        y: yPosition,
        size: 10,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      })
      xPosition += columnWidths[index]
    })
    
    // Draw header line
    currentPage.drawLine({
      start: { x: 50, y: yPosition - 5 },
      end: { x: 510, y: yPosition - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    
    yPosition -= 25
    
    // Table rows
    quoteRequest.quote_request_items.forEach((item: any, idx: number) => {
      console.log(`Drawing item ${idx + 1}/${quoteRequest.quote_request_items.length}`)
      yPosition = checkPageOverflow(yPosition)
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
        currentPage.drawText(text, {
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
    console.log('Drawing admin notes...')
    yPosition -= 20
    yPosition = checkPageOverflow(yPosition)
    currentPage.drawText('Admin Notes', {
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
        yPosition = checkPageOverflow(yPosition)
        currentPage.drawText(line, {
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
      yPosition = checkPageOverflow(yPosition)
      currentPage.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })
    }
  }
  
  // Footer on all pages
  console.log('Adding footers to all pages...')
  const pages = pdfDoc.getPages()
  pages.forEach((pg) => {
    const pgHeight = pg.getSize().height
    pg.drawText('Generated by Trust Link Frozen Foods CRM System', {
      x: 50,
      y: 50,
      size: 8,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    })
    
    pg.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: 400,
      y: 50,
      size: 8,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    })
  })
  
  console.log('Saving PDF...')
  const pdfBytes = await pdfDoc.save()
  console.log('PDF generated successfully, size:', pdfBytes.length, 'bytes')
  return pdfBytes
}