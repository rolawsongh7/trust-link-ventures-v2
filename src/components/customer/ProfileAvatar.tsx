import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const ProfileAvatar: React.FC = () => {
  const { profile, user } = useCustomerAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    if (!profile?.full_name) return 'U';
    const names = profile.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return profile.full_name.substring(0, 2).toUpperCase();
  };

  const completionPercentage = 85; // Will be calculated dynamically

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WebP image.',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      toast({
        title: 'Photo updated',
        description: 'Your profile photo has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload photo. Please try again.',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

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
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleUploadClick}
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
          {(isHovered || uploading) && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center transition-opacity">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : (
                <Camera className="h-8 w-8 text-white" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload button */}
      <Button
        size="sm"
        variant="outline"
        className="mt-4 bg-white shadow-md hover:shadow-lg transition-all"
        onClick={handleUploadClick}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Upload className="h-3 w-3 mr-1" />
        )}
        {uploading ? 'Uploading...' : 'Change Photo'}
      </Button>
    </div>
  );
};
