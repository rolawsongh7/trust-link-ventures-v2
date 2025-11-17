import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import trustLinkLogo from '@/assets/trust-link-logo.png';

const UnifiedAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn: adminSignIn, signUp: adminSignUp, user: adminUser } = useAuth();
  const { signIn: customerSignIn, signUp: customerSignUp, user: customerUser } = useCustomerAuth();
  const { role, loading: roleLoading } = useRoleAuth();

  // Route authenticated users to their appropriate portal
  useEffect(() => {
    const routeUser = async () => {
      console.log('[UnifiedAuth] Routing check:', { 
        adminUser: !!adminUser, 
        customerUser: !!customerUser, 
        role, 
        roleLoading 
      });

      // Wait until role has been resolved to avoid misrouting to customer portal
      if (roleLoading) {
        console.log('[UnifiedAuth] Waiting for role to load');
        return;
      }

      // Check if user is authenticated
      const authenticatedUser = adminUser || customerUser;
      if (!authenticatedUser) {
        console.log('[UnifiedAuth] No authenticated user');
        return;
      }

      console.log('[UnifiedAuth] Authenticated user detected, role:', role);

      // PRIORITY 1: Check for admin role
      if (role === 'admin') {
        console.log('[UnifiedAuth] Navigating to dashboard (admin role)');
        navigate('/dashboard', { replace: true });
        return;
      }

      // PRIORITY 2: Check if user is in admin whitelist
      if (adminUser?.email) {
        try {
          const { data: isAllowed } = await supabase.rpc('is_allowed_admin_email', {
            user_email: adminUser.email,
          });
          
          if (isAllowed) {
            console.log('[UnifiedAuth] Navigating to dashboard (whitelisted)');
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch (error) {
          console.error('[UnifiedAuth] Error checking admin whitelist:', error);
        }
      }

      // PRIORITY 3: If authenticated but not admin, route to customer portal
      console.log('[UnifiedAuth] Non-admin user, navigating to /portal');
      navigate('/portal', { replace: true });
    };

    routeUser();
  }, [adminUser, customerUser, role, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        console.log('[UnifiedAuth] Starting login for:', email);
        
        // Use Supabase directly for simpler auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('[UnifiedAuth] Login result:', { success: !!data.user, error: error?.message });
        
        if (error) {
          console.error('[UnifiedAuth] Login failed:', error);
          toast({
            title: "Login failed",
            description: error.message || "Invalid email or password. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (data.user) {
          console.log('[UnifiedAuth] Login successful for user:', data.user.id);
          
          toast({ 
            title: 'Welcome back!', 
            description: 'Loading your dashboard...' 
          });
          
          // Let the useEffect handle navigation based on role
          // Don't force redirect here to avoid race conditions
        }
      } else {
        // Sign up - default to customer registration
        console.log('[UnifiedAuth] Starting customer signup');
        const { error } = await customerSignUp(email, password, companyName, fullName);
        
        if (error) {
          console.error('[UnifiedAuth] Signup failed:', error);
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          console.log('[UnifiedAuth] Signup successful');
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        }
      }
    } catch (error: any) {
      console.error('[UnifiedAuth] Authentication error:', error);
      toast({
        title: "Authentication error",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('[UnifiedAuth] Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand Panel - Desktop Only */}
      <AuthBrandPanel />

      {/* Auth Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#E1F5FE] via-[#F0F9FF] to-[#FFF8E1] p-4 lg:p-8 relative overflow-hidden">
        {/* Decorative Gradient Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-32 h-32 bg-[hsl(var(--tl-maritime-500))]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-[hsl(var(--tl-gold-500))]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[hsl(var(--tl-navy-500))]/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
          {/* Back to Home - Mobile */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 lg:absolute lg:top-8 lg:left-8"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6 p-6 rounded-2xl bg-gradient-to-r from-[hsl(var(--tl-navy-500))]/10 via-[hsl(var(--tl-maritime-500))]/10 to-[hsl(var(--tl-gold-500))]/10 border border-[hsl(var(--tl-maritime-500))]/20 animate-fade-in">
            <img 
              src={trustLinkLogo} 
              alt="Trust Link Ventures" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <h2 className="text-2xl font-poppins font-bold text-foreground mb-2">
              Your Gateway to <span className="text-[hsl(var(--tl-gold-500))]">Global Excellence</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Secure access to your business portal
            </p>
          </div>

          <Card className="border-[hsl(var(--tl-maritime-500))]/20 shadow-2xl bg-white/90 backdrop-blur-sm ring-1 ring-[hsl(var(--tl-maritime-500))]/5">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-3 bg-[hsl(var(--tl-maritime-500))]/10 rounded-2xl ring-4 ring-[hsl(var(--tl-maritime-500))]/20">
                  <Lock className="h-7 w-7 text-[hsl(var(--tl-maritime-500))]" />
                </div>
              </div>
              <CardTitle className="text-3xl font-poppins font-bold text-center text-foreground">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-center text-base">
                {isLogin 
                  ? 'Sign in to access your portal' 
                  : 'Join our network of global partners'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 border-border/50 focus:border-[hsl(var(--tl-maritime-500))] focus:ring-2 focus:ring-[hsl(var(--tl-maritime-500))]/20 transition-all"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-sm font-semibold">Company Name</Label>
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Your Company Inc."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="h-12 border-border/50 focus:border-[hsl(var(--tl-maritime-500))] focus:ring-2 focus:ring-[hsl(var(--tl-maritime-500))]/20 transition-all"
                        required
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-border/50 focus:border-[hsl(var(--tl-maritime-500))] focus:ring-2 focus:ring-[hsl(var(--tl-maritime-500))]/20 transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12 border-border/50 focus:border-[hsl(var(--tl-maritime-500))] focus:ring-2 focus:ring-[hsl(var(--tl-maritime-500))]/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(var(--tl-gold-500))] to-[hsl(var(--tl-gold-600))] hover:from-[hsl(var(--tl-gold-600))] hover:to-[hsl(var(--tl-gold-700))] text-white shadow-lg hover:shadow-xl hover:shadow-[hsl(var(--tl-gold-500))]/30 transition-all duration-200 hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-transparent bg-gradient-to-r from-transparent via-[hsl(var(--tl-maritime-500))]/20 to-transparent h-px"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-muted-foreground font-medium">or</span>
                </div>
              </div>

              <div className="text-center bg-gradient-to-b from-transparent to-[hsl(var(--tl-maritime-500))]/5 pt-2 pb-2 rounded-lg">
                <Button
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </Button>
              </div>

              {/* Trust Badge */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Secured by enterprise-grade encryption</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAuth;