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

    // Fetch quote details with customer information
    console.log('Fetching quote with ID:', quoteId)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers:customer_id(*)
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

    console.log('Quote fetched successfully')

    console.log('About to generate title page PDF...')
    // Generate title page PDF
    const titlePagePdf = await generateTitlePagePDF(quote)
    console.log('Title page PDF generated, size:', titlePagePdf.length, 'bytes')
    
    let finalPdfBytes: Uint8Array

    if (quote.file_url) {
      // Extract the storage path from the full URL
      // URL format: https://...supabase.co/storage/v1/object/public/quotes/supplier-quotes/filename.pdf
      const urlParts = quote.file_url.split('/quotes/');
      const storagePath = urlParts.length > 1 ? urlParts[1] : quote.file_url.split('/').pop();
      console.log('Downloading original PDF from storage path:', storagePath);
      
      const { data: originalPdfData, error: downloadError } = await supabase.storage
        .from('quotes')
        .download(storagePath)

      if (downloadError) {
        console.error('Error downloading original PDF:', downloadError)
        // If original PDF can't be downloaded, just use the title page
        finalPdfBytes = titlePagePdf
      } else {
        console.log('Merging title page with original PDF')
        finalPdfBytes = await mergePDFs(titlePagePdf, new Uint8Array(await originalPdfData.arrayBuffer()))
      }
    } else {
      // No original PDF, just use the title page
      finalPdfBytes = titlePagePdf
    }

    // Generate filename for the final PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const finalFileName = `${quote.quote_number}-final-${timestamp}.pdf`

    // Upload the merged PDF to storage
    console.log('Uploading final PDF to storage')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(`final-quotes/${finalFileName}`, finalPdfBytes, {
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
    
    // Update the quote record with the new file URL
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

    console.log('Title page generated and merged successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Title page generated and merged with quote successfully',
        file_url: uploadData.path
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

function getSupplierData(supplierName: string | undefined) {
  const suppliers = {
    "J Marr (Seafoods) Limited": {
      name: "J Marr (Seafoods) Limited",
      address: "Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE",
      email: "seafoods@marsea.co.uk",
      phone: "+441482642302",
      logo: "J_marr.png"
    },
    "JAB Bros. Company LLC": {
      name: "JAB Bros. Company LLC",
      address: "12895 NE 14 Av, North Miami, FL, 22161, USA",
      email: "info@jab-bros.com@.ar",
      phone: "+54114732.0591",
      logo: "Jab_bros.png"
    },
    "Niah Foods Limited": {
      name: "Niah Foods Limited",
      address: "20-22 Wenlock Road, London, N1 7GU, UK",
      email: "liz@niahfoods.com",
      phone: "+44 7368356155",
      logo: "niah_foods.png"
    },
    "SEAPRO SAS": {
      name: "SEAPRO SAS",
      address: "5 rue du Moulinas, 66330 Cabestany, France",
      email: "dominique@seaprosas.com",
      phone: "+33 (0)251378686",
      logo: "seapro.png"
    },
    "AJC International": {
      name: "AJC International",
      address: "1000 Abernathy Road NE, Suite 600, Atlanta GA, 30328, USA",
      email: "customercare@ajc.com",
      phone: "+1 4042526750",
      logo: "ajc_international.jpeg"
    },
    "NOWACO": {
      name: "NOWACO",
      address: "NOWACO A/S Prinsengade 15, 9000 Aalborg, Denmark",
      email: "nowaco@nowaco.com",
      phone: "+45 7788 6100",
      logo: "nowaco.png"
    }
  }

  return suppliers[supplierName as keyof typeof suppliers] || {
    name: supplierName || 'Unknown Supplier',
    address: 'N/A',
    email: 'N/A',
    phone: null,
    logo: null
  }
}

async function generateTitlePagePDF(quote: any): Promise<Uint8Array> {
  console.log('=== STARTING generateTitlePagePDF function ===')
  
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
        .from('supplier-logos')
        .download('New_gen_link.png');
      
      if (newGenLogoResponse.data) {
        const newGenLogoBytes = await newGenLogoResponse.data.arrayBuffer();
        newGenLogo = await pdfDoc.embedPng(new Uint8Array(newGenLogoBytes));
        console.log("New Gen Link logo loaded successfully from storage");
      }
    } catch (error) {
      console.log("Failed to load New Gen Link logo from storage:", error);
    }

    try {
      console.log('Attempting to load Trust Link logo: trust_link_venetures (1).png')
      const trustLinkLogoResponse = await supabase.storage
        .from('supplier-logos')
        .download('trust_link_venetures (1).png');
      
      console.log('Trust Link logo response:', trustLinkLogoResponse)
      if (trustLinkLogoResponse.data) {
        const trustLinkLogoBytes = await trustLinkLogoResponse.data.arrayBuffer();
        trustLinkLogo = await pdfDoc.embedPng(new Uint8Array(trustLinkLogoBytes));
        console.log("Trust Link logo loaded successfully from storage - using updated version");
      } else {
        console.log("Trust Link logo response data is null");
      }
    } catch (error) {
      console.log("Failed to load Trust Link logo from storage:", error);
    }
    
    // Enhanced Colors & Visual Effects
    const primaryBlue = rgb(0.2, 0.4, 0.8)
    const accentTeal = rgb(0.0, 0.6, 0.6)
    const accentGold = rgb(0.9, 0.7, 0.2)
    const darkGray = rgb(0.3, 0.3, 0.3)
    const lightGray = rgb(0.6, 0.6, 0.6)
    const overlayBlue = rgb(0.2, 0.4, 0.8) // For transparency effects
    const backgroundGray = rgb(0.95, 0.95, 0.95)
    
    // Helper function for rounded rectangles
    const drawRoundedRectangle = (page: any, x: number, y: number, width: number, height: number, color: any, radius: number = 5) => {
      // Main rectangle
      page.drawRectangle({
        x: x + radius,
        y: y,
        width: width - 2 * radius,
        height: height,
        color: color,
      })
      
      // Left rectangle
      page.drawRectangle({
        x: x,
        y: y + radius,
        width: radius,
        height: height - 2 * radius,
        color: color,
      })
      
      // Right rectangle
      page.drawRectangle({
        x: x + width - radius,
        y: y + radius,
        width: radius,
        height: height - 2 * radius,
        color: color,
      })
      
      // Corner circles
      page.drawCircle({
        x: x + radius,
        y: y + radius,
        size: radius,
        color: color,
      })
      
      page.drawCircle({
        x: x + width - radius,
        y: y + radius,
        size: radius,
        color: color,
      })
      
      page.drawCircle({
        x: x + radius,
        y: y + height - radius,
        size: radius,
        color: color,
      })
      
      page.drawCircle({
        x: x + width - radius,
        y: y + height - radius,
        size: radius,
        color: color,
      })
    }
    
    let yPosition = height - 50

    // Enhanced title with gradient background effect
    const titleText = 'QUOTE'
    const titleWidth = titleText.length * 20 // Approximate width
    
    // Enhanced title with rounded corners
    const titleBoxX = (width - titleWidth - 40) / 2
    const titleBoxY = yPosition - 5
    const titleBoxWidth = titleWidth + 40
    const titleBoxHeight = 40
    
    // Add shadow effect for title background (rounded)
    drawRoundedRectangle(page, titleBoxX + 2, titleBoxY - 2, titleBoxWidth, titleBoxHeight, backgroundGray, 8)
    
    // Main title background (rounded)
    drawRoundedRectangle(page, titleBoxX, titleBoxY, titleBoxWidth, titleBoxHeight, accentTeal, 8)
    
    // Center text within the box
    page.drawText(titleText, {
      x: titleBoxX + (titleBoxWidth - titleWidth) / 2,
      y: titleBoxY + (titleBoxHeight - 32) / 2 + 8, // Center vertically
      size: 32,
      font: boldFont,
      color: rgb(1, 1, 1), // White text on colored background
    })

    // Enhanced blue stripe with gradient effect
    page.drawRectangle({
      x: 0,
      y: yPosition - 30,
      width: width,
      height: 8,
      color: primaryBlue,
    })
    
    // Add accent gold stripe for visual interest
    page.drawRectangle({
      x: 0,
      y: yPosition - 38,
      width: width,
      height: 3,
      color: accentGold,
    })

    yPosition -= 90

    // Add company logos and information
    const leftColumn = 70
    const rightColumn = 340
    const logoYPosition = yPosition + 30
    let leftYPos = logoYPosition - 70

    // Trust Link Ventures Limited (left side)
    if (trustLinkLogo) {
      console.log('Drawing Trust Link logo')
      const logoScale = 0.6496875
      const logoWidth = trustLinkLogo.width * logoScale
      const logoHeight = trustLinkLogo.height * logoScale
      
      page.drawImage(trustLinkLogo, {
        x: leftColumn,
        y: logoYPosition - logoHeight + 15,
        width: logoWidth,
        height: logoHeight,
      })
      
      page.drawText('Trust Link Ventures Limited', {
        x: leftColumn,
        y: logoYPosition - logoHeight - 5,
        size: 14,
        font: boldFont,
        color: darkGray,
      })
      
      leftYPos = logoYPosition - logoHeight - 25
      page.drawText('Enyedado Coldstore Premises', {
        x: leftColumn,
        y: leftYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      leftYPos -= 15
      page.drawText('Afko Junction Box 709', {
        x: leftColumn,
        y: leftYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      leftYPos -= 15
      page.drawText('Adabraka Ghana', {
        x: leftColumn,
        y: leftYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      leftYPos -= 15
      page.drawText('info@trustlinkventures.com', {
        x: leftColumn,
        y: leftYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      leftYPos -= 15
      page.drawText('+233 243131257', {
        x: leftColumn,
        y: leftYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
    }

    // New Gen Link LLC (right side)
    const rightColumnAdjusted = rightColumn + 60
    let rightYPos = logoYPosition
    if (newGenLogo) {
      console.log('Drawing New Gen Link logo')
      const logoScale = 0.15
      const logoWidth = newGenLogo.width * logoScale
      const logoHeight = newGenLogo.height * logoScale
      
      page.drawImage(newGenLogo, {
        x: rightColumnAdjusted,
        y: logoYPosition - logoHeight + 15,
        width: logoWidth,
        height: logoHeight,
      })
      
      page.drawText('New Gen Link LLC', {
        x: rightColumnAdjusted,
        y: logoYPosition - logoHeight - 5,
        size: 14,
        font: boldFont,
        color: darkGray,
      })
      
      rightYPos = logoYPosition - logoHeight - 25
      page.drawText('3240 Lone Tree Way Street', {
        x: rightColumnAdjusted,
        y: rightYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      rightYPos -= 15
      page.drawText('204-J Antioch, CA', {
        x: rightColumnAdjusted,
        y: rightYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      rightYPos -= 15
      page.drawText('94509 USA', {
        x: rightColumnAdjusted,
        y: rightYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })

      rightYPos -= 15
      page.drawText('newgentrustlinkllc@gmail.com', {
        x: rightColumnAdjusted,
        y: rightYPos,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
    }

    // Move to next section
    yPosition = Math.min(leftYPos, rightYPos) - 70

    // Quote Details Section
    const quote_date = new Date().toLocaleDateString()
    const valid_until = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'No expiry'
    
    const quoteNumberText = `Quote Number: ${quote.quote_number}`
    const quoteNumberWidth = quoteNumberText.length * 8
    const quoteBoxHeight = 18
    
    drawRoundedRectangle(page, leftColumn - 5, yPosition - 3, quoteNumberWidth + 10, quoteBoxHeight, accentGold, 5)
    
    page.drawText(quoteNumberText, {
      x: leftColumn,
      y: yPosition + (quoteBoxHeight - 14) / 2 - 3,
      size: 14,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    const dateText = `Date: ${quote_date}`
    const dateWidth = dateText.length * 7
    
    page.drawRectangle({
      x: rightColumnAdjusted - 5,
      y: yPosition - 2,
      width: dateWidth + 10,
      height: 16,
      color: backgroundGray,
    })
    
    page.drawText(dateText, {
      x: rightColumnAdjusted,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: primaryBlue,
    })

    yPosition -= 25

    page.drawText(`Title: ${quote.title}`, {
      x: leftColumn,
      y: yPosition,
      size: 12,
      font: regularFont,
      color: darkGray,
    })

    page.drawText(`Valid Until: ${valid_until}`, {
      x: rightColumnAdjusted,
      y: yPosition,
      size: 12,
      font: regularFont,
      color: darkGray,
    })

    // Supplier Information
    console.log('Supplier name from quote:', quote.suppliers?.name)
    const supplierData = getSupplierData(quote.suppliers?.name)
    console.log('Supplier data retrieved:', supplierData)
    
    // Load supplier logo from storage
    let supplierLogo = null
    if (supplierData.logo) {
      try {
        const supplierLogoResponse = await supabase.storage
          .from('supplier-logos')
          .download(supplierData.logo);
        
        if (supplierLogoResponse.data) {
          const supplierLogoBytes = await supplierLogoResponse.data.arrayBuffer();
          if (supplierData.logo.toLowerCase().includes('.png')) {
            supplierLogo = await pdfDoc.embedPng(new Uint8Array(supplierLogoBytes));
          } else if (supplierData.logo.toLowerCase().includes('.jpeg') || supplierData.logo.toLowerCase().includes('.jpg')) {
            supplierLogo = await pdfDoc.embedJpg(new Uint8Array(supplierLogoBytes));
          }
          console.log("Supplier logo loaded successfully from storage");
        }
      } catch (error) {
        console.log("Failed to load supplier logo from storage:", error);
      }
    }
    
    yPosition -= 60
    
    const supplierNameText = `Supplier: ${supplierData.name}`
    const supplierHeaderWidth = supplierNameText.length * 8 + 20
    const supplierBoxHeight = 22
    
    drawRoundedRectangle(page, leftColumn - 8, yPosition - 3, supplierHeaderWidth, supplierBoxHeight, backgroundGray, 5)
    drawRoundedRectangle(page, leftColumn - 10, yPosition - 1, supplierHeaderWidth, supplierBoxHeight, accentTeal, 5)
    
    page.drawText('S', {
      x: leftColumn - 5,
      y: yPosition + (supplierBoxHeight - 18) / 2 - 1,
      size: 18,
      font: boldFont,
      color: rgb(1, 1, 1),
    })
    
    page.drawText('upplier:', {
      x: leftColumn + 5,
      y: yPosition + (supplierBoxHeight - 12) / 2,
      size: 12,
      font: boldFont,
      color: rgb(1, 1, 1),
    })
    
    page.drawText(supplierData.name, {
      x: leftColumn + 65,
      y: yPosition + (supplierBoxHeight - 12) / 2,
      size: 12,
      font: regularFont,
      color: rgb(1, 1, 1),
    })

    // Add supplier logo on the right side if available
    if (supplierLogo) {
      console.log('Drawing supplier logo')
      let logoScale = 0.517569
      let logoX = width - 60
      
      // Supplier-specific logo adjustments
      const supplierName = supplierData.name;
      if (supplierName.includes('Niah Foods')) {
        logoScale = 0.414055
      } else if (supplierName.includes('NOWACO')) {
        logoScale = 0.103514
        logoX = width - 40
      } else if (supplierName.includes('JAB Bros')) {
        logoScale = 0.362299
        logoX = width - 50
      } else if (supplierName.includes('J Marr')) {
        logoScale = 0.621083
        logoX = width - 70
      } else if (supplierName.includes('SEAPRO SAS')) {
        logoScale = 0.414055
      }
      
      const logoWidth = supplierLogo.width * logoScale
      const logoHeight = supplierLogo.height * logoScale
      
      page.drawImage(supplierLogo, {
        x: logoX - logoWidth,
        y: yPosition - logoHeight + 15,
        width: logoWidth,
        height: logoHeight,
      })
    }

    yPosition -= 20
    page.drawText('Address:', {
      x: leftColumn,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    
    page.drawText(supplierData.address, {
      x: leftColumn + 70,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: darkGray,
    })

    yPosition -= 15
    page.drawText('Email:', {
      x: leftColumn,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: darkGray,
    })
    
    page.drawText(supplierData.email, {
      x: leftColumn + 70,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: darkGray,
    })

    if (supplierData.phone) {
      yPosition -= 15
      page.drawText('Phone:', {
        x: leftColumn,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      })
      
      page.drawText(supplierData.phone, {
        x: leftColumn + 70,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
    }

    yPosition -= 60

    // Customer Information Section
    const customerBoxWidth = 200
    const customerBoxHeight = 25
    
    drawRoundedRectangle(page, leftColumn - 10, yPosition - 5, customerBoxWidth, customerBoxHeight, accentGold, 5)
    
    page.drawText('Customer', {
      x: leftColumn + (customerBoxWidth - 80) / 2 - 10,
      y: yPosition + (customerBoxHeight - 12) / 2 - 5,
      size: 12,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    yPosition -= 35
    
    if (quote.customers?.company_name) {
      page.drawText('Company Name:', {
        x: leftColumn,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      })
      
      page.drawText(quote.customers.company_name, {
        x: leftColumn + 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
      yPosition -= 15
    }

    if (quote.customers?.contact_name) {
      page.drawText('Contact Name:', {
        x: leftColumn,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      })
      
      page.drawText(quote.customers.contact_name, {
        x: leftColumn + 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
      yPosition -= 15
    }

    if (quote.customers?.address) {
      page.drawText('Address:', {
        x: leftColumn,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      })
      
      page.drawText(quote.customers.address, {
        x: leftColumn + 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
      yPosition -= 15
    }

    if (quote.customers?.email) {
      page.drawText('Email:', {
        x: leftColumn,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      })
      
      page.drawText(quote.customers.email, {
        x: leftColumn + 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
      yPosition -= 15
    }

    if (quote.customers?.phone) {
      page.drawText('Phone:', {
        x: leftColumn,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: darkGray,
      })
      
      page.drawText(quote.customers.phone, {
        x: leftColumn + 100,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: darkGray,
      })
      yPosition -= 15
    }

    const pdfBytes = await pdfDoc.save()
    console.log('PDF saved successfully, size:', pdfBytes.length, 'bytes')
    return pdfBytes
    
  } catch (error) {
    console.error('Error in generateTitlePagePDF:', error)
    throw error
  }
}

async function mergePDFs(titlePageBytes: Uint8Array, originalPdfBytes: Uint8Array): Promise<Uint8Array> {
  try {
    const mergedPdf = await PDFDocument.create()
    
    const titlePagePdf = await PDFDocument.load(titlePageBytes)
    const titlePages = await mergedPdf.copyPages(titlePagePdf, titlePagePdf.getPageIndices())
    
    titlePages.forEach((page) => mergedPdf.addPage(page))
    
    const originalPdf = await PDFDocument.load(originalPdfBytes)
    const originalPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices())
    
    originalPages.forEach((page) => mergedPdf.addPage(page))
    
    return await mergedPdf.save()
  } catch (error) {
    console.error('Error merging PDFs:', error)
    return titlePageBytes
  }
}