import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Search, User, LogOut, MessageSquare, Shield, Package, ExternalLink } from 'lucide-react';
import trustLinkLogo from '@/assets/trust-link-logo.png';
import { getMainUrl, navigateToPublicSite } from '@/utils/domainUtils';
import { isNativeApp } from '@/utils/env';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface AppHeaderProps {
  onOpenCommandPalette: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenCommandPalette }) => {
  const { user, signOut } = useAuth();
  const { hasAdminAccess } = useRoleAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = getMainUrl('/');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Use role-based display name  
  const getDisplayName = () => {
    if (hasAdminAccess) {
      return 'Admin';
    }
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm px-4">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex-1 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={trustLinkLogo} 
            alt="Trust Link Ventures" 
            className="h-10 w-auto hover:scale-105 transition-transform"
          />
          <h1 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Trust Link Ventures
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
            className="gap-2 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <Badge variant="outline" className="ml-2 hidden md:inline-flex text-xs border-primary/20">
              ⌘K
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                <Avatar className="h-8 w-8 ring-2 ring-border hover:ring-primary transition-all">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                  <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                    {getInitials(user?.user_metadata?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Enhanced dropdown items based on admin/customer status */}
              {!hasAdminAccess && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/customer-portal" className="flex items-center space-x-2 cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      <span>Previous Orders</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/contact" className="flex items-center space-x-2 cursor-pointer">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Previous Messages</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth" className="flex items-center space-x-2 cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Login & Security</span>
                    </Link>
                  </DropdownMenuItem>
                  {/* Show admin login option for customers - web only */}
                  {!isNativeApp() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin-login" className="flex items-center space-x-2 cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Admin Login</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={navigateToPublicSite}>
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>View Public Site</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};