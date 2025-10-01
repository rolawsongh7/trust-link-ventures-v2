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
import { Loader2, ArrowLeft, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const UnifiedAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      console.log('[UnifiedAuth] Non-admin user, navigating to customer portal');
      navigate('/customer', { replace: true });
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
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back to Home */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-poppins">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to access your portal' 
                : 'Sign up for customer access'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Sign Up'
                )}
              </Button>
            </form>
            
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedAuth;