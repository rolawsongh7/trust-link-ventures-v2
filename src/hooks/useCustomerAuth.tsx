import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get the session immediately first
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Then set up the listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, userEmail: string) => {
    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (existingCustomer) {
        setProfile({
          id: existingCustomer.id,
          email: existingCustomer.email,
          full_name: existingCustomer.contact_name,
          company_name: existingCustomer.company_name,
          phone: existingCustomer.phone,
          country: existingCustomer.country,
          industry: existingCustomer.industry,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in to your account.",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, companyName: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/customer`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          company_name: companyName,
          full_name: fullName
        }
      }
    });

    // Create customer record if signup was successful
    if (!error && data.user) {
      try {
        const { error: customerError } = await supabase
          .from('customers')
          .insert([
            {
              company_name: companyName,
              contact_name: fullName,
              email: email,
              customer_status: 'active',
              priority: 'medium'
            }
          ]);

        if (customerError) {
          console.error('Error creating customer record:', customerError);
        }

        toast({
          title: "Account created!",
          description: "Welcome to your customer portal. You can now browse products and request quotes.",
        });
      } catch (customerError) {
        console.error('Failed to create customer record:', customerError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      setProfile(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    }
    
    return { error };
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

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};