import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, FileText, Truck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeStepProps {
  userName?: string;
  onNext: () => void;
  onSkip: (permanent: boolean) => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ userName, onNext, onSkip }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  const features = [
    { icon: Package, text: 'Browse premium products and request quotes' },
    { icon: FileText, text: 'Receive personalized pricing quickly' },
    { icon: Truck, text: 'Track your orders in real-time' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center text-center px-4 py-3"
    >
      {/* Welcome Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-tl-gradient flex items-center justify-center mb-3 shadow-lg"
      >
        <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
      </motion.div>

      {/* Welcome Text */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-lg md:text-xl font-bold text-foreground mb-1"
      >
        Welcome{userName ? `, ${userName}` : ''}!
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mb-3 max-w-sm text-xs md:text-sm"
      >
        Set up your account to start ordering right away.
      </motion.p>

      {/* Features List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-1.5 mb-3 w-full max-w-sm"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.05 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-foreground">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-2">
        <Button
          onClick={onNext}
          className="w-full bg-tl-gradient hover:opacity-90 text-white shadow-md"
        >
          Get Started
        </Button>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => onSkip(dontShowAgain)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex items-center gap-1.5">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="h-3.5 w-3.5"
            />
            <label 
              htmlFor="dont-show-again" 
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Don't show again
            </label>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
