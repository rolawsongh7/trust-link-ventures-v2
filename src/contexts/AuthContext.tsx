import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'sales_rep' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  hasRole: (role: UserRole) => boolean;
  hasAdminAccess: boolean;
  hasSalesAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // Fetch user role when user changes
  const fetchUserRole = async (userId: string) => {
    if (!userId) {
      setUserRole(null);
      return;
    }

    try {
      setRoleLoading(true);
      
      // Check for admin role first
      const { data: isAdmin } = await supabase.rpc('check_user_role', {
        check_user_id: userId,
        required_role: 'admin'
      });

      if (isAdmin) {
        setUserRole('admin');
        return;
      }

      // Check for sales rep role
      const { data: isSalesRep } = await supabase.rpc('check_user_role', {
        check_user_id: userId,
        required_role: 'sales_rep'
      });

      if (isSalesRep) {
        setUserRole('sales_rep');
        return;
      }

      // Default to user role
      setUserRole('user');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user'); // Default to user role on error
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    // Get the session immediately first
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch role if user exists
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
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
        setLoading(false);
        
        // Fetch role when user signs in or changes
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    // Send welcome email if signup was successful
    if (!error && data.user) {
      try {
        const { EmailService } = await import('@/services/emailService');
        await EmailService.sendWelcomeEmail(email, fullName);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the signup if email sending fails
      }
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    return { error };
  };

  // Role checking functions
  const hasRole = (role: UserRole): boolean => {
    if (!userRole) return false;
    
    // Admin can access everything
    if (userRole === 'admin') return true;
    
    // Sales rep can access sales-related features
    if (userRole === 'sales_rep' && (role === 'sales_rep' || role === 'user')) {
      return true;
    }
    
    // Exact role match
    return userRole === role;
  };

  const hasAdminAccess = userRole === 'admin';
  const hasSalesAccess = userRole === 'admin' || userRole === 'sales_rep';

  const value = {
    user,
    session,
    loading,
    userRole,
    roleLoading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    resetPassword,
    hasRole,
    hasAdminAccess,
    hasSalesAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};