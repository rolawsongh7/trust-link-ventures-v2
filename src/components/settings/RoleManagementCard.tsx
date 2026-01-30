import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Shield, 
  Crown, 
  UserCog, 
  User as UserIcon,
  RefreshCw,
  Lock,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoleAuth } from '@/hooks/useRoleAuth';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export const RoleManagementCard = () => {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  useEffect(() => {
    if (hasSuperAdminAccess) {
      loadAdminUsers();
    }
  }, [hasSuperAdminAccess]);

  // Defense in depth - must be after hooks
  if (!hasSuperAdminAccess) return null;

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users with admin or super_admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'super_admin']);

      if (rolesError) throw rolesError;

      // Get profile info for these users
      const userIds = roles?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        setAdminUsers([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || 'No email',
          full_name: profile.full_name,
          role: userRole?.role || 'user',
          created_at: profile.created_at,
        };
      }) || [];

      // Sort by role: super_admin first, then admin
      usersWithRoles.sort((a, b) => {
        if (a.role === 'super_admin') return -1;
        if (b.role === 'super_admin') return 1;
        return 0;
      });

      setAdminUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading admin users:', error);
      toast({
        title: "Error",
        description: "Failed to load admin users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      const { data, error } = await supabase.rpc('change_user_role_secure', {
        p_target_user_id: userId,
        p_new_role: newRole
      });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}.`,
      });

      loadAdminUsers();
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change user role.",
        variant: "destructive",
      });
    } finally {
      setChangingRole(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1">
          <Crown className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    );
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Admin Role Management
            </CardTitle>
            <CardDescription>
              View and manage admin-level users. Only super admins can promote/demote admin roles.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAdminUsers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : adminUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No admin users found.
          </p>
        ) : (
          <div className="space-y-3">
            {adminUsers.map((user) => (
              <div 
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(user.role)}
                  
                  {user.role === 'super_admin' ? (
                    <Button variant="ghost" size="sm" disabled className="opacity-50">
                      <Lock className="h-4 w-4 mr-1" />
                      Protected
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={changingRole === user.id}
                        >
                          {changingRole === user.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Change Role
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Role To</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRoleChange(user.id, 'sales_rep')}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Sales Rep
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleRoleChange(user.id, 'user')}
                        >
                          <UserIcon className="mr-2 h-4 w-4" />
                          User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
