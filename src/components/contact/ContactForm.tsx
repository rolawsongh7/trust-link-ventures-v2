import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormProps {
  initialInquiryType?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ initialInquiryType = '' }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    country: '',
    inquiryType: initialInquiryType,
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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
    
    // Simulate form submission with analytics tracking
    setTimeout(() => {
      // Track form completion
      console.log('Form Analytics:', {
        inquiryType: formData.inquiryType,
        hasCompany: !!formData.company,
        messageLength: formData.message.length,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Thank you! We\'ve received your inquiry and will be in touch shortly.');
      setIsSubmitted(true);
      setIsLoading(false);
    }, 1500);
  };

  const getEstimatedResponseTime = () => {
    return inquiryResponseTimes[formData.inquiryType as keyof typeof inquiryResponseTimes] || '1 business day';
  };

  if (isSubmitted) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-8">
          <div className="text-center py-12 space-y-6">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold text-green-600">✅ Thank you!</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
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
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formData.inquiryType && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">
                Expected response time: {getEstimatedResponseTime()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('name')}
                className={errors.name ? 'border-red-500' : ''}
                required
              />
              {errors.name && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                className={errors.email ? 'border-red-500' : ''}
                required
              />
              {errors.email && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                onBlur={() => handleBlur('country')}
                className={errors.country ? 'border-red-500' : ''}
                required
              />
              {errors.country && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="w-3 h-3" />
                  {errors.country}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiryType">Inquiry Type</Label>
            <Select value={formData.inquiryType} onValueChange={(value) => handleSelectChange('inquiryType', value)}>
              <SelectTrigger>
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
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={6}
              placeholder="Tell us about your inquiry..."
            />
          </div>

          <Button 
            type="submit" 
            className="w-full relative" 
            size="lg" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
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