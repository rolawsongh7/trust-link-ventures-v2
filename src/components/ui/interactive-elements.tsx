import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  Heart,
  Star,
  Bookmark,
  ThumbsUp,
  Share,
  Copy,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Animated Button with state feedback
interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
  showSuccess?: boolean;
  loadingText?: string;
  successText?: string;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  className,
  showSuccess = true,
  loadingText = 'Loading...',
  successText = 'Success!',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleClick = async () => {
    if (!onClick || state !== 'idle') return;

    setState('loading');
    try {
      await onClick();
      if (showSuccess) {
        setState('success');
        setTimeout(() => setState('idle'), 2000);
      } else {
        setState('idle');
      }
    } catch (error) {
      setState('idle');
    }
  };

  const getContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {loadingText}
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-success animate-bounce-in" />
            {successText}
          </>
        );
      default:
        return children;
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      className={cn(
        "transition-all duration-200 hover:scale-105 active:scale-95",
        state === 'success' && "success-pulse",
        className
      )}
    >
      {getContent()}
    </Button>
  );
};

// Like Button with animation
interface LikeButtonProps {
  initialLiked?: boolean;
  initialCount?: number;
  onToggle?: (liked: boolean, count: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  initialLiked = false,
  initialCount = 0,
  onToggle,
  size = 'md',
  showCount = true,
  className,
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = () => {
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    
    setLiked(newLiked);
    setCount(newCount);
    setIsAnimating(true);
    
    setTimeout(() => setIsAnimating(false), 300);
    onToggle?.(newLiked, newCount);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "flex items-center space-x-1 transition-all duration-200",
        className
      )}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          "transition-all duration-200",
          liked ? "text-red-500 fill-red-500" : "text-muted-foreground",
          isAnimating && "animate-bounce-in"
        )}
      />
      {showCount && (
        <span className={cn(
          "text-sm transition-all duration-200",
          liked ? "text-red-500" : "text-muted-foreground",
          isAnimating && "animate-bounce-in"
        )}>
          {count}
        </span>
      )}
    </Button>
  );
};

// Star Rating with animation
interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  className,
}) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const filled = (hoveredValue ?? value) >= starValue;
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              "transition-all duration-200 cursor-pointer",
              filled ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground",
              !readonly && "hover:scale-110 hover-glow"
            )}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => !readonly && setHoveredValue(starValue)}
            onMouseLeave={() => !readonly && setHoveredValue(null)}
          />
        );
      })}
    </div>
  );
};

// Bookmark Button
interface BookmarkButtonProps {
  initialBookmarked?: boolean;
  onToggle?: (bookmarked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  initialBookmarked = false,
  onToggle,
  size = 'md',
  className,
}) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = () => {
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    setIsAnimating(true);
    
    setTimeout(() => setIsAnimating(false), 300);
    onToggle?.(newBookmarked);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn("transition-all duration-200", className)}
    >
      <Bookmark
        className={cn(
          sizeClasses[size],
          "transition-all duration-200",
          bookmarked ? "text-primary fill-primary" : "text-muted-foreground",
          isAnimating && "animate-bounce-in"
        )}
      />
    </Button>
  );
};

// Copy to Clipboard Button
interface CopyButtonProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  showFeedback?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  children,
  className,
  showFeedback = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      if (showFeedback) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn("transition-all duration-200 hover:scale-105", className)}
    >
      {copied ? (
        <>
          <CheckCircle className="h-4 w-4 mr-2 text-success animate-bounce-in" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {children || 'Copy'}
        </>
      )}
    </Button>
  );
};

// Floating Action Button
interface FloatingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  children,
  onClick,
  position = 'bottom-right',
  className,
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300",
        "hover:scale-110 hover:shadow-xl active:scale-95 animate-float",
        positionClasses[position],
        className
      )}
      size="icon"
    >
      {children}
    </Button>
  );
};

// Pulse Loading Card
interface PulseCardProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export const PulseCard: React.FC<PulseCardProps> = ({
  children,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={cn("p-6 space-y-4", className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 transition-all duration-200 hover:shadow-lg hover-scale", className)}>
      {children}
    </Card>
  );
};

// Animated Badge
interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  pulse?: boolean;
  bounce?: boolean;
  className?: string;
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  children,
  variant = 'default',
  pulse = false,
  bounce = false,
  className,
}) => {
  return (
    <Badge
      variant={variant}
      className={cn(
        "transition-all duration-200",
        pulse && "animate-pulse-glow",
        bounce && "hover:animate-bounce",
        className
      )}
    >
      {children}
    </Badge>
  );
};