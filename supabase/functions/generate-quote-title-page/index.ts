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
    
    let yPosition = height - 40

    // Top section - Company logos and info
    const leftColumn = 50
    const rightColumn = width - 250

    // Trust Link Ventures (left)
    if (trustLinkLogo) {
      const logoScale = 0.5
      const logoWidth = trustLinkLogo.width * logoScale
      const logoHeight = trustLinkLogo.height * logoScale
      
      page.drawImage(trustLinkLogo, {
        x: leftColumn,
        y: yPosition - logoHeight,
        width: logoWidth,
        height: logoHeight,
      })
      yPosition -= logoHeight + 5
    }
    
    page.drawText('Trust Link Ventures Limited', {
      x: leftColumn,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    yPosition -= 12
    
    page.drawText('Enyedado Coldstore Premises', {
      x: leftColumn,
      y: yPosition,
      size: 8,
      font: regularFont,
      color: mediumGray,
    })
    yPosition -= 10
    
    page.drawText('Afko Junction Box 709, Adabraka Ghana', {
      x: leftColumn,
      y: yPosition,
      size: 8,
      font: regularFont,
      color: mediumGray,
    })


    // QUOTE title (centered, higher position)
    yPosition = height - 110
    const quoteTitle = 'QUOTE'
    const titleWidth = boldFont.widthOfTextAtSize(quoteTitle, 32)
    page.drawText(quoteTitle, {
      x: (width - titleWidth) / 2,
      y: yPosition,
      size: 32,
      font: boldFont,
      color: darkGray,
    })

    // Quote details (top right - Quote # and Date only)
    let detailsY = height - 40
    const quoteDetailsX = width - 200
    
    page.drawText('Quote #', {
      x: quoteDetailsX,
      y: detailsY,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    page.drawText(quote.quote_number || '', {
      x: quoteDetailsX + 80,
      y: detailsY,
      size: 10,
      font: regularFont,
      color: darkGray,
    })

    detailsY -= 20

    page.drawText('Quote Date', {
      x: quoteDetailsX,
      y: detailsY,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    const quoteDate = quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
    page.drawText(quoteDate, {
      x: quoteDetailsX + 80,
      y: detailsY,
      size: 10,
      font: regularFont,
      color: darkGray,
    })

    // Bill To section (positioned directly below Trust Link address)
    yPosition -= 20
    const billToX = leftColumn

    page.drawText('Bill To', {
      x: billToX,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: darkGray,
    })

    yPosition -= 15

    // Customer name
    const customerName = quote.customers?.company_name || 'Customer Name'
    page.drawText(customerName, {
      x: billToX,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: black,
    })

    yPosition -= 12

    // Customer address
    if (deliveryAddress) {
      const addressLine1 = deliveryAddress.street_address || ''
      page.drawText(addressLine1, {
        x: billToX,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: mediumGray,
      })
      yPosition -= 10

      const addressLine2 = `${deliveryAddress.city || ''}, ${deliveryAddress.region || ''}`
      page.drawText(addressLine2, {
        x: billToX,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: mediumGray,
      })
    }

    yPosition -= 40

    // Items table
    const tableTop = yPosition
    const col1X = leftColumn
    const col2X = leftColumn + 80
    const col3X = width - 150
    const col4X = width - 80

    // Table header background
    page.drawRectangle({
      x: leftColumn - 5,
      y: tableTop - 2,
      width: width - 2 * leftColumn + 10,
      height: 18,
      color: lightBlue,
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
    page.drawLine({
      start: { x: leftColumn - 5, y: yPosition + 5 },
      end: { x: width - leftColumn + 5, y: yPosition + 5 },
      thickness: 1,
      color: primaryBlue,
    })

    // Items
    let subtotal = 0
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

      const amount = Number(item.total_price || 0).toFixed(2)
      page.drawText(`$${amount}`, {
        x: col4X,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: black,
      })

      subtotal += Number(item.total_price || 0)
      yPosition -= 20
    }

    // Horizontal line after items
    page.drawLine({
      start: { x: leftColumn - 5, y: yPosition + 15 },
      end: { x: width - leftColumn + 5, y: yPosition + 15 },
      thickness: 1,
      color: primaryBlue,
    })

    yPosition -= 10

    // Subtotal
    page.drawText('Subtotal', {
      x: col3X - 60,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: black,
    })
    page.drawText(`$${subtotal.toFixed(2)}`, {
      x: col4X,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: black,
    })

    yPosition -= 15

    // Sales Tax (if applicable)
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
      page.drawText(`$${tax.toFixed(2)}`, {
        x: col4X,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: black,
      })
      yPosition -= 15
    }

    // Horizontal line before total
    page.drawLine({
      start: { x: col3X - 70, y: yPosition + 10 },
      end: { x: width - leftColumn + 5, y: yPosition + 10 },
      thickness: 1,
      color: primaryBlue,
    })

    yPosition -= 5

    // Total with background (fixed alignment)
    page.drawRectangle({
      x: col3X - 70,
      y: yPosition - 2,
      width: (width - leftColumn + 5) - (col3X - 70),
      height: 18,
      color: lightBlue,
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
    page.drawText(`$${Number(total).toFixed(2)}`, {
      x: col4X,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: black,
    })

    // Horizontal line after total
    yPosition -= 20
    page.drawLine({
      start: { x: col3X - 70, y: yPosition + 5 },
      end: { x: width - leftColumn + 5, y: yPosition + 5 },
      thickness: 2,
      color: primaryBlue,
    })

    yPosition -= 30

    // Terms and Conditions
    page.drawText('Terms and Conditions', {
      x: leftColumn,
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
        x: leftColumn,
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
      start: { x: leftColumn - 5, y: footerY + 20 },
      end: { x: width - leftColumn + 5, y: footerY + 20 },
      thickness: 1,
      color: primaryBlue,
    })

    const footerText = 'This is an official quotation from Trust Link Ventures Limited. All prices are subject to the terms and conditions stated above.'
    const footerText2 = 'For any queries, please contact us at the address provided.'
    
    page.drawText(footerText, {
      x: leftColumn,
      y: footerY,
      size: 8,
      font: regularFont,
      color: darkGray,
    })
    
    page.drawText(footerText2, {
      x: leftColumn,
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
