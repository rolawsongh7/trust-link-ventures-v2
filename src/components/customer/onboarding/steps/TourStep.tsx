import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package, FileText, Truck, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TourStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const tourSlides = [
  {
    icon: Package,
    title: 'Browse Products',
    description: 'Explore our catalog of premium food products. Add items to your cart and request personalized quotes.',
    color: 'bg-blue-500',
  },
  {
    icon: FileText,
    title: 'Get Quotes',
    description: 'Our team will review your request and send you competitive pricing within 24-48 hours.',
    color: 'bg-green-500',
  },
  {
    icon: CreditCard,
    title: 'Easy Payment',
    description: 'Accept quotes and complete payment through our secure payment options.',
    color: 'bg-purple-500',
  },
  {
    icon: Truck,
    title: 'Track Delivery',
    description: 'Follow your order from processing to delivery with real-time updates.',
    color: 'bg-orange-500',
  },
];

export const TourStep: React.FC<TourStepProps> = ({ onComplete, onBack }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = tourSlides[currentSlide];
  const isLastSlide = currentSlide === tourSlides.length - 1;

  const nextSlide = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide === 0) {
      onBack();
    } else {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="px-4 py-3 flex flex-col items-center">
      <div className="text-center mb-3">
        <h2 className="text-lg font-bold text-foreground mb-1">Quick Tour</h2>
        <p className="text-xs text-muted-foreground">
          Get the most out of your account
        </p>
      </div>

      {/* Slide Indicator */}
      <div className="flex gap-1.5 mb-4">
        {tourSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentSlide 
                ? 'w-5 bg-primary' 
                : 'bg-muted hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>

      {/* Slide Content */}
      <div className="w-full max-w-sm min-h-[140px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`w-12 h-12 rounded-xl ${slide.color} flex items-center justify-center mb-3 shadow-lg`}>
              <slide.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {slide.title}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-4 w-full max-w-sm">
        <Button
          variant="outline"
          onClick={prevSlide}
          className="flex-1"
          size="sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={nextSlide}
          className="flex-1 bg-tl-gradient hover:opacity-90 text-white"
          size="sm"
        >
          {isLastSlide ? (
            "Get Started"
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Skip Link */}
      {!isLastSlide && (
        <button
          onClick={onComplete}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip tour
        </button>
      )}
    </div>
  );
};
