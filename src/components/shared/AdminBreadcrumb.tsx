import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({ items, className }) => {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm text-muted-foreground mb-4", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link 
            to="/admin/dashboard" 
            className="flex items-center hover:text-foreground transition-colors"
            aria-label="Dashboard"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              {isLast || !item.href ? (
                <span 
                  className={cn(
                    isLast && "text-foreground font-medium"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link 
                  to={item.href} 
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
