// Animation Library - Framer Motion Variants

import { Variants } from 'framer-motion';

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

// Slide animations
export const slideInLeft: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  exit: { x: -100, opacity: 0, transition: { duration: 0.25 } },
};

export const slideInRight: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  exit: { x: 100, opacity: 0, transition: { duration: 0.25 } },
};

export const slideInUp: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  exit: { y: 100, opacity: 0, transition: { duration: 0.25 } },
};

// Scale animations
export const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { scale: 0.8, opacity: 0, transition: { duration: 0.2 } },
};

export const scaleBounce: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
  exit: { scale: 0, transition: { duration: 0.2 } },
};

// Card hover animations
export const cardHover: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};

export const cardHoverSubtle: Variants = {
  initial: { scale: 1, y: 0 },
  hover: {
    y: -2,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  tap: { scale: 0.99, transition: { duration: 0.1 } },
};

// Button interactions
export const buttonHover: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.03,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  tap: { scale: 0.97, transition: { duration: 0.1 } },
};

export const buttonPrimary: Variants = {
  initial: { scale: 1, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  hover: {
    scale: 1.03,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.15)',
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  tap: {
    scale: 0.97,
    boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
    transition: { duration: 0.1 },
  },
};

// Stagger children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

// Modal/Dialog animations
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

// Bottom sheet animation
export const bottomSheet: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// Success checkmark animation
export const successCheck: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// Progress bar animation
export const progressBar: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// Ripple effect (for click feedback)
export const ripple: Variants = {
  initial: { scale: 0, opacity: 0.5 },
  animate: {
    scale: 4,
    opacity: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

// Notification toast
export const toast: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 200, damping: 25 },
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// Page transitions
export const pageTransition: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// Skeleton pulse
export const skeletonPulse: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: 'reverse',
      duration: 1,
      ease: 'easeInOut',
    },
  },
};

// Bounce animation
export const bounce: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
};

// Rotate animation
export const rotate: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Spin animation (loading)
export const spin: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Badge pulse
export const badgePulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
