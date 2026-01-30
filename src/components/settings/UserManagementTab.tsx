import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Loader2, 
  Users as UsersIcon,
  Shield,
  Mail
} from 'lucide-react';
import { UserTable } from './UserTable';
import { useRoleAuth } from '@/hooks/useRoleAuth';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export const UserManagementTab = () => {
  const { hasAdminAccess, hasSuperAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Role options based on caller's access level
  const availableRoles: ('admin' | 'sales_rep' | 'user')[] = hasSuperAdminAccess 
    ? ['admin', 'sales_rep', 'user']
    : ['sales_rep', 'user'];

  // Determine if a user row can be edited
  const canEditUser = (userRole: string) => {
    if (userRole === 'super_admin') return false;
    if (userRole === 'admin' && !hasSuperAdminAccess) return false;
    return true;
  };

  useEffect(() => {
    if (hasAdminAccess) {
      loadUsers();
    }
  }, [hasAdminAccess]);

  const loadUsers = async () => {
    try {
      // Get profiles with user roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each user
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || 'No email',
          full_name: profile.full_name,
          role: userRole?.role || 'user',
          created_at: profile.created_at,
          last_sign_in_at: null, // Would need to get from auth.users via API
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'sales_rep' | 'user') => {
    try {
      // Use secure RPC function instead of direct table operations
      const { data, error } = await supabase.rpc('change_user_role_secure', {
        p_target_user_id: userId,
        p_new_role: newRole
      });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User role has been changed successfully.",
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportUsers = () => {
    const csv = [
      ['Email', 'Name', 'Role', 'Created At'].join(','),
      ...filteredUsers.map(user => [
        user.email,
        user.full_name || 'N/A',
        user.role,
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Export complete",
      description: "User list has been exported to CSV.",
    });
  };

  if (!hasAdminAccess) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Admin Access Required</h3>
            <p className="text-muted-foreground">
              You need administrator privileges to access user management.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    users: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold text-red-500">{stats.admins}</p>
                </div>
                <Shield className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Moderators</p>
                  <p className="text-2xl font-bold text-green-500">{stats.moderators}</p>
                </div>
                <Mail className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Regular Users</p>
                  <p className="text-2xl font-bold text-purple-500">{stats.users}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportUsers}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={roleFilter === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('admin')}
                >
                  Admin
                </Button>
                <Button
                  variant={roleFilter === 'moderator' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('moderator')}
                >
                  Moderator
                </Button>
              </div>
            </div>

            {/* User Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <UserTable
                users={filteredUsers}
                onRoleChange={handleRoleChange}
                onRefresh={loadUsers}
                availableRoles={availableRoles}
                canEditUser={canEditUser}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};