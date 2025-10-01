import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const ContactFAQ = () => {
  const faqs = [
    {
      question: "What's the minimum order quantity for bulk purchases?",
      answer: "Our minimum order quantity varies by product category. For seafood, it's typically 5 tons, while for poultry and meat products, it's 3 tons. We can accommodate smaller orders for trial purposes."
    },
    {
      question: "How do you ensure product quality during shipping?",
      answer: "We maintain a strict cold chain from source to destination with temperature monitoring, HACCP-certified facilities, and GPS-tracked refrigerated containers. All shipments include temperature logs and quality certificates."
    },
    {
      question: "What are your payment terms for new customers?",
      answer: "For new customers, we typically require 30% advance payment with the balance against shipping documents. We accept bank transfers, letters of credit, and other secure payment methods."
    },
    {
      question: "Do you provide samples before placing bulk orders?",
      answer: "Yes, we provide samples for quality assessment. Sample costs are typically deducted from the first commercial order. Samples are shipped via express courier with proper documentation."
    },
    {
      question: "What certifications do your products have?",
      answer: "Our products are HACCP certified, Halal compliant, and meet ISO 22000 food safety standards. We also provide certificates of origin, health certificates, and any additional certifications required by your market."
    },
    {
      question: "How long does it take to process and ship orders?",
      answer: "Processing time is typically 5-7 business days, with shipping time varying by destination (7-21 days by sea freight, 2-5 days by air freight). We provide detailed timelines with each quote."
    }
  ];

  return (
    <Card className="card-elevated">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b last:border-b-0">
              <AccordionTrigger className="text-left hover:text-primary transition-colors py-4 text-sm sm:text-base touch-manipulation min-h-[44px]">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4 text-sm sm:text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ContactFAQ;