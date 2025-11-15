import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const FloatingLoginButton: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/portal-auth');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed z-50 pointer-events-auto
                          bottom-6 right-6
                          sm:bottom-6 sm:right-6
                          md:bottom-6 md:right-6
                          [.has-bottom-nav_&]:bottom-[calc(4rem+env(safe-area-inset-bottom)+1.5rem)]
                          pb-safe">
            <button
              onClick={handleLoginClick}
              aria-label="Access Customer Portal"
              className="group relative overflow-hidden rounded-full
                         bg-gradient-to-r from-[#0A2540] via-[#1E3A8A] to-[#0A2540]
                         border border-white/30 shadow-lg hover:shadow-xl
                         hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]
                         backdrop-blur-md bg-opacity-80
                         px-6 py-3 md:px-8 md:py-4
                         min-h-[44px] min-w-[44px]
                         transition-all duration-300 hover:scale-105 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent
                             group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              {/* Content */}
              <div className="relative flex items-center gap-2 md:gap-3 text-white font-medium text-sm md:text-base">
                <ArrowRightCircle className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
                <span className="whitespace-nowrap">Access Customer Portal</span>
              </div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-blue-500/20 
                             opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10" />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-[#0A2540] text-white border-white/30">
          <p>Access Customer Portal</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};