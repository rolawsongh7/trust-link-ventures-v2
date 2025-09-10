import * as React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
}

interface LiquidGlassTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[];
  defaultTab?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export const LiquidGlassTabs = React.forwardRef<HTMLDivElement, LiquidGlassTabsProps>(
  ({ 
    className, 
    tabs,
    defaultTab,
    value,
    onValueChange,
    variant = 'default',
    size = 'md',
    orientation = 'horizontal',
    ...props 
  }, ref) => {
    const [activeTab, setActiveTab] = React.useState(value || defaultTab || tabs[0]?.id);

    React.useEffect(() => {
      if (value !== undefined) {
        setActiveTab(value);
      }
    }, [value]);

    const handleTabChange = (tabId: string) => {
      if (value === undefined) {
        setActiveTab(tabId);
      }
      onValueChange?.(tabId);
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'px-3 py-2 text-sm';
        case 'lg':
          return 'px-6 py-4 text-lg';
        default:
          return 'px-4 py-3 text-base';
      }
    };

    const getVariantClasses = (isActive: boolean) => {
      const baseClasses = cn(
        "relative transition-all duration-300 font-medium tracking-tight font-inter",
        "ripple-effect shimmer-effect cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
        getSizeClasses()
      );

      switch (variant) {
        case 'pills':
          return cn(
            baseClasses,
            "rounded-full",
            isActive 
              ? "liquid-glass bg-primary/20 text-primary border-primary/30" 
              : "hover:bg-white/5 text-foreground/70 hover:text-foreground"
          );
        case 'underline':
          return cn(
            baseClasses,
            "rounded-none border-b-2 transition-colors",
            isActive 
              ? "border-primary text-primary bg-primary/5" 
              : "border-transparent text-foreground/70 hover:text-foreground hover:border-foreground/20"
          );
        default:
          return cn(
            baseClasses,
            "rounded-xl",
            isActive 
              ? "liquid-glass bg-white/15 text-foreground border-white/30" 
              : "hover:bg-white/5 text-foreground/70 hover:text-foreground"
          );
      }
    };

    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

    return (
      <div
        ref={ref}
        className={cn(
          "liquid-glass font-inter tracking-tight",
          orientation === 'vertical' ? "flex" : "space-y-6",
          className
        )}
        {...props}
      >
        {/* Tab List */}
        <div
          className={cn(
            "flex",
            orientation === 'horizontal' 
              ? "space-x-1 p-1" 
              : "flex-col space-y-1 p-1 min-w-48 mr-6",
            variant === 'underline' && orientation === 'horizontal' 
              ? "border-b border-border p-0 space-x-0" 
              : ""
          )}
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && handleTabChange(tab.id)}
                className={cn(
                  getVariantClasses(isActive),
                  tab.disabled && "opacity-50 cursor-not-allowed",
                  "flex items-center justify-center space-x-2 relative",
                  orientation === 'vertical' && "justify-start"
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                    {tab.badge}
                  </span>
                )}
                
                {/* Active indicator for underline variant */}
                {isActive && variant === 'underline' && orientation === 'horizontal' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div
          className={cn(
            "liquid-glass p-6 min-h-48",
            orientation === 'vertical' ? "flex-1" : ""
          )}
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
        >
          {activeTabContent}
        </div>
      </div>
    );
  }
);

LiquidGlassTabs.displayName = "LiquidGlassTabs";