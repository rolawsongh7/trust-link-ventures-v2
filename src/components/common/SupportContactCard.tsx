import { Mail, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SupportContactCardProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function SupportContactCard({ variant = 'full', className = '' }: SupportContactCardProps) {
  const supportEmail = 'support@trustlinkcompany.com';
  const supportPhone = '+233 30 000 0000';
  const whatsappNumber = '+233200000000';

  const openEmail = () => {
    window.location.href = `mailto:${supportEmail}?subject=Support Request`;
  };

  const openPhone = () => {
    window.location.href = `tel:${supportPhone.replace(/\s/g, '')}`;
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`, '_blank');
  };

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <Button variant="outline" size="sm" onClick={openEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email Support
        </Button>
        <Button variant="outline" size="sm" onClick={openWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Contact Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Need help? Our support team is here for you.
        </p>
        
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={openEmail}
          >
            <Mail className="h-4 w-4 mr-3" />
            <div className="flex-1 text-left">
              <div className="font-medium">Email Support</div>
              <div className="text-xs text-muted-foreground">{supportEmail}</div>
            </div>
            <ExternalLink className="h-4 w-4 opacity-50" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={openPhone}
          >
            <Phone className="h-4 w-4 mr-3" />
            <div className="flex-1 text-left">
              <div className="font-medium">Phone</div>
              <div className="text-xs text-muted-foreground">{supportPhone}</div>
            </div>
            <ExternalLink className="h-4 w-4 opacity-50" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800" 
            onClick={openWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-3 text-green-600" />
            <div className="flex-1 text-left">
              <div className="font-medium text-green-700 dark:text-green-400">WhatsApp</div>
              <div className="text-xs text-green-600/70 dark:text-green-500">Quick response</div>
            </div>
            <ExternalLink className="h-4 w-4 opacity-50 text-green-600" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Response time: Within 24 hours
        </p>
      </CardContent>
    </Card>
  );
}
