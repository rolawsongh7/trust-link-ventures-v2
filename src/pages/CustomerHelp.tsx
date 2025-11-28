import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { 
  Search, 
  Mail, 
  Phone, 
  MessageSquare,
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { customerPortalFAQs, searchFAQs } from '@/data/customerPortalFAQs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const CustomerHelp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = useMemo(() => {
    if (!searchQuery) return customerPortalFAQs;
    
    const searchResults = searchFAQs(searchQuery, customerPortalFAQs);
    
    // Group results back into categories
    const categorizedResults = customerPortalFAQs.map(category => ({
      ...category,
      faqs: category.faqs.filter(faq => searchResults.includes(faq))
    })).filter(category => category.faqs.length > 0);
    
    return categorizedResults;
  }, [searchQuery]);

  const totalFAQs = customerPortalFAQs.reduce((acc, cat) => acc + cat.faqs.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <PortalPageHeader
          title="Help & Support"
          subtitle="Find answers to your questions"
          totalCount={totalFAQs}
          totalIcon={HelpCircle}
          patternId="help-grid"
          stats={[
            {
              label: "Categories",
              count: customerPortalFAQs.length,
              icon: HelpCircle
            }
          ]}
        />
      </Card>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help (e.g., 'track order', 'payment methods', 'notifications')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base"
            />
          </div>
          {searchQuery && (
            <p className="mt-3 text-sm text-muted-foreground">
              Found {filteredFAQs.reduce((acc, cat) => acc + cat.faqs.length, 0)} results
            </p>
          )}
        </CardContent>
      </Card>

      {/* FAQ Categories */}
      <div className="space-y-6">
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{category.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {category.faqs.length} question{category.faqs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`${category.id}-${index}`}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-4">
                          <span className="font-medium">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-4">
                          <p className="mb-3">{faq.answer}</p>
                          {faq.relatedLink && (
                            <Link 
                              to={faq.relatedLink}
                              className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                            >
                              View related section <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try different keywords or contact our support team directly
              </p>
              <Button asChild>
                <Link to="/portal/communications">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contact Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
                <p className="text-muted-foreground">
                  Our support team is here to assist you. Reach out through any of these channels:
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <a 
                  href="mailto:info@trustlinkventures.com"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-background transition-colors"
                >
                  <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Email Us</p>
                    <p className="text-sm text-muted-foreground">info@trustlinkventures.com</p>
                  </div>
                </a>
                
                <a 
                  href="tel:+233243131257"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-background transition-colors"
                >
                  <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Call Us</p>
                    <p className="text-sm text-muted-foreground">+233 243 131 257</p>
                  </div>
                </a>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Business Hours</p>
                  <p className="text-sm text-muted-foreground">Monday - Friday: 8:00 AM - 5:00 PM GMT</p>
                  <p className="text-sm text-muted-foreground">We typically respond within 24 hours</p>
                </div>
              </div>

              <Link to="/portal/communications">
                <Button className="w-full sm:w-auto">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send us a message
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerHelp;
