import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreVertical, Shield, UserCog, User as UserIcon } from 'lucide-react';
import { TimeAgo } from '@/components/shared/TimeAgo';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserTableProps {
  users: User[];
  onRoleChange: (userId: string, newRole: 'admin' | 'moderator' | 'user') => void;
  onRefresh: () => void;
}

const getRoleBadge = (role: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; color: string }> = {
    admin: { variant: 'destructive', icon: Shield, color: 'text-red-500' },
    moderator: { variant: 'default', icon: UserCog, color: 'text-green-500' },
    user: { variant: 'outline', icon: UserIcon, color: 'text-blue-500' },
  };

  const config = variants[role] || variants.user;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {role.replace('_', ' ')}
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

export const UserTable = ({ users, onRoleChange, onRefresh }: UserTableProps) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group hover:bg-muted/50 transition-colors"
            >
              <TableCell>
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
              </TableCell>
              <TableCell>
                {getRoleBadge(user.role)}
              </TableCell>
              <TableCell>
                <TimeAgo timestamp={user.created_at} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRoleChange(user.id, 'admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRoleChange(user.id, 'moderator')}>
                      <UserCog className="mr-2 h-4 w-4" />
                      Moderator
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRoleChange(user.id, 'user')}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};