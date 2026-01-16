import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  loading = false,
  size = 'md',
  variant = 'ghost',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!loading) onToggle();
      }}
      disabled={loading}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        sizeClasses[size],
        'rounded-full transition-all duration-200',
        'hover:scale-110 active:scale-95',
        'focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
        isFavorite 
          ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50' 
          : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50',
        className
      )}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-all duration-200',
          isFavorite && 'fill-current',
          loading && 'animate-pulse'
        )}
      />
    </Button>
  );
};
