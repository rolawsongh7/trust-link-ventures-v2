import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle2 } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { cn } from '@/lib/utils';

export const ProfileAvatar: React.FC = () => {
  const { profile } = useCustomerAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = () => {
    if (!profile?.full_name) return 'U';
    const names = profile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return profile.full_name.substring(0, 2).toUpperCase();
  };

  const completionPercentage = 85; // Will be calculated dynamically

  return (
    <div className="flex flex-col items-center w-full">
      {/* Avatar with completion ring */}
      <div className="relative w-28 h-28">
        {/* Completion ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="56"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
          />
          <circle
            cx="60"
            cy="60"
            r="56"
            fill="none"
            stroke="hsl(var(--maritime-500))"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionPercentage / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Avatar */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
            <AvatarImage src={avatarUrl || undefined} alt={profile?.full_name || 'User'} />
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-trustlink-navy to-trustlink-maritime text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Verification badge */}
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-white shadow-md">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>

          {/* Hover overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer transition-opacity">
              <Camera className="h-8 w-8 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Upload button */}
      <Button
        size="sm"
        variant="outline"
        className="mt-4 bg-white shadow-md hover:shadow-lg transition-all"
      >
        <Upload className="h-3 w-3 mr-1" />
        Change Photo
      </Button>
    </div>
  );
};
