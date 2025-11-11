import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center px-4 pt-safe pb-safe 
                    bg-gradient-to-br from-[#E6F0FF] via-[#F8FBFF] to-white 
                    dark:from-[#0A1320] dark:via-[#0C1729] dark:to-[#0A1320]
                    motion-reduce:from-[#E6F0FF] motion-reduce:to-[#F8FBFF]
                    motion-reduce:dark:from-[#0A1320] motion-reduce:dark:to-[#0C1729]">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 
                    hover:text-[#0077B6] dark:hover:text-[#2AA6FF] mb-6 md:mb-8 
                    transition-colors motion-reduce:transition-none
                    min-h-[44px] touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="rounded-2xl shadow-md md:shadow-lg 
                        bg-white/90 dark:bg-slate-900/80 
                        backdrop-blur-sm 
                        border border-slate-200/60 dark:border-slate-800 
                        p-6 md:p-8
                        space-y-5 md:space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3 md:space-y-4">
            {/* Icon chip */}
            <div className="mx-auto mb-3 md:mb-4 inline-flex items-center justify-center 
                            w-14 h-14 md:w-16 md:h-16 rounded-full p-3 
                            bg-gradient-to-r from-[#0077B6] to-[#003366] 
                            shadow-md motion-reduce:shadow-sm">
              <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-semibold 
                          text-[#003366] dark:text-white 
                          text-center">
              Customer Portal
            </h1>

            {/* Subtitle */}
            <p className="text-sm md:text-base 
                          text-gray-500 dark:text-slate-400 
                          text-center mt-1">
              Manage your orders, quotes, and deliveries
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex gap-1 mt-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 rounded-full px-4 py-1.5 md:py-2 
                          text-sm md:text-[15px] font-medium 
                          transition-all duration-200 
                          motion-reduce:transition-none
                          min-h-[44px] touch-manipulation
                          ${activeTab === 'signin'
                            ? 'text-white bg-gradient-to-r from-[#0077B6] to-[#003366] shadow-md'
                            : 'text-gray-600 hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 rounded-full px-4 py-1.5 md:py-2 
                          text-sm md:text-[15px] font-medium 
                          transition-all duration-200 
                          motion-reduce:transition-none
                          min-h-[44px] touch-manipulation
                          ${activeTab === 'signup'
                            ? 'text-white bg-gradient-to-r from-[#0077B6] to-[#003366] shadow-md'
                            : 'text-gray-600 hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700'
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
                      className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                                text-gray-500 dark:text-slate-400 
                                font-medium pointer-events-none z-10">
                      Email Address
                    </label>
                    <Mail className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                    text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                    <input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                      aria-label="Email address"
                      className="w-full rounded-xl 
                                border border-gray-300 dark:border-slate-700 
                                bg-white dark:bg-slate-900 
                                pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                                text-sm md:text-[15px] 
                                text-slate-800 dark:text-slate-100 
                                placeholder-transparent
                                focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                                dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                                transition-colors motion-reduce:transition-none
                                min-h-[54px] md:min-h-[58px]
                                touch-manipulation"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="signin-password"
                      className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                                text-gray-500 dark:text-slate-400 
                                font-medium pointer-events-none z-10">
                      Password
                    </label>
                    <Lock className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                    text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                    <input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                      aria-label="Password"
                      className="w-full rounded-xl 
                                border border-gray-300 dark:border-slate-700 
                                bg-white dark:bg-slate-900 
                                pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                                text-sm md:text-[15px] 
                                text-slate-800 dark:text-slate-100 
                                placeholder-transparent
                                focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                                dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                                transition-colors motion-reduce:transition-none
                                min-h-[54px] md:min-h-[58px]
                                touch-manipulation"
                    />
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end -mt-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm md:text-[15px] 
                                text-[#0077B6] dark:text-[#2AA6FF] 
                                hover:underline
                                min-h-[44px] 
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-[#0077B6] dark:focus-visible:ring-[#2AA6FF] 
                                rounded px-2">
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className="w-full py-2.5 md:py-3 rounded-full 
                              bg-gradient-to-r from-[#0077B6] to-[#003366] 
                              text-white font-semibold text-base tracking-wide
                              hover:from-[#00629b] hover:to-[#002b66] 
                              active:scale-95 
                              disabled:opacity-60 disabled:cursor-not-allowed
                              transition-all duration-200 
                              motion-reduce:transition-none motion-reduce:active:scale-100
                              min-h-[48px] md:min-h-[52px]
                              shadow-md hover:shadow-lg
                              touch-manipulation
                              focus-visible:outline-none focus-visible:ring-2 
                              focus-visible:ring-[#0077B6] focus-visible:ring-offset-2 
                              dark:focus-visible:ring-[#2AA6FF]">
                    {isLoading && (
                      <svg className="inline-block w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {/* Reset Email Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="reset-email"
                      className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                                text-gray-500 dark:text-slate-400 
                                font-medium pointer-events-none z-10">
                      Email Address
                    </label>
                    <KeyRound className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                        text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      aria-label="Email address for password reset"
                      className="w-full rounded-xl 
                                border border-gray-300 dark:border-slate-700 
                                bg-white dark:bg-slate-900 
                                pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                                text-sm md:text-[15px] 
                                text-slate-800 dark:text-slate-100 
                                placeholder-transparent
                                focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                                dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                                transition-colors motion-reduce:transition-none
                                min-h-[54px] md:min-h-[58px]
                                touch-manipulation"
                    />
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-2">
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
                      className="flex-1 py-2.5 md:py-3 rounded-full 
                                border-2 border-slate-300 dark:border-slate-600 
                                text-slate-700 dark:text-slate-300 
                                font-medium text-base
                                hover:bg-slate-100 dark:hover:bg-slate-800
                                active:scale-95
                                transition-all duration-200 
                                motion-reduce:transition-none motion-reduce:active:scale-100
                                min-h-[48px] md:min-h-[52px]
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      aria-busy={isLoading}
                      className="flex-1 py-2.5 md:py-3 rounded-full 
                                bg-gradient-to-r from-[#0077B6] to-[#003366] 
                                text-white font-semibold text-base tracking-wide
                                hover:from-[#00629b] hover:to-[#002b66] 
                                active:scale-95 
                                disabled:opacity-60 disabled:cursor-not-allowed
                                transition-all duration-200 
                                motion-reduce:transition-none motion-reduce:active:scale-100
                                min-h-[48px] md:min-h-[52px]
                                shadow-md hover:shadow-lg
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-[#0077B6] focus-visible:ring-offset-2 
                                dark:focus-visible:ring-[#2AA6FF]">
                      {isLoading && (
                        <svg className="inline-block w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
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
                    className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                              text-gray-500 dark:text-slate-400 
                              font-medium pointer-events-none z-10">
                    Full Name
                  </label>
                  <User className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                  text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                  <input
                    id="signup-name"
                    type="text"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                    aria-label="Full name"
                    className="w-full rounded-xl 
                              border border-gray-300 dark:border-slate-700 
                              bg-white dark:bg-slate-900 
                              pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                              text-sm md:text-[15px] 
                              text-slate-800 dark:text-slate-100 
                              placeholder-transparent
                              focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                              dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                              transition-colors motion-reduce:transition-none
                              min-h-[54px] md:min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Company Name Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-company"
                    className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                              text-gray-500 dark:text-slate-400 
                              font-medium pointer-events-none z-10">
                    Company Name
                  </label>
                  <Building2 className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                        text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                  <input
                    id="signup-company"
                    type="text"
                    value={signUpData.companyName}
                    onChange={(e) => setSignUpData({ ...signUpData, companyName: e.target.value })}
                    required
                    aria-label="Company name"
                    className="w-full rounded-xl 
                              border border-gray-300 dark:border-slate-700 
                              bg-white dark:bg-slate-900 
                              pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                              text-sm md:text-[15px] 
                              text-slate-800 dark:text-slate-100 
                              placeholder-transparent
                              focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                              dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                              transition-colors motion-reduce:transition-none
                              min-h-[54px] md:min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Email Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-email"
                    className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                              text-gray-500 dark:text-slate-400 
                              font-medium pointer-events-none z-10">
                    Email Address
                  </label>
                  <Mail className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                  text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                  <input
                    id="signup-email"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    aria-label="Email address"
                    className="w-full rounded-xl 
                              border border-gray-300 dark:border-slate-700 
                              bg-white dark:bg-slate-900 
                              pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                              text-sm md:text-[15px] 
                              text-slate-800 dark:text-slate-100 
                              placeholder-transparent
                              focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                              dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                              transition-colors motion-reduce:transition-none
                              min-h-[54px] md:min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Password Input */}
                <div className="relative mb-4 md:mb-5">
                  <label 
                    htmlFor="signup-password"
                    className="absolute left-3 top-1.5 text-[11px] md:text-xs 
                              text-gray-500 dark:text-slate-400 
                              font-medium pointer-events-none z-10">
                    Password
                  </label>
                  <Lock className="absolute left-3 top-3 md:top-3.5 h-4 w-4 
                                  text-[#0077B6] dark:text-[#2AA6FF] z-10" />
                  <input
                    id="signup-password"
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    aria-label="Password"
                    className="w-full rounded-xl 
                              border border-gray-300 dark:border-slate-700 
                              bg-white dark:bg-slate-900 
                              pl-10 pr-3 pt-6 pb-2 md:pt-7 md:pb-2.5
                              text-sm md:text-[15px] 
                              text-slate-800 dark:text-slate-100 
                              placeholder-transparent
                              focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6]/40 
                              dark:focus:border-[#2AA6FF] dark:focus:ring-[#2AA6FF]/30
                              transition-colors motion-reduce:transition-none
                              min-h-[54px] md:min-h-[58px]
                              touch-manipulation"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="w-full py-2.5 md:py-3 rounded-full 
                            bg-gradient-to-r from-[#0077B6] to-[#003366] 
                            text-white font-semibold text-base tracking-wide
                            hover:from-[#00629b] hover:to-[#002b66] 
                            active:scale-95 
                            disabled:opacity-60 disabled:cursor-not-allowed
                            transition-all duration-200 
                            motion-reduce:transition-none motion-reduce:active:scale-100
                            min-h-[48px] md:min-h-[52px]
                            shadow-md hover:shadow-lg
                            touch-manipulation
                            focus-visible:outline-none focus-visible:ring-2 
                            focus-visible:ring-[#0077B6] focus-visible:ring-offset-2 
                            dark:focus-visible:ring-[#2AA6FF]">
                  {isLoading && (
                    <svg className="inline-block w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isLoading ? 'Creating Account...' : 'Create Account'}
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