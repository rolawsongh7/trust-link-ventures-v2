import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StaffMember {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  full_name?: string;
}

interface UseStaffMembersReturn {
  staffMembers: StaffMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch staff members (admins) for assignment purposes.
 * Only returns users with admin-level roles.
 */
export const useStaffMembers = (): UseStaffMembersReturn => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users with admin roles from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['super_admin', 'admin']);

      if (roleError) {
        throw roleError;
      }

      if (!roleData || roleData.length === 0) {
        setStaffMembers([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(roleData.map(r => r.user_id))];

      // Fetch user details from profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Could not fetch profiles:', profilesError);
      }

      // Map role data with profile data
      const staff: StaffMember[] = roleData.map(roleEntry => {
        const profile = profilesData?.find(p => p.id === roleEntry.user_id);
        return {
          id: roleEntry.user_id,
          email: profile?.email || 'Unknown',
          role: roleEntry.role as 'super_admin' | 'admin' | 'user',
          full_name: profile?.full_name || undefined,
        };
      });

      // Remove duplicates (user might have multiple roles, take highest)
      const uniqueStaff = staff.reduce<StaffMember[]>((acc, curr) => {
        const existing = acc.find(s => s.id === curr.id);
        if (!existing) {
          acc.push(curr);
        } else {
          // Keep the higher role
          const roleOrder = { 'super_admin': 3, 'admin': 2, 'user': 1 };
          if (roleOrder[curr.role] > roleOrder[existing.role]) {
            const idx = acc.findIndex(s => s.id === curr.id);
            acc[idx] = curr;
          }
        }
        return acc;
      }, []);

      setStaffMembers(uniqueStaff);
    } catch (err) {
      console.error('Error fetching staff members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  return {
    staffMembers,
    loading,
    error,
    refetch: fetchStaffMembers,
  };
};
