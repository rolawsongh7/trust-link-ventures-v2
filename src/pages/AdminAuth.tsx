import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { checkAuthRateLimit, recordAuthAttempt, formatRateLimitMessage } from '@/lib/authRateLimiter';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '@/config/recaptcha';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { isAdminDomain, redirectToAdminDomain } from '@/utils/domainUtils';
import trustLinkLogo from '@/assets/trust-link-logo.png';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-secondary-500/10 to-accent-500/20 animate-gradient-xy" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-400/20 via-transparent to-transparent" />
      
      <InteractiveCard 
        variant="glass" 
        hapticFeedback={true}
        className="w-full max-w-md relative z-10 animate-fade-in border-primary-200/20 shadow-2xl hover:shadow-primary-500/20 transition-all duration-500"
      >
        <CardHeader className="space-y-4 text-center pb-4">
          {/* Logo */}
          <div className="mx-auto w-24 h-24 animate-scale-in">
            <img 
              src={trustLinkLogo} 
              alt="Trust Link Ventures" 
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          
          {/* Shield icon with pulse animation */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-full flex items-center justify-center animate-pulse backdrop-blur-sm border border-primary-300/30">
            <Shield className="w-8 h-8 text-primary-600 drop-shadow-glow" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Admin Portal
            </CardTitle>
            <CardDescription className="text-base">
              Secure access for authorized administrators only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {rateLimitError && (
            <Alert variant="destructive" className="mb-4 animate-scale-in">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              <AlertDescription>{rateLimitError}</AlertDescription>
            </Alert>
          )}

          {failedAttempts > 0 && failedAttempts < 5 && (
            <Alert className="mb-4 border-amber-500/20 bg-amber-500/10 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <div className="space-y-2">
                  <p>{5 - failedAttempts} attempt(s) remaining before account lockout.</p>
                  <div className="w-full h-1.5 bg-amber-200/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
                      style={{ width: `${(failedAttempts / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2 group">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
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
                className="transition-all duration-300 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
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
                className="transition-all duration-300 focus:ring-2 focus:ring-primary-500/20"
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

            <AnimatedButton 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white shadow-lg hover:shadow-primary-500/50 transition-all duration-300" 
              disabled={loading || (showCaptcha && !recaptchaToken)}
              animation="magnetic"
              loading={loading}
              loadingText="Signing In..."
            >
              {!loading && (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign In to Admin
                </>
              )}
            </AnimatedButton>
          </form>

          <div className="mt-8 space-y-4 text-center">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="group flex items-center gap-2 text-primary-600 transition-all hover:scale-110">
                <div className="relative">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 bg-primary-400 rounded-full animate-ping opacity-75" />
                </div>
                <span className="font-medium">Multi-Layer Security</span>
              </div>
              <div className="group flex items-center gap-2 text-secondary-600 transition-all hover:scale-110">
                <div className="relative">
                  <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 bg-secondary-400 rounded-full animate-ping opacity-75" />
                </div>
                <span className="font-medium">24/7 Monitoring</span>
              </div>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-300/30 to-transparent" />
            <p className="text-xs text-muted-foreground/80 font-semibold tracking-wider uppercase">
              Authorized Personnel Only
            </p>
          </div>
        </CardContent>
      </InteractiveCard>
    </div>
  );
};

export default AdminAuth;
