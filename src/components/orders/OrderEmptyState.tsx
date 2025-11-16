import { motion } from 'framer-motion';
import { Package, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

interface OrderEmptyStateProps {
  onCreateOrder?: () => void;
  filteredState?: boolean;
  searchTerm?: string;
}

export function OrderEmptyState({ onCreateOrder, filteredState, searchTerm }: OrderEmptyStateProps) {
  if (filteredState) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <motion.div variants={staggerItem}>
          <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-muted-foreground" />
          </div>
        </motion.div>

        <motion.h3 
          variants={staggerItem}
          className="text-xl font-semibold text-foreground mb-2"
        >
          No orders found
        </motion.h3>

        <motion.p 
          variants={staggerItem}
          className="text-muted-foreground text-center max-w-sm mb-6"
        >
          {searchTerm 
            ? `No orders match "${searchTerm}". Try adjusting your search.`
            : "No orders match your current filters. Try adjusting your filters."
          }
        </motion.p>

        <motion.div variants={staggerItem}>
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Clear Filters
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Animated icon */}
      <motion.div 
        variants={staggerItem}
        className="relative mb-8"
      >
        <motion.div
          className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Package className="w-16 h-16 text-primary" />
        </motion.div>
        
        {/* Decorative circles */}
        <motion.div
          className="absolute top-0 right-0 w-8 h-8 rounded-full bg-primary/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-6 h-6 rounded-full bg-accent/20"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />
      </motion.div>

      <motion.h3 
        variants={staggerItem}
        className="text-2xl font-semibold text-foreground mb-2"
      >
        No orders yet
      </motion.h3>

      <motion.p 
        variants={staggerItem}
        className="text-muted-foreground text-center max-w-md mb-8"
      >
        Start managing your orders efficiently. Create your first order to get started with tracking and management.
      </motion.p>

      <motion.div 
        variants={staggerItem}
        className="flex gap-3"
      >
        {onCreateOrder && (
          <Button 
            onClick={onCreateOrder}
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Order
          </Button>
        )}
        
        <Button 
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <FileText className="w-5 h-5" />
          View Tutorial
        </Button>
      </motion.div>

      {/* Helpful tips */}
      <motion.div 
        variants={staggerItem}
        className="mt-12 text-center"
      >
        <p className="text-sm text-muted-foreground mb-2">💡 Quick Tip</p>
        <p className="text-sm text-muted-foreground max-w-lg">
          You can also convert approved quotes into orders automatically from the Quotes section.
        </p>
      </motion.div>
    </motion.div>
  );
}
