import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { TermsDialog, CookiesDialog } from '@/components/legal/LegalDialogs';
import { validateEmail } from '@/lib/disposableEmailDomains';
import { checkNewsletterRateLimit } from '@/lib/newsletterRateLimit';
import { RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { performBotCheck } from '@/lib/botDetection';
import { toast } from 'sonner';
import trustLinkLogo from '@/assets/trust-link-logo.png';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const formStartTime = useRef(Date.now());

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Client-side validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        setError(emailValidation.reason || 'Invalid email');
        setIsSubmitting(false);
        return;
      }

      // Rate limit check
      const rateLimitCheck = checkNewsletterRateLimit();
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.reason || 'Too many attempts');
        setIsSubmitting(false);
        return;
      }

      // Bot detection check
      const botCheck = await performBotCheck(
        recaptchaToken,
        honeypot,
        formStartTime.current
      );

      if (!botCheck.allowed) {
        setError('Security check failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Call edge function to handle subscription and send verification email
      const { data, error: submitError } = await supabase.functions.invoke(
        'verify-newsletter',
        {
          body: {
            email,
            source: 'footer',
            recaptchaToken,
          },
        }
      );

      if (submitError) {
        throw submitError;
      }

      if (data?.error) {
        setError(data.error);
        setIsSubmitting(false);
        return;
      }

      // Success
      toast.success('Please check your email to confirm your subscription!', {
        description: 'We sent a verification link to ' + email,
      });
      setIsSubscribed(true);
      setEmail('');
      setRecaptchaToken(null);
      recaptchaRef.current?.reset();
      
      // Reset after 5 seconds
      setTimeout(() => {
        setIsSubscribed(false);
        formStartTime.current = Date.now();
      }, 5000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setError('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-blue-900 border-t border-blue-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-background/20 p-1">
                <img 
                  src={trustLinkLogo} 
                  alt="Trust Link Company Logo" 
                  className="w-full h-full object-contain bg-white rounded-md"
                />
              </div>
              <div className="font-semibold">
                <div className="text-lg font-bold text-blue-100">Trust Link Ventures</div>
                
              </div>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Empowering trusted food exports worldwide through ethical sourcing, innovative partnerships, and sustainable supply chain solutions.
            </p>
          </div>


          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-100">Contact</h3>
            <div className="space-y-3">
              <div className="text-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <Mail className="h-4 w-4 text-blue-300" />
                  <span className="text-blue-200">info@trustlinkcompany.com</span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-blue-300 mt-0.5" />
                  <div className="text-blue-200">
                    <div className="font-medium">Trust Link Ventures Limited</div>
                    <div>Akasanoma Road behind Mankoadze Fisheries</div>
                    <div>P. O. Box 709</div>
                    <div>Adabraka</div>
                    <div>Accra, Ghana</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stay Connected */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-100">Stay Connected</h3>
            <p className="text-blue-200 text-xs mb-3">
              Get updates on premium products.
            </p>
            
            {isSubscribed ? (
              <div className="py-1">
                <p className="text-blue-100 font-medium text-xs">
                  ✅ Please check your email to confirm!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                {/* Honeypot field (hidden from users, visible to bots) */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px' }}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
                
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-blue-800/30 border-blue-700 text-blue-100 placeholder:text-blue-300 text-xs h-8"
                />
                
                {error && (
                  <p className="text-red-400 text-xs">{error}</p>
                )}
                
                {/* reCAPTCHA v2 */}
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                />
                
                <Button 
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !recaptchaToken}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-8 text-xs font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
                
                <p className="text-blue-300 text-xs leading-tight">
                  Protected by reCAPTCHA. By subscribing, you agree to receive marketing emails.
                </p>
              </form>
            )}
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
              <a 
                href="https://www.trustlinkcompany.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-blue-100 text-sm transition-colors"
              >
                Privacy Policy
              </a>
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