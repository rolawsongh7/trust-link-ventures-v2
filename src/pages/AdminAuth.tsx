import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { checkAuthRateLimit, recordAuthAttempt, formatRateLimitMessage } from '@/lib/authRateLimiter';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { isAdminDomain, redirectToAdminDomain } from '@/utils/domainUtils';

const AdminAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();
  const { hasAdminAccess, loading: roleLoading } = useRoleAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';

  // Redirect to admin subdomain if not already there (skip on preview for testing)
  useEffect(() => {
    const isLovablePreview = window.location.hostname.includes('lovableproject.com');
    if (!isAdminDomain() && !isLovablePreview) {
      redirectToAdminDomain('/');
    }
  }, []);

  // Redirect if already authenticated as admin
  useEffect(() => {
    // Wait for both user and role to be loaded
    if (roleLoading) return;
    
    if (user) {
      if (hasAdminAccess) {
        // Admin user - redirect to intended page or dashboard
        navigate(from, { replace: true });
      } else {
        // User is logged in but not an admin
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [user, hasAdminAccess, roleLoading, navigate, from]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const sendLoginNotification = async (userId: string, email: string, success: boolean) => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      await supabase.functions.invoke('admin-login-notification', {
        body: {
          userId,
          email,
          ipAddress: ip,
          userAgent: navigator.userAgent,
          success,
          location: {
            // Could integrate with geolocation API here
          }
        }
      });
    } catch (error) {
      console.error('Failed to send login notification:', error);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateLimitError(null);

    // Check rate limiting
    const rateLimitCheck = await checkAuthRateLimit(formData.email);
    if (!rateLimitCheck.allowed) {
      const message = formatRateLimitMessage(rateLimitCheck);
      setRateLimitError(message);
      toast({
        title: 'Too Many Attempts',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    // Show CAPTCHA after 2 failed attempts
    if (failedAttempts >= 2 && !recaptchaToken) {
      setShowCaptcha(true);
      toast({
        title: 'Verification Required',
        description: 'Please complete the CAPTCHA verification.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error, requiresMFA } = await signIn(formData.email, formData.password);
      
      if (error) {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        // Record failed attempt
        await recordAuthAttempt(formData.email, false, 'Invalid credentials');
        
        // Send notification for failed admin login
        if (user) {
          await sendLoginNotification(user.id, formData.email, false);
        }

        // Show CAPTCHA after 2 failed attempts
        if (newFailedAttempts >= 2) {
          setShowCaptcha(true);
        }

        toast({
          title: 'Authentication Failed',
          description: error.message || 'Invalid credentials. Please check your email and password.',
          variant: 'destructive',
        });
      } else {
        // Get the current session to access the user ID
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession?.user?.id) {
          toast({
            title: 'Authentication Error',
            description: 'Unable to verify user session.',
            variant: 'destructive',
          });
          return;
        }

        // Check if user has admin role
        const { data: isAdmin } = await supabase.rpc('check_user_role', {
          check_user_id: currentSession.user.id,
          required_role: 'admin'
        });

        if (!isAdmin) {
          await supabase.auth.signOut();
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access the admin portal.',
            variant: 'destructive',
          });
          return;
        }

        // Record successful attempt
        await recordAuthAttempt(formData.email, true);
        
        // Send notification for successful admin login
        await sendLoginNotification(currentSession.user.id, formData.email, true);

        // Reset failed attempts
        setFailedAttempts(0);
        setShowCaptcha(false);
        
        // Reset CAPTCHA
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
          setRecaptchaToken(null);
        }

        toast({
          title: requiresMFA ? 'MFA Required' : 'Welcome Back',
          description: requiresMFA 
            ? 'Please complete two-factor authentication.' 
            : 'Successfully signed in to admin portal.',
        });
        
        if (!requiresMFA) {
          navigate(from, { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>
            Secure access for authorized administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rateLimitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rateLimitError}</AlertDescription>
            </Alert>
          )}

          {failedAttempts > 0 && failedAttempts < 5 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {5 - failedAttempts} attempt(s) remaining before account lockout.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@trustlinkventures.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {showCaptcha && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || (showCaptcha && !recaptchaToken)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign In to Admin
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            <p>🔒 Secured with multi-layer authentication</p>
            <p>🛡️ All login attempts are monitored and logged</p>
            <p className="text-xs">Authorized personnel only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;
