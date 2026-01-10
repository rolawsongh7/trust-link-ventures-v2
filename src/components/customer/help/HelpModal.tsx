import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  BookOpen, 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { customerPortalFAQs, searchFAQs } from '@/data/customerPortalFAQs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onOpenChange }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return searchFAQs(searchQuery, customerPortalFAQs);
  }, [searchQuery]);

  const quickActions = [
    {
      title: 'Browse FAQs',
      description: 'View all help topics',
      icon: BookOpen,
      href: '/portal/help',
      color: 'text-blue-500'
    },
    {
      title: 'Message Support',
      description: 'Send us a message',
      icon: MessageSquare,
      href: '/portal/communications',
      color: 'text-purple-500'
    },
    {
      title: 'Contact Info',
      description: 'Email & phone',
      icon: Phone,
      color: 'text-green-500',
      action: 'contact'
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-3 pb-4">
          <SheetTitle className="text-2xl font-bold">Help & Support</SheetTitle>
          <SheetDescription className="text-base">
            Find answers to common questions or contact our support team
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-2">
                  {searchResults.slice(0, 5).map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`faq-${index}`}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <span className="text-sm font-medium">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        {faq.answer}
                        {faq.relatedLink && (
                          <Link 
                            to={faq.relatedLink}
                            onClick={() => onOpenChange(false)}
                            className="inline-flex items-center gap-1 mt-2 text-primary hover:underline"
                          >
                            Learn more <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No results found. Try different keywords or browse all FAQs.
                </p>
              )}
              {searchResults.length > 0 && (
                <Link to="/portal/help" onClick={() => onOpenChange(false)}>
                  <Button variant="outline" className="w-full">
                    View All FAQs
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {!searchQuery && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Quick Actions
                </h3>
                <div className="grid gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    if (action.action === 'contact') {
                      return (
                        <Card key={action.title} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center ${action.color}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div>
                                  <h4 className="font-medium">{action.title}</h4>
                                  <p className="text-sm text-muted-foreground">{action.description}</p>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <a 
                                    href="mailto:info@truslinkcompany.com"
                                    className="flex items-center gap-2 text-primary hover:underline"
                                  >
                                    <Mail className="h-4 w-4" />
                                    info@truslinkcompany.com
                                  </a>
                                  <a 
                                    href="tel:+233243131257"
                                    className="flex items-center gap-2 text-primary hover:underline"
                                  >
                                    <Phone className="h-4 w-4" />
                                    +233 243 131 257
                                  </a>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return (
                      <Link key={action.title} to={action.href!} onClick={() => onOpenChange(false)}>
                        <Card className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center ${action.color}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{action.title}</h4>
                                <p className="text-sm text-muted-foreground">{action.description}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Response Time */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Business Hours</h4>
                      <p className="text-sm text-muted-foreground">
                        Monday - Friday: 8:00 AM - 5:00 PM GMT
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
