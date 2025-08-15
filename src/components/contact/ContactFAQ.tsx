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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left hover:text-primary transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
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