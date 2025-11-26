import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Lock, User, Eye, EyeOff, Loader2, Shield, ArrowRight } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MFAVerificationModal } from '@/components/security/MFAVerificationModal';

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
  const [showSetNewPassword, setShowSetNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp, user, resetPassword, resendConfirmationEmail, requiresMFA, mfaUserId, verifyMFA, cancelMFA } = useCustomerAuth();
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
      // Only proceed with navigation if user is authenticated AND MFA is not pending
      if (user && !requiresMFA) {
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
  }, [user, requiresMFA, navigate, from]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isReset = params.get('reset') === 'true';
    
    if (params.get('confirmed') === 'true') {
      toast({
        title: "Email Confirmed! ✅",
        description: "Your account is now active. Please sign in to continue.",
      });
      setActiveTab('signin');
    }
    
    // Check if user came from password reset email
    if (isReset) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // User clicked reset link and has a valid session - show set password form
          setShowSetNewPassword(true);
          setActiveTab('signin');
        } else {
          // User came to page with reset=true but no session - expired link
          toast({
            variant: "destructive",
            title: "Reset link expired",
            description: "Please request a new password reset link.",
          });
        }
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

  const handleMFAVerified = async (trustDevice: boolean) => {
    try {
      await verifyMFA(trustDevice);
      toast({
        title: "MFA Verified",
        description: "You have been successfully authenticated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "MFA Verification Failed",
        description: "Please try again.",
      });
    }
  };

  const handleMFACancel = () => {
    cancelMFA();
    toast({
      title: "Login Cancelled",
      description: "MFA verification was cancelled.",
    });
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
      });
      return;
    }
    
    // Validate password length
    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to update password",
        description: error.message,
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Password updated successfully! ✅",
        description: "You can now use your new password to sign in.",
      });
      
      // Clear form and reset state
      setNewPassword('');
      setConfirmPassword('');
      setShowSetNewPassword(false);
      
      // Clear URL parameters and redirect to customer portal
      navigate('/customer', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 
                    bg-gradient-to-br from-[hsl(var(--portal-bg-gradient-start))] 
                    to-[hsl(var(--portal-bg-gradient-end))]
                    relative overflow-hidden">
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{
             backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--portal-primary-500)) 1px, transparent 0)`,
             backgroundSize: '32px 32px'
           }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md portal-animate-in">
        <Link
          to="/"
          className="inline-flex items-center gap-2 
                     text-[hsl(var(--portal-subtext))] 
                     hover:text-[hsl(var(--portal-primary-500))]
                     mb-8 transition-all duration-200
                     text-sm font-medium
                     group
                     focus-visible:outline-none 
                     focus-visible:ring-2 
                     focus-visible:ring-[hsl(var(--portal-primary-500))] 
                     focus-visible:ring-offset-2 
                     focus-visible:ring-offset-[hsl(var(--portal-bg))]
                     rounded-lg px-3 py-2 -ml-3"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>

        <div className="rounded-3xl 
                        bg-[hsl(var(--portal-surface))] 
                        shadow-[var(--portal-shadow-xl)]
                        border border-[hsl(var(--portal-border))]
                        p-8 md:p-10
                        transition-all duration-300
                        hover:shadow-[0_25px_50px_rgba(8,132,255,0.15),0_10px_20px_rgba(0,0,0,0.1)]
                        space-y-8
                        portal-card-scale">
          
          {/* Header Section */}
          <div className="text-center space-y-6">
            {/* Enterprise Icon with Glow Effect */}
            <div className="mx-auto w-16 h-16 rounded-2xl 
                            bg-gradient-to-br from-[hsl(var(--portal-primary-500))] 
                            to-[hsl(var(--portal-teal-500))]
                            shadow-[0_8px_32px_rgba(8,132,255,0.3)]
                            flex items-center justify-center
                            relative
                            portal-icon-glow
                            transition-shadow duration-300">
              {/* Glow ring effect */}
              <div className="absolute inset-0 rounded-2xl 
                              bg-gradient-to-br from-[hsl(var(--portal-primary-500))] 
                              to-[hsl(var(--portal-teal-500))]
                              opacity-30 blur-xl animate-pulse" />
              
              {/* Icon */}
              <Shield className="w-8 h-8 text-white relative z-10" />
            </div>

            {/* Welcome Text */}
            <div className="space-y-2">
              <h1 className="portal-title">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Your Account'}
              </h1>
              <p className="portal-subtitle max-w-sm mx-auto">
                {activeTab === 'signin' 
                  ? 'Sign in to manage your orders, quotes, and deliveries' 
                  : 'Get started with Trust Link Ventures today'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          {!showForgotPassword && (
            <div className="relative bg-[hsl(var(--portal-bg-subtle))] 
                            p-1.5 rounded-2xl 
                            border border-[hsl(var(--portal-border))]
                            shadow-inner">
              <div className="flex gap-1.5 relative z-10">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`
                    flex-1 rounded-xl px-6 py-3.5
                    text-sm font-semibold
                    transition-all duration-300
                    touch-manipulation min-h-[50px]
                    focus-visible:outline-none 
                    focus-visible:ring-2 
                    focus-visible:ring-[hsl(var(--portal-primary-500))] 
                    focus-visible:ring-offset-2
                    ${activeTab === 'signin'
                      ? 'bg-gradient-to-r from-[hsl(var(--portal-primary-500))] to-[hsl(var(--portal-primary-600))] text-white shadow-lg shadow-[hsl(var(--portal-primary-500))]/30 scale-[1.02]'
                      : 'text-[hsl(var(--portal-subtext))] hover:bg-white/60 hover:text-[hsl(var(--portal-text))]'
                    }
                  `}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`
                    flex-1 rounded-xl px-6 py-3.5
                    text-sm font-semibold
                    transition-all duration-300
                    touch-manipulation min-h-[50px]
                    focus-visible:outline-none 
                    focus-visible:ring-2 
                    focus-visible:ring-[hsl(var(--portal-primary-500))] 
                    focus-visible:ring-offset-2
                    ${activeTab === 'signup'
                      ? 'bg-gradient-to-r from-[hsl(var(--portal-primary-500))] to-[hsl(var(--portal-primary-600))] text-white shadow-lg shadow-[hsl(var(--portal-primary-500))]/30 scale-[1.02]'
                      : 'text-[hsl(var(--portal-subtext))] hover:bg-white/60 hover:text-[hsl(var(--portal-text))]'
                    }
                  `}
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
                
          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <div className="space-y-4 mt-6">
              {showSetNewPassword ? (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-tl-text mb-2">
                      Set Your New Password
                    </h2>
                    <p className="text-sm text-tl-muted">
                      Choose a strong password to secure your account
                    </p>
                  </div>

                  {/* New Password Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="new-password"
                      className="absolute left-3 top-2 text-xs 
                                text-tl-muted 
                                font-medium pointer-events-none z-10">
                      New Password
                    </label>
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                    text-tl-accent z-10" />
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      aria-label="New password"
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
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 
                                text-tl-muted hover:text-tl-accent transition-colors
                                min-h-[44px] min-w-[44px] flex items-center justify-center
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-tl-accent rounded"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="relative mb-4 md:mb-5">
                    <label 
                      htmlFor="confirm-password"
                      className="absolute left-3 top-2 text-xs 
                                text-tl-muted 
                                font-medium pointer-events-none z-10">
                      Confirm Password
                    </label>
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                    text-tl-accent z-10" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      aria-label="Confirm password"
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
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 
                                text-tl-muted hover:text-tl-accent transition-colors
                                min-h-[44px] min-w-[44px] flex items-center justify-center
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-tl-accent rounded"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  <div className="bg-tl-bg-subtle rounded-lg p-3 mb-4">
                    <p className="text-xs text-tl-muted">
                      Password must be at least 8 characters long
                    </p>
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
                        Updating Password...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              ) : !showForgotPassword ? (
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
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
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

      {/* MFA Verification Modal */}
      {requiresMFA && mfaUserId && (
        <MFAVerificationModal
          open={requiresMFA}
          onOpenChange={(open) => !open && handleMFACancel()}
          userId={mfaUserId}
          onVerified={handleMFAVerified}
          onCancel={handleMFACancel}
        />
      )}
    </div>
  );
};

export default CustomerAuth;