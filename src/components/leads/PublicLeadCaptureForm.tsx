import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { useLeadSubmission } from '@/hooks/useLeadSubmission';
import { performBotCheck } from '@/lib/botDetection';

interface PublicLeadCaptureFormProps {
  source?: string;
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

/**
 * Public-facing lead capture form that uses the secure submit-lead edge function
 * Includes reCAPTCHA, honeypot, and timing checks for bot protection
 */
const PublicLeadCaptureForm: React.FC<PublicLeadCaptureFormProps> = ({
  source = 'website',
  title = 'Get in Touch',
  description = 'Submit your inquiry and we\'ll get back to you soon.',
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    honeypot: '' // Hidden field for bot detection
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const formStartTime = useRef<number>(Date.now());
  
  const { submitLead, isSubmitting } = useLeadSubmission();

  const validateField = (name: string, value: string) => {
    if (name === 'title') {
      if (value.trim().length < 3) return 'Title must be at least 3 characters';
      if (value.length > 200) return 'Title must be less than 200 characters';
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    const titleError = validateField('title', formData.title);
    if (titleError) newErrors.title = titleError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Bot detection check
    const botCheckResult = await performBotCheck(
      recaptchaToken,
      formData.honeypot,
      formStartTime.current
    );

    if (!botCheckResult.allowed) {
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      return;
    }

    // Submit lead through secure edge function
    const result = await submitLead({
      title: formData.title,
      description: formData.description || undefined,
      source,
      recaptchaToken: recaptchaToken || undefined
    });

    if (result.success) {
      setIsSubmitted(true);
      onSuccess?.();
      
      // Reset form
      setFormData({ title: '', description: '', honeypot: '' });
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } else {
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center py-12 space-y-6">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold text-green-600">Thank you!</h3>
            <p className="text-muted-foreground text-lg">
              We've received your inquiry and will be in touch shortly.
            </p>
            <Button onClick={() => setIsSubmitted(false)}>
              Submit Another Inquiry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Subject / Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={errors.title ? 'border-red-500' : ''}
              required
              maxLength={200}
            />
            {errors.title && (
              <div className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.title}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Message / Details</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              placeholder="Please provide any additional details..."
              className="resize-none"
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
            aria-hidden="true"
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
            className="w-full" 
            size="lg"
            disabled={isSubmitting || !recaptchaToken}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit Inquiry'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PublicLeadCaptureForm;
