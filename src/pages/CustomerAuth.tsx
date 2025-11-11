import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Mail, Lock, User, KeyRound } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CustomerAuth = () => {
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ 
    email: '', 
    password: '', 
    companyName: '', 
    fullName: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [activeTab, setActiveTab] = useState('signin');
  const { signIn, signUp, user, resetPassword, resendConfirmationEmail } = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Preserve query parameters through login for address requests
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    const orderNumber = params.get('orderNumber');
    
    if (orderId && orderNumber) {
      sessionStorage.setItem('pendingOrderId', orderId);
      sessionStorage.setItem('pendingOrderNumber', orderNumber);
    }
  }, [location.search]);

  const from = (location.state as any)?.from?.pathname || '/customer';

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          // Check if user is in admin whitelist
          const { data: isAllowed, error } = await supabase.rpc('is_allowed_admin_email', {
            user_email: user.email,
          });
          
          if (error) {
            console.error('[CustomerAuth] Error checking admin status:', error);
          } else if (isAllowed) {
            // Admin user - redirect to dashboard
            console.log('[CustomerAuth] Admin detected, redirecting to dashboard');
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch (error) {
          console.error('[CustomerAuth] Exception checking admin status:', error);
        }
        
        // Check if we have stored order context
        const storedOrderId = sessionStorage.getItem('pendingOrderId');
        const storedOrderNumber = sessionStorage.getItem('pendingOrderNumber');
        
        if (storedOrderId && storedOrderNumber) {
          // Clear from storage
          sessionStorage.removeItem('pendingOrderId');
          sessionStorage.removeItem('pendingOrderNumber');
          // Navigate with order context
          navigate(`/customer/addresses?orderId=${storedOrderId}&orderNumber=${encodeURIComponent(storedOrderNumber)}`, { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    };
    
    checkAdminStatus();
  }, [user, navigate, from]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('confirmed') === 'true') {
      toast({
        title: "Email Confirmed! ✅",
        description: "Your account is now active. Please sign in to continue.",
      });
      setActiveTab('signin');
    }
    if (params.get('reset') === 'true') {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });
    }
  }, [location.search, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      // Check if error is due to unconfirmed email
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        toast({
          variant: "destructive",
          title: "Email not confirmed",
          description: "Please check your email and click the confirmation link. Don't see it? Check your spam folder.",
          action: (
            <button
              onClick={async () => {
                const { error: resendError } = await resendConfirmationEmail(signInData.email);
                if (!resendError) {
                  toast({
                    title: "Confirmation email sent",
                    description: "Please check your email inbox.",
                  });
                } else {
                  toast({
                    variant: "destructive",
                    title: "Failed to resend email",
                    description: resendError.message,
                  });
                }
              }}
              className="text-sm underline hover:no-underline"
            >
              Resend
            </button>
          ),
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: error.message,
        });
      }
    } else {
      // Check if newly signed-in user is admin
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.email) {
          const { data: isAllowed, error: rpcError } = await supabase.rpc('is_allowed_admin_email', {
            user_email: currentUser.email,
          });
          
          if (rpcError) {
            console.error('[CustomerAuth] Error checking admin status:', rpcError);
          } else if (isAllowed) {
            toast({
              title: "Welcome, Administrator",
              description: "Redirecting to admin dashboard...",
            });
            navigate('/dashboard', { replace: true });
            setIsLoading(false);
            return;
          }
        }
      } catch (checkError) {
        console.error('[CustomerAuth] Exception checking admin status:', checkError);
      }
      
      // Will be handled by useEffect for non-admins
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(
      signUpData.email, 
      signUpData.password, 
      signUpData.companyName, 
      signUpData.fullName
    );

    if (error) {
      toast({
        variant: "destructive",
        title: "Account creation failed",
        description: error.message,
      });
    } else {
      // Check if admin email
      try {
        const { data: isAllowed, error: rpcError } = await supabase.rpc('is_allowed_admin_email', {
          user_email: signUpData.email,
        });
        
        if (rpcError) {
          console.error('[CustomerAuth] Error checking admin status:', rpcError);
          // Show default message on error
          toast({
            title: "Check your email to verify your account",
            description: "We've sent a confirmation link to your email address.",
            duration: 7000,
          });
        } else if (isAllowed) {
          toast({
            title: "Admin Account Created! 🎉",
            description: "You've been granted administrator access. Please check your email to confirm your account, then sign in to access the admin dashboard.",
            duration: 10000,
          });
        } else {
          toast({
            title: "Check your email to verify your account",
            description: "We've sent a confirmation link to your email address. Please click the link to activate your account.",
            duration: 7000,
          });
        }
      } catch (checkError) {
        console.error('[CustomerAuth] Exception checking admin status:', checkError);
        toast({
          title: "Check your email to verify your account",
          description: "We've sent a confirmation link to your email address.",
          duration: 7000,
        });
      }
      
      // Switch to sign-in tab so users know where to go after confirming
      setActiveTab('signin');
      // Clear the form
      setSignUpData({ fullName: '', companyName: '', email: '', password: '' });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions to reset your password. Don't forget to check your spam folder.",
        duration: 6000,
      });
      setShowForgotPassword(false);
      setResetEmail('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Customer Portal
              </CardTitle>
              <CardDescription>
                Access your account to manage orders and quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4 mt-6">
                  {!showForgotPassword ? (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-12"
                            value={signInData.email}
                            onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Password</Label>
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder="Enter your password"
                            className="pl-12"
                            value={signInData.password}
                            onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-12"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We'll send you a link to reset your password
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setResetEmail('');
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-12"
                          value={signUpData.fullName}
                          onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-company">Company Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-company"
                          type="text"
                          placeholder="Enter your company name"
                          className="pl-12"
                          value={signUpData.companyName}
                          onChange={(e) => setSignUpData({ ...signUpData, companyName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-12"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Create a password"
                          className="pl-12"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuth;