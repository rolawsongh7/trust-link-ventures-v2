import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { quoteId } = await req.json()

    console.log('Received quoteId:', quoteId)

    if (!quoteId) {
      console.error('Quote ID is missing')
      throw new Error('Quote ID is required')
    }

    // Fetch quote with all related data
    console.log('Fetching quote with ID:', quoteId)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers (
          id,
          company_name,
          contact_name,
          email,
          phone
        )
      `)
      .eq('id', quoteId)
      .maybeSingle()

    if (quoteError) {
      console.error('Database error:', quoteError)
      throw quoteError
    }

    if (!quote) {
      console.error('Quote not found for ID:', quoteId)
      throw new Error('Quote not found')
    }

    // Fetch quote items
    const { data: quoteItems, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true })

    if (itemsError) {
      console.error('Error fetching quote items:', itemsError)
      throw itemsError
    }

    // Fetch customer address if delivery_address_id exists
    let deliveryAddress = null
    if (quote.customer_id) {
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', quote.customer_id)
        .eq('is_default', true)
        .maybeSingle()
      
      deliveryAddress = addresses
    }

    console.log('Quote fetched successfully with items')

    // Generate the full quote PDF
    const quotePdf = await generateQuotePDF(quote, quoteItems || [], deliveryAddress)
    console.log('Quote PDF generated, size:', quotePdf.length, 'bytes')

    // Generate filename for the final PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const finalFileName = `${quote.quote_number}-${timestamp}.pdf`

    // Upload the PDF to storage
    console.log('Uploading final quote PDF to storage')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(`final-quotes/${finalFileName}`, quotePdf, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading final PDF:', uploadError)
      throw uploadError
    }

    // Get public URL for the final PDF
    const { data: { publicUrl } } = supabase.storage
      .from('quotes')
      .getPublicUrl(uploadData.path);
    
    // Update the quote record with the new file URL and set status to 'sent'
    console.log('Updating quote record with final PDF URL:', publicUrl)
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ 
        final_file_url: publicUrl,
        status: 'sent'
      })
      .eq('id', quoteId)

    if (updateError) {
      console.error('Error updating quote record:', updateError)
      throw updateError
    }

    console.log('Quote PDF generated successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Quote generated successfully and ready for review',
        file_url: publicUrl
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function generateQuotePDF(quote: any, items: any[], deliveryAddress: any): Promise<Uint8Array> {
  console.log('=== STARTING generateQuotePDF function ===')
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    const pdfDoc = await PDFDocument.create()
    console.log('PDF document created successfully')
    
    const page = pdfDoc.addPage([612, 792]) // Standard letter size
    const { width, height } = page.getSize()
    console.log('Page added, dimensions:', width, 'x', height)
    
    // Load fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    console.log('Fonts loaded successfully')
    
    // Load company logos from Supabase storage
    let newGenLogo = null;
    let trustLinkLogo = null;
    
    try {
      const newGenLogoResponse = await supabase.storage
        .from('logos')
        .download('New_gen_link.png');
      
      if (newGenLogoResponse.data) {
        const newGenLogoBytes = await newGenLogoResponse.data.arrayBuffer();
        newGenLogo = await pdfDoc.embedPng(new Uint8Array(newGenLogoBytes));
        console.log("New Gen Link logo loaded successfully");
      }
    } catch (error) {
      console.log("Failed to load New Gen Link logo:", error);
    }

    try {
      const trustLinkLogoResponse = await supabase.storage
        .from('logos')
        .download('trust_link_ventures.png');
      
      if (trustLinkLogoResponse.data) {
        const trustLinkLogoBytes = await trustLinkLogoResponse.data.arrayBuffer();
        trustLinkLogo = await pdfDoc.embedPng(new Uint8Array(trustLinkLogoBytes));
        console.log("Trust Link logo loaded successfully");
      }
    } catch (error) {
      console.log("Failed to load Trust Link logo:", error);
    }
    
    // Colors
    const darkGray = rgb(0.2, 0.2, 0.2)
    const mediumGray = rgb(0.4, 0.4, 0.4)
    const lightGray = rgb(0.9, 0.9, 0.9)
    const black = rgb(0, 0, 0)
    const primaryBlue = rgb(0.2, 0.4, 0.8)
    const lightBlue = rgb(0.9, 0.95, 1.0)
    
    // Page layout constants - measured, not magic numbers
    const MARGIN_X = 50
    const MARGIN_Y = 40
    const CONTENT_WIDTH = width - (2 * MARGIN_X)  // 512 for letter size
    
    // Two-column layout
    const RIGHT_COL_WIDTH = 260  // Enough for Quote # + Date + Bill To
    const LEFT_COL_WIDTH = CONTENT_WIDTH - RIGHT_COL_WIDTH - 30  // 30px gap
    const LEFT_COL_X = MARGIN_X
    const RIGHT_COL_X = width - MARGIN_X - RIGHT_COL_WIDTH
    
    // Vertical starting position
    const headerStartY = height - MARGIN_Y

    // ===== LEFT COLUMN: Logo + QUOTE heading + Supplier info =====
    let leftColY = headerStartY
    
    // Trust Link logo
    if (trustLinkLogo) {
      const logoScale = 0.5
      const logoWidth = trustLinkLogo.width * logoScale
      const logoHeight = trustLinkLogo.height * logoScale
      
      page.drawImage(trustLinkLogo, {
        x: LEFT_COL_X,
        y: leftColY - logoHeight,
        width: logoWidth,
        height: logoHeight,
      })
      leftColY -= logoHeight + 8
    }
    
    // "QUOTE" heading - CENTERED at top
    const quoteHeadingText = 'QUOTE'
    const quoteHeadingWidth = boldFont.widthOfTextAtSize(quoteHeadingText, 28)
    const quoteHeadingX = (width - quoteHeadingWidth) / 2
    
    page.drawText(quoteHeadingText, {
      x: quoteHeadingX,
      y: leftColY,
      size: 28,
      font: boldFont,
      color: primaryBlue,
    })
    leftColY -= 35
    
    // Trust Link company info
    const supplierInfoSize = 9
    const supplierInfoLineHeight = 11
    
    page.drawText('Trust Link Ventures Limited', {
      x: LEFT_COL_X,
      y: leftColY,
      size: supplierInfoSize,
      font: boldFont,
      color: darkGray,
    })
    leftColY -= supplierInfoLineHeight
    
    page.drawText('Enyedado Coldstore Premises', {
      x: LEFT_COL_X,
      y: leftColY,
      size: 8,
      font: regularFont,
      color: mediumGray,
    })
    leftColY -= 10
    
    page.drawText('Afko Junction Box 709, Adabraka Ghana', {
      x: LEFT_COL_X,
      y: leftColY,
      size: 8,
      font: regularFont,
      color: mediumGray,
    })
    leftColY -= 10
    
    page.drawText('Email: info@trustlinkcompany.com', {
      x: LEFT_COL_X,
      y: leftColY,
      size: 8,
      font: regularFont,
      color: mediumGray,
    })
    leftColY -= 10
    
    // Store where left column ended
    const leftColEndY = leftColY

    // ===== RIGHT COLUMN: Quote metadata (stacked vertically, RIGHT-ALIGNED) =====
    let rightColY = headerStartY
    
    // Quote # - right-aligned
    const quoteNumberLabel = 'Quote #:'
    const quoteNumberValue = quote.quote_number || ''
    const quoteNumberLabelWidth = boldFont.widthOfTextAtSize(quoteNumberLabel, 10)
    const quoteNumberValueWidth = regularFont.widthOfTextAtSize(quoteNumberValue, 10)
    const quoteNumberTotalWidth = quoteNumberLabelWidth + 5 + quoteNumberValueWidth
    
    page.drawText(quoteNumberLabel, {
      x: width - MARGIN_X - quoteNumberTotalWidth,
      y: rightColY,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    
    page.drawText(quoteNumberValue, {
      x: width - MARGIN_X - quoteNumberValueWidth,
      y: rightColY,
      size: 10,
      font: regularFont,
      color: darkGray,
    })
    
    rightColY -= 15  // Move down for Date
    
    // Date (directly below Quote #) - right-aligned
    const dateLabel = 'Date:'
    const dateValue = quote.created_at 
      ? new Date(quote.created_at).toLocaleDateString('en-GB') 
      : new Date().toLocaleDateString('en-GB')
    const dateLabelWidth = boldFont.widthOfTextAtSize(dateLabel, 10)
    const dateValueWidth = regularFont.widthOfTextAtSize(dateValue, 10)
    const dateTotalWidth = dateLabelWidth + 5 + dateValueWidth
    
    page.drawText(dateLabel, {
      x: width - MARGIN_X - dateTotalWidth,
      y: rightColY,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    
    page.drawText(dateValue, {
      x: width - MARGIN_X - dateValueWidth,
      y: rightColY,
      size: 10,
      font: regularFont,
      color: darkGray,
    })
    
    rightColY -= 50  // Larger gap before Bill To card

    // ===== RIGHT COLUMN: Bill To card =====
    const billToCardX = RIGHT_COL_X
    const billToCardY = rightColY
    const billToCardWidth = RIGHT_COL_WIDTH
    const billToCardPadding = 12
    const estimatedCardHeight = 100
    
    // Draw card background FIRST (before text content)
    page.drawRectangle({
      x: billToCardX,
      y: billToCardY - estimatedCardHeight,
      width: billToCardWidth,
      height: estimatedCardHeight,
      color: rgb(1, 1, 1),  // white background
      borderColor: lightGray,
      borderWidth: 1,
    })
    
    let billToContentY = billToCardY - 15
    
    // "Bill To" title (drawn on top of rectangle)
    page.drawText('Bill To', {
      x: billToCardX + billToCardPadding,
      y: billToContentY,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    
    billToContentY -= 15
    
    // Customer company name
    const customerName = quote.customers?.company_name || 'Customer Name'
    page.drawText(customerName, {
      x: billToCardX + billToCardPadding,
      y: billToContentY,
      size: 9,
      font: boldFont,
      color: black,
    })
    billToContentY -= 12
    
    // Contact person
    if (quote.customers?.contact_name) {
      page.drawText(quote.customers.contact_name, {
        x: billToCardX + billToCardPadding,
        y: billToContentY,
        size: 8,
        font: regularFont,
        color: mediumGray,
      })
      billToContentY -= 11
    }
    
    // Address lines
    if (deliveryAddress) {
      const addressLine1 = deliveryAddress.street_address || ''
      page.drawText(addressLine1, {
        x: billToCardX + billToCardPadding,
        y: billToContentY,
        size: 8,
        font: regularFont,
        color: mediumGray,
      })
      billToContentY -= 10
      
      const addressLine2 = `${deliveryAddress.city || ''}, ${deliveryAddress.region || ''}`
      page.drawText(addressLine2, {
        x: billToCardX + billToCardPadding,
        y: billToContentY,
        size: 8,
        font: regularFont,
        color: mediumGray,
      })
      billToContentY -= 11
    }
    
    // Email
    if (quote.customers?.email || quote.customer_email) {
      const emailText = `Email: ${quote.customers?.email || quote.customer_email}`
      page.drawText(emailText, {
        x: billToCardX + billToCardPadding,
        y: billToContentY,
        size: 8,
        font: regularFont,
        color: mediumGray,
      })
      billToContentY -= 10
    }
    
    // Store where right column ended
    const rightColEndY = billToContentY - 5
    
    // ===== MAIN CONTENT: Calculate start position (below both columns) =====
    const mainContentStartY = Math.min(leftColEndY, rightColEndY) - 40  // 40px gap
    let yPosition = mainContentStartY

    // ===== ITEMS TABLE: Full width =====
    const tableTop = yPosition
    const tableLeft = MARGIN_X
    const tableWidth = CONTENT_WIDTH  // Full width, no column restrictions
    const tableRight = tableLeft + tableWidth
    
    // Column positions within table
    const col1X = tableLeft + 10      // QTY
    const col2X = tableLeft + 80      // Description
    const col3X = tableRight - 230    // Unit Price
    const col4X = tableRight - 120    // Amount (right-aligned)

    // Table header background
    page.drawRectangle({
      x: tableLeft,
      y: tableTop - 2,
      width: tableWidth,
      height: 18,
      color: primaryBlue,
      opacity: 0.1,
    })

    // Table headers
    page.drawText('QTY', {
      x: col1X,
      y: tableTop,
      size: 10,
      font: boldFont,
      color: black,
    })

    page.drawText('Description', {
      x: col2X,
      y: tableTop,
      size: 10,
      font: boldFont,
      color: black,
    })

    page.drawText('Unit Price', {
      x: col3X,
      y: tableTop,
      size: 10,
      font: boldFont,
      color: black,
    })

    page.drawText('Amount', {
      x: col4X,
      y: tableTop,
      size: 10,
      font: boldFont,
      color: black,
    })

    // Horizontal line below header
    yPosition = tableTop - 20
    const headerLineY = yPosition + 5
    page.drawLine({
      start: { x: tableLeft, y: headerLineY },
      end: { x: tableRight, y: headerLineY },
      thickness: 1,
      color: primaryBlue,
      opacity: 0.3,
    })

    yPosition -= 12

    // Items - Get currency symbol (using text codes for WinAnsi compatibility)
    const currencySymbol = quote.currency === 'GHS' ? 'GHS ' : quote.currency === 'EUR' ? 'EUR ' : quote.currency === 'GBP' ? 'GBP ' : quote.currency === 'USD' ? 'USD ' : '$'
    let subtotal = 0
    const itemsStartY = yPosition
    
    for (const item of items) {
      page.drawText(String(item.quantity || '1.00'), {
        x: col1X,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: black,
      })

      const description = item.product_name || ''
      page.drawText(description.substring(0, 40), {
        x: col2X,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: black,
      })

      const unitPrice = Number(item.unit_price || 0).toFixed(2)
      page.drawText(unitPrice, {
        x: col3X,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: black,
      })

      // Right-align amount values
      const amount = Number(item.total_price || 0).toFixed(2)
      const amountText = `${currencySymbol}${amount}`
      const amountWidth = regularFont.widthOfTextAtSize(amountText, 9)
      page.drawText(amountText, {
        x: tableRight - amountWidth - 10,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: black,
      })

      subtotal += Number(item.total_price || 0)
      yPosition -= 22
    }
    
    const itemsEndY = yPosition

    // Draw table borders (complete grid)
    // Top border
    page.drawLine({
      start: { x: tableLeft, y: tableTop + 16 },
      end: { x: tableRight, y: tableTop + 16 },
      thickness: 0.5,
      color: lightGray,
    })
    
    // Bottom border after items
    const itemsBottomY = yPosition + 17
    page.drawLine({
      start: { x: tableLeft, y: itemsBottomY },
      end: { x: tableRight, y: itemsBottomY },
      thickness: 1,
      color: primaryBlue,
      opacity: 0.3,
    })
    
    // Left border
    page.drawLine({
      start: { x: tableLeft, y: tableTop + 16 },
      end: { x: tableLeft, y: itemsBottomY },
      thickness: 0.5,
      color: lightGray,
    })
    
    // Right border
    page.drawLine({
      start: { x: tableRight, y: tableTop + 16 },
      end: { x: tableRight, y: itemsBottomY },
      thickness: 0.5,
      color: lightGray,
    })
    
    // Vertical column separators
    // Between QTY and Description
    page.drawLine({
      start: { x: col2X - 10, y: tableTop + 16 },
      end: { x: col2X - 10, y: itemsBottomY },
      thickness: 0.5,
      color: lightGray,
    })
    
    // Between Description and Unit Price
    page.drawLine({
      start: { x: col3X - 10, y: tableTop + 16 },
      end: { x: col3X - 10, y: itemsBottomY },
      thickness: 0.5,
      color: lightGray,
    })
    
    // Between Unit Price and Amount
    page.drawLine({
      start: { x: col4X - 10, y: tableTop + 16 },
      end: { x: col4X - 10, y: itemsBottomY },
      thickness: 0.5,
      color: lightGray,
    })

    yPosition -= 15

    // Subtotal (right-aligned)
    page.drawText('Subtotal', {
      x: col3X - 60,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: black,
    })
    const subtotalText = `${currencySymbol}${subtotal.toFixed(2)}`
    const subtotalWidth = regularFont.widthOfTextAtSize(subtotalText, 10)
    page.drawText(subtotalText, {
      x: tableRight - subtotalWidth - 10,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: black,
    })

    yPosition -= 15

    // Sales Tax (if applicable) - right-aligned
    const taxRate = 0 // Assuming no tax for now
    const tax = subtotal * taxRate
    if (tax > 0) {
      page.drawText(`Sales Tax (${(taxRate * 100).toFixed(0)}%)`, {
        x: col3X - 60,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: black,
      })
      const taxText = `${currencySymbol}${tax.toFixed(2)}`
      const taxWidth = regularFont.widthOfTextAtSize(taxText, 10)
      page.drawText(taxText, {
        x: tableRight - taxWidth - 10,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: black,
      })
      yPosition -= 15
    }

    // Horizontal line before total
    page.drawLine({
      start: { x: tableLeft, y: yPosition + 10 },
      end: { x: tableRight, y: yPosition + 10 },
      thickness: 1,
      color: primaryBlue,
      opacity: 0.3,
    })

    yPosition -= 5

    // Total with background (right-aligned)
    page.drawRectangle({
      x: tableLeft,
      y: yPosition - 2,
      width: tableWidth,
      height: 18,
      color: primaryBlue,
      opacity: 0.1,
    })

    const total = quote.total_amount || (subtotal + tax)
    const currency = quote.currency || 'USD'
    page.drawText(`Total (${currency})`, {
      x: col3X - 60,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: black,
    })
    const totalText = `${currencySymbol}${Number(total).toFixed(2)}`
    const totalWidth = boldFont.widthOfTextAtSize(totalText, 11)
    page.drawText(totalText, {
      x: tableRight - totalWidth - 10,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: black,
    })

    // Horizontal line after total
    yPosition -= 20
    page.drawLine({
      start: { x: tableLeft, y: yPosition + 5 },
      end: { x: tableRight, y: yPosition + 5 },
      thickness: 2,
      color: primaryBlue,
      opacity: 0.3,
    })

    yPosition -= 30

    // Terms and Conditions
    page.drawText('Terms and Conditions', {
      x: MARGIN_X,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: darkGray,
    })

    yPosition -= 15

    const terms = quote.terms || 'Payment is due upon receipt.\nPlease make payments to Trust Link Ventures Limited.'
    const termsLines = terms.split('\n')
    for (const line of termsLines) {
      page.drawText(line, {
        x: MARGIN_X,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: mediumGray,
      })
      yPosition -= 12
    }

    // Add official footer statement
    const footerY = 60
    page.drawLine({
      start: { x: tableLeft, y: footerY + 20 },
      end: { x: tableRight, y: footerY + 20 },
      thickness: 1,
      color: primaryBlue,
    })

    const footerText = 'This is an official quotation from Trust Link Ventures Limited. All prices are subject to the terms and conditions stated above.'
    const footerText2 = 'For any queries, please contact us at the address provided.'
    
    page.drawText(footerText, {
      x: MARGIN_X,
      y: footerY,
      size: 8,
      font: regularFont,
      color: darkGray,
    })
    
    page.drawText(footerText2, {
      x: MARGIN_X,
      y: footerY - 12,
      size: 8,
      font: regularFont,
      color: darkGray,
    })

    console.log('PDF generation completed')
    return await pdfDoc.save()
  } catch (error) {
    console.error('Error generating quote PDF:', error)
    throw error
  }
}
