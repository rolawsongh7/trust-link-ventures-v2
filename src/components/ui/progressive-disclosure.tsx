import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProgressiveDisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  variant?: 'default' | 'card' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  title,
  children,
  defaultOpen = false,
  className,
  variant = 'default',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const renderContent = () => (
    <>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between p-0 h-auto font-medium transition-all duration-200 hover:scale-[1.02]",
          sizeClasses[size],
          variant === 'minimal' && "hover:bg-transparent"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
        ) : (
          <ChevronRight className="h-4 w-4 transition-transform duration-200" />
        )}
      </Button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen
            ? "max-h-screen opacity-100 mt-4 animate-fade-in"
            : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </>
  );

  if (variant === 'card') {
    return (
      <Card className={cn("p-4 interactive-element", className)}>
        {renderContent()}
      </Card>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn("space-y-2", className)}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg p-4 interactive-element", className)}>
      {renderContent()}
    </div>
  );
};

interface ProgressiveStepsProps {
  steps: Array<{
    title: string;
    content: React.ReactNode;
    completed?: boolean;
  }>;
  currentStep?: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export const ProgressiveSteps: React.FC<ProgressiveStepsProps> = ({
  steps,
  currentStep = 0,
  onStepClick,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.completed || index < currentStep;
        const isClickable = onStepClick && (isCompleted || isActive);

        return (
          <div key={index} className="space-y-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start p-0 h-auto font-medium transition-all duration-200",
                isActive && "text-primary",
                isCompleted && "text-muted-foreground",
                isClickable && "cursor-pointer hover:text-primary hover:scale-[1.02]"
              )}
              onClick={() => isClickable && onStepClick!(index)}
              disabled={!isClickable}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-all duration-200",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground animate-bounce-in"
                      : isActive
                      ? "border-primary text-primary hover-glow"
                      : "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                <span>{step.title}</span>
              </div>
            </Button>
            
            {isActive && (
              <div className="ml-9 animate-fade-in">
                {step.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between p-3 h-auto font-semibold text-left border rounded-lg transition-all duration-200 hover:scale-[1.02] interactive-element",
          headerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 transition-transform duration-200" />
        ) : (
          <ChevronRight className="h-5 w-5 transition-transform duration-200" />
        )}
      </Button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen
            ? "max-h-screen opacity-100 animate-accordion-down"
            : "max-h-0 opacity-0 animate-accordion-up"
        )}
      >
        <div className={cn("p-4 border rounded-lg", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
};