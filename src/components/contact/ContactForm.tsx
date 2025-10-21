import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { supabase } from '@/integrations/supabase/client';
import { RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { performBotCheck } from '@/lib/botDetection';

interface ContactFormProps {
  initialInquiryType?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ initialInquiryType = '' }) => {
  const { isMobile } = useMobileDetection();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    country: '',
    inquiryType: initialInquiryType,
    message: '',
    honeypot: '' // Hidden field for bot detection
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const formStartTime = useRef<number>(Date.now());

  const inquiryResponseTimes = {
    'Request a Quote': '4-6 hours',
    'Pitch a Partnership': '1 business day',
    'Investor Opportunities': '2 business days',
    'General Contact': '1 business day'
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'name':
        return value.trim().length < 2 ? 'Name must be at least 2 characters' : '';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Please enter a valid email address' : '';
      case 'country':
        return value.trim().length < 2 ? 'Please enter your country' : '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    if (touchedFields[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, formData[fieldName as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      if (key === 'name' || key === 'email' || key === 'country') {
        const error = validateField(key, formData[key as keyof typeof formData]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      toast.error('Please fix the form errors before submitting.');
      return;
    }

    // Bot detection check
    const botCheckResult = await performBotCheck(
      recaptchaToken,
      formData.honeypot,
      formStartTime.current
    );

    if (!botCheckResult.allowed) {
      setIsLoading(false);
      toast.error(botCheckResult.reason || 'Security check failed. Please try again.');
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      return;
    }
    
    try {
      // Call edge function to handle all database operations and email notifications
      const { data, error } = await supabase.functions.invoke('submit-contact-form', {
        body: {
          name: formData.name,
          company: formData.company,
          email: formData.email,
          country: formData.country,
          inquiryType: formData.inquiryType,
          message: formData.message,
          recaptchaToken: recaptchaToken
        }
      });

      if (error) throw error;

      console.log('Contact form submitted successfully:', data);
      toast.success('Thank you! We\'ve received your inquiry and will be in touch shortly.');
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      toast.error('There was an issue submitting your inquiry. Please try again or email us directly.');
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const getEstimatedResponseTime = () => {
    return inquiryResponseTimes[formData.inquiryType as keyof typeof inquiryResponseTimes] || '1 business day';
  };

  if (isSubmitted) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center py-8 sm:py-12 space-y-4 sm:space-y-6">
            <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 text-green-500 mx-auto animate-bounce" />
            <h3 className="text-xl sm:text-2xl font-bold text-green-600">✅ Thank you!</h3>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed px-4">
              We've received your inquiry and will be in touch shortly.<br />
              Meanwhile, you can explore our <a href="/about" className="text-primary font-medium hover:underline">Sustainability Commitments</a> or <a href="/partners" className="text-primary font-medium hover:underline">Partner Network</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {formData.inquiryType && (
            <div className="flex items-center gap-2 p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-primary font-medium">
                Expected response time: {getEstimatedResponseTime()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm sm:text-base">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('name')}
                className={`min-h-[44px] text-base ${errors.name ? 'border-red-500' : ''}`}
                required
              />
              {errors.name && (
                <div className="flex items-center gap-1 text-red-500 text-xs sm:text-sm">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.name}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm sm:text-base">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="min-h-[44px] text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                className={`min-h-[44px] text-base ${errors.email ? 'border-red-500' : ''}`}
                required
              />
              {errors.email && (
                <div className="flex items-center gap-1 text-red-500 text-xs sm:text-sm">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm sm:text-base">Country *</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                onBlur={() => handleBlur('country')}
                className={`min-h-[44px] text-base ${errors.country ? 'border-red-500' : ''}`}
                required
              />
              {errors.country && (
                <div className="flex items-center gap-1 text-red-500 text-xs sm:text-sm">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.country}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiryType" className="text-sm sm:text-base">Inquiry Type</Label>
            <Select value={formData.inquiryType} onValueChange={(value) => handleSelectChange('inquiryType', value)}>
              <SelectTrigger className="min-h-[44px] text-base">
                <SelectValue placeholder="Select inquiry type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Request a Quote">Buyer</SelectItem>
                <SelectItem value="Pitch a Partnership">Partner</SelectItem>
                <SelectItem value="Investor Opportunities">Investor</SelectItem>
                <SelectItem value="General Contact">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm sm:text-base">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={isMobile ? 4 : 6}
              placeholder="Tell us about your inquiry..."
              className="min-h-[100px] text-base resize-none"
            />
          </div>

          {/* Honeypot field - hidden from users */}
          <input
            type="text"
            name="honeypot"
            value={formData.honeypot}
            onChange={handleInputChange}
            style={{ position: 'absolute', left: '-9999px' }}
            tabIndex={-1}
            autoComplete="off"
          />

          {/* reCAPTCHA */}
          <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={handleRecaptchaChange}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full relative min-h-[48px] sm:min-h-[52px] touch-manipulation text-base sm:text-lg" 
            size={isMobile ? "default" : "lg"}
            disabled={isLoading || !recaptchaToken}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Send My Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContactForm;