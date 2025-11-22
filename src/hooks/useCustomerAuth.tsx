import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkAuthRateLimit, recordAuthAttempt, resetAuthRateLimit, formatRateLimitMessage } from '@/lib/authRateLimiter';

interface CustomerProfile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  country?: string;
  industry?: string;
}

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, companyName: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
  requiresMFA: boolean;
  mfaUserId: string | null;
  verifyMFA: (trustDevice: boolean) => Promise<void>;
  cancelMFA: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);

  // Validate if a session is still valid (not expired)
  const isSessionValid = (session: Session | null): boolean => {
    if (!session) return false;
    
    const expiresAt = session.expires_at;
    if (!expiresAt) return false;
    
    // Check if session expires within the next 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300; // 5 minutes
    
    return expiresAt > (now + bufferTime);
  };

  useEffect(() => {
    // Get the session immediately first
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Validate session before using it
        if (session && !isSessionValid(session)) {
          console.log('🔄 Session expired, clearing authentication state');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Clear everything on error
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Then set up the listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            fetchProfile(session.user.id, session.user.email);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, userEmail: string) => {
    console.log('🔍 fetchProfile - Starting for:', userEmail);
    
    try {
      // Use case-insensitive lookup with ordering to be deterministic
      const { data: existingCustomers, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('email', userEmail)  // Case-insensitive
        .order('created_at', { ascending: true })  // Deterministic: oldest first
        .limit(1);

      if (error) {
        console.error('❌ Error fetching customer profile:', error);
        
        // Set a fallback profile to prevent infinite loading
        setProfile({
          id: userId,
          email: userEmail,
          full_name: 'Customer',
          company_name: 'Company',
          phone: null,
          country: null,
          industry: null,
        });
        return;
      }

      const existingCustomer = existingCustomers?.[0];

      if (existingCustomer) {
        console.log('✅ Customer profile found:', {
          id: existingCustomer.id,
          email: existingCustomer.email,
          company: existingCustomer.company_name
        });
        
        setProfile({
          id: existingCustomer.id,
          email: existingCustomer.email,
          full_name: existingCustomer.contact_name,
          company_name: existingCustomer.company_name,
          phone: existingCustomer.phone,
          country: existingCustomer.country,
          industry: existingCustomer.industry,
        });
      } else {
        console.warn('⚠️ No customer record found, using fallback profile');
        
        // No customer record found, create a basic profile from auth metadata
        const { data: { user } } = await supabase.auth.getUser();
        const userData = user?.user_metadata;
        
        setProfile({
          id: userId,
          email: userEmail,
          full_name: userData?.full_name || userData?.company_name || 'Customer',
          company_name: userData?.company_name || 'Company',
          phone: null,
          country: null,
          industry: null,
        });
      }
    } catch (error) {
      console.error('💥 Exception fetching profile:', error);
      
      // Set a basic profile to prevent infinite loading
      setProfile({
        id: userId,
        email: userEmail,
        full_name: 'Customer',
        company_name: 'Company',
        phone: null,
        country: null,
        industry: null,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    // Sanitize inputs (defense in depth)
    const sanitizedEmail = email.trim().toLowerCase();
    
    // Check rate limit BEFORE attempting login
    const rateLimitCheck = await checkAuthRateLimit(sanitizedEmail);
    if (!rateLimitCheck.allowed) {
      const message = formatRateLimitMessage(rateLimitCheck);
      return {
        error: {
          message,
          status: 429,
          name: 'RateLimitError'
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    // Record the attempt
    await recordAuthAttempt(sanitizedEmail, !error);

    if (!error && data.user) {
      // Check if user has MFA enabled
      const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('enabled')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (mfaSettings?.enabled) {
        // Sign out temporarily until MFA is verified
        await supabase.auth.signOut();
        setRequiresMFA(true);
        setMfaUserId(data.user.id);
        return { error: null };
      }

      // Clear rate limit on success
      resetAuthRateLimit(sanitizedEmail);
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in to your account.",
      });
    } else if (error) {
      // Show remaining attempts warning if applicable
      const updatedLimit = await checkAuthRateLimit(sanitizedEmail);
      const warningMessage = formatRateLimitMessage(updatedLimit);
      
      if (warningMessage && updatedLimit.allowed) {
        toast({
          title: "Sign in failed",
          description: warningMessage,
          variant: "destructive",
        });
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string, companyName: string, fullName: string) => {
    // Sanitize inputs (defense in depth)
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedCompanyName = companyName.trim();
    const sanitizedFullName = fullName.trim();
    
    const redirectUrl = `${window.location.origin}/customer-auth?confirmed=true`;
    
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          company_name: sanitizedCompanyName,
          full_name: sanitizedFullName
        }
      }
    });

    // Create or update customer record if signup was successful
    if (!error && data.user) {
      try {
        // Check if customer already exists (case-insensitive)
        const { data: existingCustomer, error: checkError } = await supabase
          .from('customers')
          .select('id, email, company_name, contact_name')
          .ilike('email', sanitizedEmail)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking for existing customer:', checkError);
        }

        if (existingCustomer) {
          console.log('✅ Customer record already exists:', existingCustomer);
          
          // Update existing customer with new info if needed
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              contact_name: sanitizedFullName,
              company_name: sanitizedCompanyName,
              customer_status: 'active'
            })
            .eq('id', existingCustomer.id);

          if (updateError) {
            console.error('Error updating customer record:', updateError);
          } else {
            console.log('✅ Updated existing customer record');
          }
        } else {
          console.log('Creating new customer record');
          
          // Create new customer record
          const { error: customerError } = await supabase
            .from('customers')
            .insert([
              {
                company_name: sanitizedCompanyName,
                contact_name: sanitizedFullName,
                email: sanitizedEmail,
                customer_status: 'active',
                priority: 'medium'
              }
            ]);

          if (customerError) {
            console.error('Error creating customer record:', customerError);
          } else {
            console.log('✅ Created new customer record');
          }
        }

        toast({
          title: "Account created!",
          description: "Please check your email to confirm your account. You may need to check your spam folder.",
          duration: 6000,
        });
      } catch (customerError) {
        console.error('Failed to manage customer record:', customerError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    console.log('🔄 Starting customer sign out process...');
    
    try {
      // Clear profile state first
      console.log('🔄 Clearing profile state...');
      setProfile(null);
      setUser(null);
      setSession(null);
      
      // Call Supabase sign out (this clears localStorage automatically)
      const { error } = await supabase.auth.signOut();
      console.log('✅ Supabase auth.signOut completed:', { error });
      
      // Extra cleanup: manually clear any remaining Supabase keys from localStorage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('✅ Cleared localStorage keys:', keysToRemove);
      } catch (storageError) {
        console.warn('⚠️ Could not clear localStorage:', storageError);
      }
      
      if (!error) {
        toast({
          title: "Signed out",
          description: "You have been successfully signed out.",
        });
        console.log('✅ Customer sign out completed successfully');
      } else {
        console.error('❌ Sign out error from Supabase:', error);
      }
      
      // Force a hard reload to clear all app state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
      return { error };
    } catch (err) {
      console.error('❌ Exception during sign out:', err);
      // Force redirect even on exception
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      return { error: err };
    }
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    if (!profile) return { error: { message: 'No profile found' } };

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          company_name: updates.company_name,
          contact_name: updates.full_name,
          phone: updates.phone,
          country: updates.country,
          industry: updates.industry,
        })
        .eq('id', profile.id);

      if (!error) {
        setProfile({ ...profile, ...updates });
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          variant: "destructive",
          title: "Password update failed",
          description: error.message || "Failed to update password. Please try again.",
        });
        return { error };
      }

      toast({
        title: "Password updated",
        description: "Your password has been successfully changed.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Unexpected error updating password:', error);
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: "An unexpected error occurred. Please try again.",
      });
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/customer-auth?reset=true`,
    });
    return { error };
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        console.error('Resend confirmation error:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected error resending confirmation:', error);
      return { error };
    }
  };

  const verifyMFA = async (trustDevice: boolean) => {
    if (!mfaUserId) return;

    try {
      // MFA verification already happened in the modal
      // Now we can complete the sign-in
      setRequiresMFA(false);
      setMfaUserId(null);
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  };

  const cancelMFA = () => {
    setRequiresMFA(false);
    setMfaUserId(null);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
    resendConfirmationEmail,
    requiresMFA,
    mfaUserId,
    verifyMFA,
    cancelMFA,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};
