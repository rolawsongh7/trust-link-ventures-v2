import * as React from "react";
import { cn } from "@/lib/utils";

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

interface ClusterProps extends React.HTMLAttributes<HTMLDivElement> {
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebarWidth?: string;
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  side?: 'left' | 'right';
}

interface GoldenSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  reverse?: boolean;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, space = 'md', align = 'stretch', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          space && `gap-${space}`,
          align === 'start' && 'items-start',
          align === 'center' && 'items-center',
          align === 'end' && 'items-end',
          align === 'stretch' && 'items-stretch',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const Cluster = React.forwardRef<HTMLDivElement, ClusterProps>(
  ({ 
    className, 
    space = 'md', 
    justify = 'start',
    align = 'center',
    children, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap',
          space && `gap-${space}`,
          justify === 'start' && 'justify-start',
          justify === 'center' && 'justify-center',
          justify === 'end' && 'justify-end',
          justify === 'between' && 'justify-between',
          justify === 'around' && 'justify-around',
          align === 'start' && 'items-start',
          align === 'center' && 'items-center',
          align === 'end' && 'items-end',
          align === 'stretch' && 'items-stretch',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ 
    className, 
    sidebarWidth = '20rem',
    space = 'lg',
    side = 'left',
    children, 
    ...props 
  }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const sidebar = childrenArray[0];
    const main = childrenArray[1];

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          space && `gap-${space}`,
          side === 'right' && 'flex-row-reverse',
          className
        )}
        style={{
          '--sidebar-width': sidebarWidth,
        } as React.CSSProperties}
        {...props}
      >
        <div 
          className="flex-shrink-0"
          style={{ width: `var(--sidebar-width)` }}
        >
          {sidebar}
        </div>
        <div className="flex-grow min-w-0">
          {main}
        </div>
      </div>
    );
  }
);

export const GoldenSection = React.forwardRef<HTMLDivElement, GoldenSectionProps>(
  ({ 
    className, 
    orientation = 'horizontal',
    reverse = false,
    children, 
    ...props 
  }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const primary = childrenArray[0];
    const secondary = childrenArray[1];

    return (
      <div
        ref={ref}
        className={cn(
          'grid gap-lg',
          orientation === 'horizontal' 
            ? reverse 
              ? 'grid-cols-[1fr_1.618fr]' 
              : 'grid-cols-[1.618fr_1fr]'
            : reverse
              ? 'grid-rows-[1fr_1.618fr]'
              : 'grid-rows-[1.618fr_1fr]',
          className
        )}
        {...props}
      >
        {reverse ? (
          <>
            {secondary}
            {primary}
          </>
        ) : (
          <>
            {primary}
            {secondary}
          </>
        )}
      </div>
    );
  }
);

export const FluidContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('container-balanced fluid-spacing', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = "Stack";
Cluster.displayName = "Cluster";
Sidebar.displayName = "Sidebar";
GoldenSection.displayName = "GoldenSection";
FluidContainer.displayName = "FluidContainer";