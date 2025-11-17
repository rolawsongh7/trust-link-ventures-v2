import React from 'react';
import { Shield, Building2, Globe2, Lock } from 'lucide-react';
import trustLinkLogo from '@/assets/trust-link-logo.png';

export const AuthBrandPanel = () => {
  return (
    <div className="relative hidden lg:flex lg:flex-col lg:justify-center lg:items-center lg:w-2/5 bg-gradient-to-br from-[hsl(var(--tl-navy-500))] via-[hsl(var(--tl-navy-600))] to-[hsl(var(--tl-navy-800))] text-white overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[hsl(var(--tl-maritime-500))] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[hsl(var(--tl-gold-500))] rounded-full blur-3xl"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 px-12 max-w-lg">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <img 
            src={trustLinkLogo} 
            alt="Trust Link Ventures" 
            className="h-16 w-auto mb-6"
          />
          <h1 className="text-5xl font-poppins font-bold mb-4 leading-tight">
            Your Gateway to
            <span className="block text-[hsl(var(--tl-gold-500))]">Global Excellence</span>
          </h1>
          <p className="text-xl font-inter text-white/80 leading-relaxed">
            Secure access to your premium logistics and supply chain management portal
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="space-y-5 mt-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Shield className="h-6 w-6 text-[hsl(var(--tl-gold-500))]" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-lg mb-1">Bank-Level Security</h3>
              <p className="text-white/70 text-sm">Enterprise-grade encryption and protection</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-[hsl(var(--tl-gold-500))]" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-lg mb-1">Trusted by 500+ Partners</h3>
              <p className="text-white/70 text-sm">Leading enterprises worldwide</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Globe2 className="h-6 w-6 text-[hsl(var(--tl-gold-500))]" />
            </div>
            <div>
              <h3 className="font-poppins font-semibold text-lg mb-1">Operating in 50+ Countries</h3>
              <p className="text-white/70 text-sm">Global logistics solutions</p>
            </div>
          </div>
        </div>

        {/* Decorative wave element */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-full w-full">
            <path
              d="M0,0 C300,80 600,40 900,60 C1050,70 1150,80 1200,60 L1200,120 L0,120 Z"
              fill="currentColor"
              className="text-[hsl(var(--tl-maritime-500))]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
