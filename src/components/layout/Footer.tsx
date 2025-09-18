import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { TermsDialog, PrivacyDialog, CookiesDialog } from '@/components/legal/LegalDialogs';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For now, just log the subscription since the table might not exist yet
      console.log('Newsletter subscription:', email);
      setIsSubscribed(true);
      setEmail('');
      
      // Reset after 3 seconds
      setTimeout(() => setIsSubscribed(false), 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
    }
  };

  return (
    <footer className="bg-blue-900 border-t border-blue-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Newsletter Section - Compact */}
        <div className="bg-blue-800/40 rounded-lg p-6 mb-8">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-100 mb-2">
              Stay Connected
            </h3>
            <p className="text-blue-200 text-sm mb-4">
              Get updates on our premium seafood products and export opportunities.
            </p>
            
            {isSubscribed ? (
              <div className="text-center py-2">
                <p className="text-blue-100 font-medium text-sm">✅ Thank you for subscribing!</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-blue-800/30 border-blue-700 text-blue-100 placeholder:text-blue-300 text-sm h-9"
                />
                <Button 
                  type="submit"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 font-medium"
                >
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-background/20 p-1">
                <img 
                  src="/lovable-uploads/22e4a71a-b0c3-4abd-8f53-268d55d324df.png" 
                  alt="Trust Link Company Logo" 
                  className="w-full h-full object-contain bg-white rounded-md"
                />
              </div>
              <div className="font-semibold">
                <div className="text-lg font-bold text-blue-100">Trust Link</div>
                
              </div>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Empowering trusted food exports worldwide through ethical sourcing, innovative partnerships, and sustainable supply chain solutions.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-100">Quick Links</h3>
            <div className="space-y-2">
              {[
                { name: 'About', href: '/about' },
                { name: 'Products', href: '/products' },
                { name: 'Partners', href: '/partners' },
                { name: 'Contact', href: '/contact' },
              ].map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block text-blue-200 hover:text-blue-100 transition-colors text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 text-right">
            <h3 className="font-semibold text-blue-100">Contact</h3>
            <div className="space-y-3">
              <div className="text-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Mail className="h-4 w-4 text-blue-300" />
                  <span className="text-blue-200">info@trustlinkventures.com</span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-blue-300 mt-0.5" />
                  <div className="text-blue-200">
                    <div className="font-medium">Trust Link Ventures Limited</div>
                    <div>P. O. Box 709</div>
                    <div>Adabraka</div>
                    <div>Accra, Ghana</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-200 text-sm">
              © 2025 Trust Link Ventures Ltd. All Rights Reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <TermsDialog 
                trigger={
                  <button className="text-blue-200 hover:text-blue-100 text-sm transition-colors">
                    Terms of Service
                  </button>
                }
              />
              <PrivacyDialog 
                trigger={
                  <button className="text-blue-200 hover:text-blue-100 text-sm transition-colors">
                    Privacy Policy
                  </button>
                }
              />
              <CookiesDialog 
                trigger={
                  <button className="text-blue-200 hover:text-blue-100 text-sm transition-colors">
                    Cookie Policy
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;