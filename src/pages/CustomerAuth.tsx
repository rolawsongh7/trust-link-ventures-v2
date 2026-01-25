import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Lock, User, Eye, EyeOff, Loader2, Shield, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getNativeHomeUrl } from '@/utils/env';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MFAVerificationModal } from '@/components/security/MFAVerificationModal';
import trustLinkLogo from '@/assets/trust-link-logo.png';
import authBackground from '@/assets/auth-background.jpg';

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
      // Verify actual session state before showing success
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email_confirmed_at) {
          toast({
            title: "Email Confirmed! ✅",
            description: "Your account is now active. Please sign in to continue.",
          });
        } else {
          toast({
            title: "Confirmation Pending",
            description: "Please check your email and click the confirmation link again. If issues persist, try signing in and requesting a new confirmation email.",
            variant: "default"
          });
        }
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
      // Update last_password_changed in customers table
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.email) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .ilike('email', currentUser.email)
          .maybeSingle();

        if (customer?.id) {
          await supabase
            .from('customers')
            .update({ last_password_changed: new Date().toISOString() })
            .eq('id', customer.id);

          // Log password reset event
          await supabase.from('audit_logs').insert({
            user_id: currentUser.id,
            event_type: 'password_change',
            event_data: { method: 'email_reset' },
            severity: 'medium'
          });
        }
      }

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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 
                    relative overflow-hidden">
      
      {/* Premium Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${authBackground})` }}
      />
      
      {/* Dark Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90" />
      
      {/* Animated Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md portal-animate-in">
        <Link
          to={getNativeHomeUrl()}
          className="inline-flex items-center gap-2 
                     text-white/70
                     hover:text-amber-400
                     mb-6 transition-all duration-200
                     text-sm font-medium
                     group
                     focus-visible:outline-none 
                     focus-visible:ring-2 
                     focus-visible:ring-amber-400 
                     focus-visible:ring-offset-2 
                     focus-visible:ring-offset-transparent
                     rounded-lg px-3 py-2 -ml-3
                     backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>

        {/* Glassmorphism Card */}
        <div className="rounded-3xl 
                        bg-white/95 dark:bg-slate-900/95
                        backdrop-blur-xl
                        shadow-[0_25px_60px_rgba(0,0,0,0.3),0_10px_20px_rgba(0,0,0,0.2)]
                        border border-white/20
                        p-8 md:p-10
                        transition-all duration-500
                        hover:shadow-[0_30px_70px_rgba(0,0,0,0.35),0_0_40px_rgba(245,158,11,0.1)]
                        space-y-6">
          
          {/* Header Section */}
          <div className="text-center space-y-5">
            {/* Trust Link Logo with Gold Glow */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              {/* Gold glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/20 blur-2xl animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent blur-xl" />
              
              {/* Logo Container */}
              <div className="relative w-20 h-20 rounded-2xl 
                              bg-gradient-to-br from-slate-800 to-slate-900
                              shadow-[0_8px_32px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]
                              flex items-center justify-center
                              border border-amber-500/20
                              overflow-hidden">
                <img 
                  src={trustLinkLogo} 
                  alt="Trust Link Ventures" 
                  className="w-14 h-14 object-contain"
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold 
                             bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 
                             dark:from-white dark:via-amber-100 dark:to-white
                             bg-clip-text text-transparent">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Your Account'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {activeTab === 'signin' 
                  ? 'Sign in to manage your orders, quotes, and deliveries' 
                  : 'Join Ghana\'s trusted frozen food distribution network'}
              </p>
            </div>
          </div>

          {/* Tab Switcher - Premium Style */}
          {!showForgotPassword && !showSetNewPassword && (
            <div className="relative bg-slate-100 dark:bg-slate-800/50
                            p-1.5 rounded-2xl 
                            border border-slate-200/50 dark:border-slate-700/50
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
                    focus-visible:ring-amber-500 
                    focus-visible:ring-offset-2
                    ${activeTab === 'signin'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-white'
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
                    focus-visible:ring-amber-500 
                    focus-visible:ring-offset-2
                    ${activeTab === 'signup'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-white'
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
                  <div className="relative mb-4 md:mb-5 group">
                    <label 
                      htmlFor="signin-email"
                      className="absolute left-3 top-2 text-xs 
                                text-slate-500 dark:text-slate-400
                                font-medium pointer-events-none z-10">
                      Email Address
                    </label>
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                    text-amber-500 z-10 transition-colors group-focus-within:text-amber-600" />
                    <input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                      aria-label="Email address"
                      aria-required="true"
                      className="w-full rounded-xl 
                                border border-slate-200 dark:border-slate-700
                                bg-slate-50 dark:bg-slate-800/50
                                pl-10 pr-3 pt-7 pb-3
                                text-sm 
                                text-slate-800 dark:text-white
                                placeholder-transparent
                                focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                                focus:bg-white dark:focus:bg-slate-800
                                transition-all duration-200
                                min-h-[58px]
                                touch-manipulation
                                shadow-sm"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative mb-4 md:mb-5 group">
                    <label 
                      htmlFor="signin-password"
                      className="absolute left-3 top-2 text-xs 
                                text-slate-500 dark:text-slate-400
                                font-medium pointer-events-none z-10">
                      Password
                    </label>
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                    text-amber-500 z-10 transition-colors group-focus-within:text-amber-600" />
                    <input
                      id="signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                      aria-label="Password"
                      aria-required="true"
                      className="w-full rounded-xl 
                                border border-slate-200 dark:border-slate-700
                                bg-slate-50 dark:bg-slate-800/50
                                pl-10 pr-12 pt-7 pb-3
                                text-sm 
                                text-slate-800 dark:text-white
                                placeholder-transparent
                                focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                                focus:bg-white dark:focus:bg-slate-800
                                transition-all duration-200
                                min-h-[58px]
                                touch-manipulation
                                shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 
                                text-slate-400 hover:text-amber-500 transition-colors
                                min-h-[44px] min-w-[44px] flex items-center justify-center
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-amber-500 rounded"
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
                                text-amber-600 dark:text-amber-400
                                hover:text-amber-700 dark:hover:text-amber-300 hover:underline
                                min-h-[44px] px-2
                                touch-manipulation
                                focus-visible:outline-none focus-visible:ring-2 
                                focus-visible:ring-amber-500 
                                rounded">
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button - Premium Gold Gradient */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className="w-full py-3.5 rounded-xl 
                              bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600
                              text-white font-semibold text-base
                              shadow-lg shadow-amber-500/30
                              hover:shadow-xl hover:shadow-amber-500/40
                              hover:from-amber-600 hover:to-amber-700
                              disabled:opacity-50 disabled:cursor-not-allowed
                              transition-all duration-300 
                              min-h-[52px]
                              touch-manipulation
                              focus-visible:outline-none focus-visible:ring-2 
                              focus-visible:ring-amber-500 focus-visible:ring-offset-2
                              active:scale-[0.98]
                              relative overflow-hidden
                              group">
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {isLoading ? (
                      <span className="flex items-center justify-center relative z-10">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="relative z-10">Sign In</span>
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
                <div className="relative mb-4 md:mb-5 group">
                  <label 
                    htmlFor="signup-name"
                    className="absolute left-3 top-2 text-xs 
                              text-slate-500 dark:text-slate-400
                              font-medium pointer-events-none z-10">
                    Full Name
                  </label>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                  text-amber-500 z-10 transition-colors group-focus-within:text-amber-600" />
                  <input
                    id="signup-name"
                    type="text"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                    aria-label="Full name"
                    aria-required="true"
                    className="w-full rounded-xl 
                              border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800/50
                              pl-10 pr-3 pt-7 pb-3
                              text-sm 
                              text-slate-800 dark:text-white
                              placeholder-transparent
                              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                              focus:bg-white dark:focus:bg-slate-800
                              transition-all duration-200
                              min-h-[58px]
                              touch-manipulation
                              shadow-sm"
                  />
                </div>

                {/* Company Name Input */}
                <div className="relative mb-4 md:mb-5 group">
                  <label 
                    htmlFor="signup-company"
                    className="absolute left-3 top-2 text-xs 
                              text-slate-500 dark:text-slate-400
                              font-medium pointer-events-none z-10">
                    Company Name
                  </label>
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                        text-amber-500 z-10 transition-colors group-focus-within:text-amber-600" />
                  <input
                    id="signup-company"
                    type="text"
                    value={signUpData.companyName}
                    onChange={(e) => setSignUpData({ ...signUpData, companyName: e.target.value })}
                    required
                    aria-label="Company name"
                    aria-required="true"
                    className="w-full rounded-xl 
                              border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800/50
                              pl-10 pr-3 pt-7 pb-3
                              text-sm 
                              text-slate-800 dark:text-white
                              placeholder-transparent
                              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                              focus:bg-white dark:focus:bg-slate-800
                              transition-all duration-200
                              min-h-[58px]
                              touch-manipulation
                              shadow-sm"
                  />
                </div>

                {/* Email Input */}
                <div className="relative mb-4 md:mb-5 group">
                  <label 
                    htmlFor="signup-email"
                    className="absolute left-3 top-2 text-xs 
                              text-slate-500 dark:text-slate-400
                              font-medium pointer-events-none z-10">
                    Email Address
                  </label>
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                  text-amber-500 z-10 transition-colors group-focus-within:text-amber-600" />
                  <input
                    id="signup-email"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    aria-label="Email address"
                    aria-required="true"
                    className="w-full rounded-xl 
                              border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800/50
                              pl-10 pr-3 pt-7 pb-3
                              text-sm 
                              text-slate-800 dark:text-white
                              placeholder-transparent
                              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                              focus:bg-white dark:focus:bg-slate-800
                              transition-all duration-200
                              min-h-[58px]
                              touch-manipulation
                              shadow-sm"
                  />
                </div>

                {/* Password Input */}
                <div className="relative mb-4 md:mb-5 group">
                  <label 
                    htmlFor="signup-password"
                    className="absolute left-3 top-2 text-xs 
                              text-slate-500 dark:text-slate-400
                              font-medium pointer-events-none z-10">
                    Password
                  </label>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 h-4 w-4 
                                  text-amber-500 z-10 transition-colors group-focus-within:text-amber-600" />
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    aria-label="Password"
                    aria-required="true"
                    className="w-full rounded-xl 
                              border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800/50
                              pl-10 pr-12 pt-7 pb-3
                              text-sm 
                              text-slate-800 dark:text-white
                              placeholder-transparent
                              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                              focus:bg-white dark:focus:bg-slate-800
                              transition-all duration-200
                              min-h-[58px]
                              touch-manipulation
                              shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 
                              text-slate-400 hover:text-amber-500 transition-colors
                              min-h-[44px] min-w-[44px] flex items-center justify-center
                              focus-visible:outline-none focus-visible:ring-2 
                              focus-visible:ring-amber-500 rounded"
                    aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Submit Button - Premium Gold Gradient */}
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="w-full py-3.5 rounded-xl 
                            bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600
                            text-white font-semibold text-base
                            shadow-lg shadow-amber-500/30
                            hover:shadow-xl hover:shadow-amber-500/40
                            hover:from-amber-600 hover:to-amber-700
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-300 
                            min-h-[52px]
                            touch-manipulation
                            focus-visible:outline-none focus-visible:ring-2 
                            focus-visible:ring-amber-500 focus-visible:ring-offset-2
                            active:scale-[0.98]
                            relative overflow-hidden
                            group">
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {isLoading ? (
                    <span className="flex items-center justify-center relative z-10">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    <span className="relative z-10">Create Account</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Trust Badges - Enterprise Security Indicators */}
          <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/30">
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>SSL Encrypted</span>
              </div>
            </div>
            
            {/* Trusted Partners Badge */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Trusted by <span className="font-semibold text-slate-700 dark:text-white">500+</span> businesses
              </span>
            </div>
          </div>
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