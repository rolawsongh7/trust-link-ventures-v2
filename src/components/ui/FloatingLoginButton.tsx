import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

export const FloatingLoginButton: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { user: customerUser } = useCustomerAuth();
  
  // Don't show if any user is signed in
  if (authUser || customerUser) {
    return null;
  }

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="absolute top-6 right-6 z-50">
      <button
        onClick={handleLoginClick}
        className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md
                   border border-white/20 shadow-xl hover:shadow-2xl
                   px-6 py-3 transition-all duration-300 hover:scale-105
                   hover:bg-white/20 active:scale-95
                   before:absolute before:inset-0 before:rounded-2xl
                   before:bg-gradient-to-r before:from-primary/20 before:via-secondary/20 before:to-accent/20
                   before:opacity-0 before:transition-opacity before:duration-300
                   hover:before:opacity-100"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          borderImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1)) 1',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.025em'
        }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent
                       group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        {/* Ripple effect container */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-white/30 rounded-full scale-0 group-active:scale-100 
                         transition-transform duration-200 ease-out opacity-50" 
               style={{ transformOrigin: 'center' }} />
        </div>
        
        {/* Content */}
        <div className="relative flex items-center gap-2 text-white font-medium">
          <LogIn className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span>Login</span>
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 
                       opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-xl -z-10" />
      </button>
    </div>
  );
};