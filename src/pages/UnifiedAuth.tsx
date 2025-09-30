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
    // Wait until role has been resolved to avoid misrouting to customer portal
    if (roleLoading) return;

    if (adminUser) {
      // Check if user has admin access for CRM
      if (role === 'admin') {
        navigate('/dashboard');
        return;
      }
      
      // Check if user is in admin whitelist (for trustlventuresghana_a01@yahoo.com)
      try {
        const { data: isAllowed } = await supabase.rpc('is_allowed_admin_email', {
          user_email: adminUser.email,
        });
        
        if (isAllowed) {
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking admin whitelist:', error);
      }
      
      // If user is authenticated but not admin, still route to dashboard for now
      // This allows all authenticated users to access CRM functionality
      navigate('/dashboard');
      return;
    }

    if (customerUser) {
      navigate('/customer');
    }
  };

  routeUser();
}, [adminUser, customerUser, role, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Try admin login first
        const adminResult = await adminSignIn(email, password);
        
if (!adminResult.error) {
  // If email is on the admin whitelist, route directly to dashboard
  try {
    const { data: isAllowed } = await supabase.rpc('is_allowed_admin_email', {
      user_email: email,
    });

    if (isAllowed) {
      toast({ title: 'Welcome back!', description: 'Redirecting to your dashboard...' });
      navigate('/dashboard');
      return;
    }
  } catch (_) {
    // If whitelist check fails, fall back to role-based redirect via effect
  }

  // Not an admin — continue to try customer login below
}

        // If admin login failed, handle specific cases
        if (adminResult.error) {
          const msg = String(adminResult.error.message || '').toLowerCase();
          if (msg.includes('email not confirmed')) {
            try {
              await supabase.auth.resend({
                type: 'signup',
                email,
                options: { emailRedirectTo: `${window.location.origin}/login` },
              });
              toast({
                title: 'Email not confirmed',
                description: 'We resent a verification link. Please verify, then sign in.',
              });
            } catch (_) {
              // ignore resend failures
            }
            return;
          }
        }

        // If admin login fails, try customer login (same auth, but keeps UX consistent)
        const customerResult = await customerSignIn(email, password);
        
        if (!customerResult.error) {
          toast({
            title: "Welcome back!",
            description: "Redirecting to customer portal...",
          });
          // Directly navigate to customer portal since auth state change might be delayed
          navigate('/customer');
          return;
        }

        // Handle unconfirmed email for customer sign in
        if (customerResult.error) {
          const msg = String(customerResult.error.message || '').toLowerCase();
          if (msg.includes('email not confirmed')) {
            try {
              await supabase.auth.resend({
                type: 'signup',
                email,
                options: { emailRedirectTo: `${window.location.origin}/login` },
              });
              toast({
                title: 'Email not confirmed',
                description: 'We resent a verification link. Please verify, then sign in.',
              });
              return;
            } catch (_) {
              // ignore resend failures
            }
          }
        }

        // Both failed
        toast({
          title: "Login failed",
          description: customerResult.error?.message || adminResult.error?.message || "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else {
        // Sign up - default to customer registration
        const { error } = await customerSignUp(email, password, companyName, fullName);
        
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Authentication error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
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