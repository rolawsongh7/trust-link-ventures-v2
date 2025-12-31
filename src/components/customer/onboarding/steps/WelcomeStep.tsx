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
      className="flex flex-col items-center text-center px-4 py-4 md:py-6"
    >
      {/* Welcome Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-tl-gradient flex items-center justify-center mb-4 md:mb-6 shadow-lg"
      >
        <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
      </motion.div>

      {/* Welcome Text */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl md:text-2xl font-bold text-foreground mb-2"
      >
        Welcome{userName ? `, ${userName}` : ''}!
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mb-4 md:mb-6 max-w-sm text-sm md:text-base"
      >
        Let's set up your account in just a few steps so you can start ordering right away.
      </motion.p>

      {/* Features List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-2 md:space-y-3 mb-4 md:mb-6 w-full max-w-sm"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-muted/50 text-left"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
            <span className="text-xs md:text-sm text-foreground">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={onNext}
          className="w-full bg-tl-gradient hover:opacity-90 text-white shadow-md"
          size="lg"
        >
          Get Started
        </Button>
        
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => onSkip(dontShowAgain)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label 
              htmlFor="dont-show-again" 
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Don't show this again
            </label>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
