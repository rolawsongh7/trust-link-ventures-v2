import { Package, FileText, CreditCard, User, Settings } from 'lucide-react';

export interface FAQ {
  question: string;
  answer: string;
  keywords: string[];
  relatedLink?: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  icon: any;
  faqs: FAQ[];
}

export const customerPortalFAQs: FAQCategory[] = [
  {
    id: 'orders',
    title: 'Orders & Tracking',
    icon: Package,
    faqs: [
      {
        question: 'How do I track my order?',
        answer: 'You can track your order by going to the Orders page from the main menu. Click on any order to view its detailed tracking information, including current status, estimated delivery date, and tracking number if available.',
        keywords: ['track', 'tracking', 'status', 'delivery', 'where is my order'],
        relatedLink: '/portal/orders'
      },
      {
        question: 'What do the order statuses mean?',
        answer: 'Order statuses include: Pending (awaiting payment confirmation), Processing (being prepared), Ready to Ship (packed and ready), Shipped (in transit), Delivered (received), and Cancelled. You can view the status history for each order.',
        keywords: ['status', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']
      },
      {
        question: 'Can I cancel or modify my order?',
        answer: 'You can request order modifications or cancellations by contacting our support team through the Messages section. Please note that orders that are already in processing or shipped cannot be cancelled.',
        keywords: ['cancel', 'modify', 'change', 'edit order'],
        relatedLink: '/portal/communications'
      },
      {
        question: 'How do I add a delivery address?',
        answer: 'Go to Delivery Addresses in the menu, then click "Add New Address". Fill in the required details including Ghana Digital Address, street address, city, and region. You can set a default address for future orders.',
        keywords: ['address', 'delivery', 'location', 'ghana digital address'],
        relatedLink: '/portal/addresses'
      },
      {
        question: 'What happens after I place an order?',
        answer: 'After placing an order, you\'ll need to upload payment proof. Once verified, your order will be processed and prepared for shipment. You\'ll receive notifications at each stage of the process.',
        keywords: ['place order', 'after order', 'next steps', 'what happens']
      }
    ]
  },
  {
    id: 'quotes',
    title: 'Quotes & Pricing',
    icon: FileText,
    faqs: [
      {
        question: 'How do I accept a quote?',
        answer: 'Open the quote from your Quotes page and review the details. Click the "Accept Quote" button to convert it into an order. You\'ll then be prompted to select a delivery address and proceed with payment.',
        keywords: ['accept', 'approve', 'quote', 'accept quote'],
        relatedLink: '/portal/quotes'
      },
      {
        question: 'How long is a quote valid?',
        answer: 'Quotes are typically valid for 30 days from the date of issue. The exact validity period is shown on each quote. If a quote has expired, you can request a new quote through the Messages section.',
        keywords: ['validity', 'expiry', 'expired', 'how long', 'valid']
      },
      {
        question: 'Can I negotiate pricing?',
        answer: 'For large orders or bulk purchases, pricing negotiations are possible. Contact our sales team through the Messages section with your quote details and we\'ll work with you to find the best pricing.',
        keywords: ['negotiate', 'price', 'discount', 'bulk', 'lower price'],
        relatedLink: '/portal/communications'
      },
      {
        question: 'How do I request a quote?',
        answer: 'You can request a quote by adding items to your cart and submitting a quote request, or by sending a message through the Messages section with your specific requirements.',
        keywords: ['request', 'quote request', 'new quote', 'get quote'],
        relatedLink: '/portal/cart'
      },
      {
        question: 'What currencies do you accept?',
        answer: 'We accept multiple currencies including GHS (Ghana Cedis), USD (US Dollars), and EUR (Euros). The currency will be specified in your quote and invoice.',
        keywords: ['currency', 'payment', 'usd', 'ghs', 'eur', 'dollar', 'cedis']
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payments & Invoices',
    icon: CreditCard,
    faqs: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept bank transfers, mobile money (MTN, Vodafone, AirtelTigo), and online payments through Paystack. Payment instructions will be provided with your invoice.',
        keywords: ['payment method', 'how to pay', 'mobile money', 'bank transfer', 'paystack', 'mtn', 'vodafone']
      },
      {
        question: 'How do I upload payment proof?',
        answer: 'After making payment, go to your order details page and click "Upload Payment Proof". You can upload a screenshot or photo of your payment receipt. Our team will verify and update your order status.',
        keywords: ['upload', 'payment proof', 'receipt', 'payment confirmation'],
        relatedLink: '/portal/orders'
      },
      {
        question: 'Where can I find my invoices?',
        answer: 'All your invoices are available in the Invoices section. You can view, download, and print invoices for your records. Invoices are automatically generated for each order.',
        keywords: ['invoice', 'invoices', 'receipt', 'download invoice', 'find invoice'],
        relatedLink: '/portal/invoices'
      },
      {
        question: 'When will my payment be verified?',
        answer: 'Payment verification typically takes 2-4 hours during business hours (Monday-Friday, 8am-5pm GMT). You\'ll receive a notification once your payment is confirmed.',
        keywords: ['verify', 'verification', 'payment verification', 'how long', 'confirm payment']
      },
      {
        question: 'Can I get a refund?',
        answer: 'Refunds are handled on a case-by-case basis. Contact our support team through the Messages section with your order details and reason for the refund request.',
        keywords: ['refund', 'money back', 'return money', 'cancel payment'],
        relatedLink: '/portal/communications'
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: User,
    faqs: [
      {
        question: 'How do I update my profile information?',
        answer: 'Go to Profile Settings from the menu. You can update your name, email, phone number, and company information. Changes are saved automatically.',
        keywords: ['profile', 'update', 'change', 'edit profile', 'personal information'],
        relatedLink: '/portal/profile'
      },
      {
        question: 'How do I change my password?',
        answer: 'In Profile Settings, click on "Change Password". You\'ll need to enter your current password and then your new password twice to confirm.',
        keywords: ['password', 'change password', 'reset password', 'security'],
        relatedLink: '/portal/profile'
      },
      {
        question: 'How do I enable biometric login?',
        answer: 'In your mobile app, go to Profile Settings and enable "Biometric Authentication". You\'ll be prompted to authenticate with your fingerprint or face ID. This feature is only available on mobile devices.',
        keywords: ['biometric', 'fingerprint', 'face id', 'touch id', 'quick login'],
        relatedLink: '/portal/profile'
      },
      {
        question: 'Can I add multiple users to my account?',
        answer: 'For team accounts with multiple users, please contact our support team to discuss enterprise options and multi-user access.',
        keywords: ['multiple users', 'team', 'users', 'team members', 'enterprise'],
        relatedLink: '/portal/communications'
      },
      {
        question: 'How do I manage my notification preferences?',
        answer: 'Go to Notifications in the menu to customize which notifications you receive and how (email, push notifications). You can enable or disable specific types of notifications.',
        keywords: ['notifications', 'preferences', 'alerts', 'email', 'push'],
        relatedLink: '/portal/notifications'
      }
    ]
  },
  {
    id: 'technical',
    title: 'Technical Support',
    icon: Settings,
    faqs: [
      {
        question: 'I\'m not receiving notifications',
        answer: 'Check your notification settings to ensure they are enabled. On mobile, also check that the app has permission to send notifications in your device settings. If the issue persists, try logging out and back in.',
        keywords: ['notifications', 'not receiving', 'no notifications', 'alerts'],
        relatedLink: '/portal/notifications'
      },
      {
        question: 'The app is not loading properly',
        answer: 'Try refreshing the page or closing and reopening the app. Clear your browser cache if on web. If the issue continues, contact support with details about what you\'re experiencing.',
        keywords: ['loading', 'not working', 'error', 'broken', 'white screen', 'blank page']
      },
      {
        question: 'How do I install the mobile app?',
        answer: 'If you\'re using the web version on mobile, you can install it as an app by tapping your browser menu and selecting "Add to Home Screen" or "Install App". This will create an app icon on your home screen.',
        keywords: ['install', 'app', 'download', 'mobile app', 'home screen']
      },
      {
        question: 'I forgot my password',
        answer: 'On the login page, click "Forgot Password". Enter your email address and we\'ll send you instructions to reset your password.',
        keywords: ['forgot password', 'lost password', 'reset password', 'can\'t login']
      },
      {
        question: 'How do I contact support?',
        answer: 'You can reach our support team through the Messages section, or email us at info@truslinkcompany.com. We typically respond within 24 hours during business days.',
        keywords: ['contact', 'support', 'help', 'email', 'reach out'],
        relatedLink: '/portal/communications'
      }
    ]
  }
];

export const searchFAQs = (query: string, faqs: FAQCategory[]): FAQ[] => {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) return [];
  
  const allFAQs: FAQ[] = faqs.flatMap(category => category.faqs);
  
  return allFAQs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm) ||
    faq.answer.toLowerCase().includes(searchTerm) ||
    faq.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
  ).slice(0, 10); // Return max 10 results
};
