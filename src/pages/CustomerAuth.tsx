import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Lock, User, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
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
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center px-4 pt-safe pb-safe 
                    bg-gradient-to-b from-tl-bg via-[#F4F7FB] to-[#EAF1FF]">
      <div className="w-full max-w-sm sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-tl-muted 
                    hover:text-tl-accent mb-6 md:mb-8 
                    transition-colors rounded px-2
                    min-h-[44px] touch-manipulation
                    focus-visible:outline-none focus-visible:ring-2 
                    focus-visible:ring-tl-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="rounded-2xl shadow-lg 
                        bg-tl-surface 
                        backdrop-blur-sm 
                        border border-tl-border 
                        hover:shadow-xl transition-shadow duration-300
                        p-6 md:p-8
                        space-y-5 md:space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3 md:space-y-4">
            {/* Icon chip */}
            <div className="mx-auto mb-3 md:mb-4 inline-flex items-center justify-center 
                            w-14 h-14 md:w-16 md:h-16 rounded-full p-3 
                            tl-gradient shadow-md">
              <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-semibold 
                          text-tl-primary 
                          text-center">
              Customer Portal
            </h1>

            {/* Subtitle */}
            <p className="text-sm md:text-base 
                          text-tl-muted 
                          text-center mt-1">
              Manage your orders, quotes, and deliveries
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-tl-bg border border-tl-border p-1 rounded-full flex gap-1 mt-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 rounded-full px-4 py-2 
                          text-sm md:text-[15px] font-medium 
                          transition-all duration-200 
                          min-h-[44px] touch-manipulation
                          ${activeTab === 'signin'
                            ? 'text-white tl-gradient shadow-md'
                            : 'text-tl-muted hover:bg-tl-surface'
                          }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 rounded-full px-4 py-2 
                          text-sm md:text-[15px] font-medium 
                          transition-all duration-200 
                          min-h-[44px] touch-manipulation
                          ${activeTab === 'signup'
                            ? 'text-white tl-gradient shadow-md'
                            : 'text-tl-muted hover:bg-tl-surface'
                          }`}
            >
              Create Account
            </button>
          </div>
                
          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <div className="space-y-4 mt-6">
              {!showForgotPassword ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="signin-email"
                      className="absolute left-3 top-2 text-xs 
                                text-tl-muted 
                                font-medium pointer-events-none z-10">
                      Email Address
                    </label>
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                    text-tl-accent z-10" />
                    <input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                      aria-label="Email address"
                      aria-required="true"
                      className="w-full rounded-lg 
                                border border-tl-border 
                                bg-tl-surface 
                                pl-10 pr-3 pt-7 pb-3
                                text-sm 
                                text-tl-text 
                                placeholder-transparent
                                focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                                transition-colors
                                min-h-[58px]
                                touch-manipulation"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="signin-password"
                      className="absolute left-3 top-2 text-xs 
                                text-tl-muted 
                                font-medium pointer-events-none z-10">
                      Password
                    </label>
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                    text-tl-accent z-10" />
                    <input
                      id="signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                      aria-label="Password"
                      aria-required="true"
                      className="w-full rounded-lg 
                                border border-tl-border 
                                bg-tl-surface 
                                pl-10 pr-12 pt-7 pb-3
                                text-sm 
                                text-tl-text 
                                placeholder-transparent
                                focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                                transition-colors
                                min-h-[58px]
                                touch-manipulation"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 
                                text-tl-muted hover:text-tl-accent transition-colors
                                min-h-[44px] min-w-[44px] flex items-center justify-center
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-tl-accent rounded"
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end -mt-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm 
                                text-tl-accent 
                                hover:text-tl-accent-hover hover:underline
                                min-h-[44px] px-2
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-tl-accent 
                                rounded">
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className="w-full py-3 rounded-lg 
                              tl-gradient 
                              text-white font-semibold text-base
                              shadow-md hover:opacity-95 
                              disabled:opacity-50 disabled:cursor-not-allowed
                              transition-all duration-200 
                              min-h-[50px]
                              touch-manipulation
                              focus-visible:outline-none focus-visible:ring-2 
                              focus-visible:ring-tl-accent focus-visible:ring-offset-2">
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {/* Reset Email Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="reset-email"
                      className="absolute left-3 top-2 text-xs 
                                text-tl-muted 
                                font-medium pointer-events-none z-10">
                      Email Address
                    </label>
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                        text-tl-accent z-10" />
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      aria-label="Email address for password reset"
                      aria-required="true"
                      className="w-full rounded-lg 
                                border border-tl-border 
                                bg-tl-surface 
                                pl-10 pr-3 pt-7 pb-3
                                text-sm 
                                text-tl-text 
                                placeholder-transparent
                                focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                                transition-colors
                                min-h-[58px]
                                touch-manipulation"
                    />
                    <p className="text-xs text-tl-muted mt-2">
                      We'll send you a link to reset your password
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                      }}
                      className="flex-1 py-3 rounded-lg 
                                border border-tl-border 
                                text-tl-text 
                                font-medium text-base
                                hover:bg-tl-bg
                                transition-all duration-200 
                                min-h-[50px]
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-tl-accent focus-visible:ring-offset-2">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      aria-busy={isLoading}
                      className="flex-1 py-3 rounded-lg 
                                tl-gradient 
                                text-white font-semibold text-base
                                shadow-md hover:opacity-95 
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200 
                                min-h-[50px]
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-tl-accent focus-visible:ring-offset-2">
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
                
          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <div className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full Name Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-name"
                    className="absolute left-3 top-2 text-xs 
                              text-tl-muted 
                              font-medium pointer-events-none z-10">
                    Full Name
                  </label>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                  text-tl-accent z-10" />
                  <input
                    id="signup-name"
                    type="text"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                    aria-label="Full name"
                    aria-required="true"
                    className="w-full rounded-lg 
                              border border-tl-border 
                              bg-tl-surface 
                              pl-10 pr-3 pt-7 pb-3
                              text-sm 
                              text-tl-text 
                              placeholder-transparent
                              focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                              transition-colors
                              min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Company Name Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-company"
                    className="absolute left-3 top-2 text-xs 
                              text-tl-muted 
                              font-medium pointer-events-none z-10">
                    Company Name
                  </label>
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                        text-tl-accent z-10" />
                  <input
                    id="signup-company"
                    type="text"
                    value={signUpData.companyName}
                    onChange={(e) => setSignUpData({ ...signUpData, companyName: e.target.value })}
                    required
                    aria-label="Company name"
                    aria-required="true"
                    className="w-full rounded-lg 
                              border border-tl-border 
                              bg-tl-surface 
                              pl-10 pr-3 pt-7 pb-3
                              text-sm 
                              text-tl-text 
                              placeholder-transparent
                              focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                              transition-colors
                              min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Email Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-email"
                    className="absolute left-3 top-2 text-xs 
                              text-tl-muted 
                              font-medium pointer-events-none z-10">
                    Email Address
                  </label>
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                  text-tl-accent z-10" />
                  <input
                    id="signup-email"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    aria-label="Email address"
                    aria-required="true"
                    className="w-full rounded-lg 
                              border border-tl-border 
                              bg-tl-surface 
                              pl-10 pr-3 pt-7 pb-3
                              text-sm 
                              text-tl-text 
                              placeholder-transparent
                              focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                              transition-colors
                              min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Password Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-password"
                    className="absolute left-3 top-2 text-xs 
                              text-tl-muted 
                              font-medium pointer-events-none z-10">
                    Password
                  </label>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                  text-tl-accent z-10" />
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    aria-label="Password"
                    aria-required="true"
                    className="w-full rounded-lg 
                              border border-tl-border 
                              bg-tl-surface 
                              pl-10 pr-12 pt-7 pb-3
                              text-sm 
                              text-tl-text 
                              placeholder-transparent
                              focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 
                              transition-colors
                              min-h-[58px]
                              touch-manipulation"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 
                              text-tl-muted hover:text-tl-accent transition-colors
                              min-h-[44px] min-w-[44px] flex items-center justify-center
                              focus-visible:outline-none focus-visible:ring-2 
                              focus-visible:ring-tl-accent rounded"
                    aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="w-full py-3 rounded-lg 
                            tl-gradient 
                            text-white font-semibold text-base
                            shadow-md hover:opacity-95 
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 
                            min-h-[50px]
                            touch-manipulation
                            focus-visible:outline-none focus-visible:ring-2 
                            focus-visible:ring-tl-accent focus-visible:ring-offset-2">
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerAuth;