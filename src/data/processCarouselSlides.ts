import processBrowse from "@/assets/process-browse.jpg";
import processRequestQuote from "@/assets/process-request-quote.jpg";
import processReceiveQuote from "@/assets/process-receive-quote.jpg";
import processAcceptQuote from "@/assets/process-accept-quote.jpg";
import processOrderPrepared from "@/assets/process-order-prepared.jpg";
import processDelivery from "@/assets/process-delivery.jpg";

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  image: string;
}

export const processSteps: ProcessStep[] = [
  {
    step: 1,
    title: "Browse & Select",
    description: "Explore our premium frozen products and add items to your cart",
    image: processBrowse,
  },
  {
    step: 2,
    title: "Request Quote",
    description: "Submit your cart for a custom quote based on your order size",
    image: processRequestQuote,
  },
  {
    step: 3,
    title: "Receive Pricing",
    description: "Our team reviews your request and provides competitive pricing",
    image: processReceiveQuote,
  },
  {
    step: 4,
    title: "Accept Quote",
    description: "Review your quote and accept to confirm your order",
    image: processAcceptQuote,
  },
  {
    step: 5,
    title: "Order Prepared",
    description: "Your products are carefully packed in temperature-controlled containers",
    image: processOrderPrepared,
  },
  {
    step: 6,
    title: "Fast Delivery",
    description: "Track your order from our cold store to your doorstep",
    image: processDelivery,
  },
];
