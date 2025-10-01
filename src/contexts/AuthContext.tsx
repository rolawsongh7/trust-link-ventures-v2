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
  requiresMFA: boolean;
  mfaUserId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any; requiresMFA?: boolean }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyMFA: (trustDevice: boolean) => Promise<void>;
  cancelMFA: () => void;
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
  const [isFetchingRole, setIsFetchingRole] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);

  // Clear all auth state
  const clearAuthState = () => {
    console.log('[Auth] Clearing all auth state');
    setUser(null);
    setSession(null);
    setUserRole(null);
    setRoleLoading(false);
    setIsFetchingRole(false);
  };

  // Fetch user role when user changes
  const fetchUserRole = async (userId: string) => {
    if (!userId) {
      setUserRole(null);
      return;
    }

    // Prevent concurrent role fetching
    if (isFetchingRole) {
      console.log('[Auth] Role fetch already in progress, skipping');
      return;
    }

    try {
      setIsFetchingRole(true);
      setRoleLoading(true);
      console.log('[Auth] Fetching role for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Role fetch timeout')), 10000)
      );

      // Check for admin role first
      const adminPromise = supabase.rpc('check_user_role', {
        check_user_id: userId,
        required_role: 'admin'
      });

      const { data: isAdmin } = await Promise.race([adminPromise, timeoutPromise]) as any;

      if (isAdmin) {
        console.log('[Auth] User has admin role');
        setUserRole('admin');
        return;
      }

      // Check for sales rep role
      const salesPromise = supabase.rpc('check_user_role', {
        check_user_id: userId,
        required_role: 'sales_rep'
      });

      const { data: isSalesRep } = await Promise.race([salesPromise, timeoutPromise]) as any;

      if (isSalesRep) {
        console.log('[Auth] User has sales_rep role');
        setUserRole('sales_rep');
        return;
      }

      // Default to user role
      console.log('[Auth] User has default user role');
      setUserRole('user');
    } catch (error) {
      console.error('[Auth] Error fetching user role:', error);
      setUserRole('user'); // Default to user role on error
    } finally {
      setRoleLoading(false);
      setIsFetchingRole(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get the session immediately first
    const getInitialSession = async () => {
      try {
        console.log('[Auth] Getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting initial session:', error);
          clearAuthState();
          setLoading(false);
          return;
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Defer role fetching to prevent blocking
        if (session?.user) {
          console.log('[Auth] Initial session found, fetching role');
          setTimeout(() => {
            if (mounted) {
              fetchUserRole(session.user.id);
            }
          }, 0);
        } else {
          console.log('[Auth] No initial session found');
        }
      } catch (error) {
        console.error('[Auth] Exception getting initial session:', error);
        if (mounted) {
          clearAuthState();
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Set up the listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Auth state change event:', event);
        
        if (!mounted) return;

        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
          clearAuthState();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('[Auth] User signed in, fetching role');
          // Defer role fetching to prevent deadlock
          setTimeout(() => {
            if (mounted) {
              fetchUserRole(session.user.id);
            }
          }, 0);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[Auth] Token refreshed');
          // Only fetch role if we don't have it yet
          if (!userRole) {
            setTimeout(() => {
              if (mounted) {
                fetchUserRole(session.user.id);
              }
            }, 0);
          }
        } else if (!session) {
          console.log('[Auth] No session, clearing state');
          setUserRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has MFA enabled
      if (data.user) {
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
          return { error: null, requiresMFA: true };
        }
      }

      return { error: null };
    } catch (error: any) {
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
    console.log('[Auth] Signing out');
    try {
      // Clear state first
      clearAuthState();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] Sign out error:', error);
      } else {
        console.log('[Auth] Sign out successful');
      }
      
      return { error };
    } catch (error: any) {
      console.error('[Auth] Sign out exception:', error);
      return { error };
    }
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
    requiresMFA,
    mfaUserId,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    resetPassword,
    verifyMFA,
    cancelMFA,
    hasRole,
    hasAdminAccess,
    hasSalesAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};