// Enterprise Design System Tokens

export const designTokens = {
  // Color Palette - Semantic Status Colors with Gradients
  colors: {
    status: {
      pending: {
        from: 'hsl(38, 92%, 50%)',
        to: 'hsl(25, 95%, 53%)',
        base: 'hsl(38, 92%, 50%)',
      },
      pendingPayment: {
        from: 'hsl(45, 93%, 47%)',
        to: 'hsl(38, 92%, 50%)',
        base: 'hsl(45, 93%, 47%)',
      },
      paymentReceived: {
        from: 'hsl(199, 89%, 48%)',
        to: 'hsl(217, 91%, 60%)',
        base: 'hsl(199, 89%, 48%)',
      },
      processing: {
        from: 'hsl(217, 91%, 60%)',
        to: 'hsl(243, 75%, 59%)',
        base: 'hsl(217, 91%, 60%)',
      },
      readyToShip: {
        from: 'hsl(271, 91%, 65%)',
        to: 'hsl(262, 83%, 58%)',
        base: 'hsl(271, 91%, 65%)',
      },
      shipped: {
        from: 'hsl(243, 75%, 59%)',
        to: 'hsl(262, 83%, 58%)',
        base: 'hsl(243, 75%, 59%)',
      },
      delivered: {
        from: 'hsl(142, 76%, 36%)',
        to: 'hsl(160, 84%, 39%)',
        base: 'hsl(142, 76%, 36%)',
      },
      cancelled: {
        from: 'hsl(0, 84%, 60%)',
        to: 'hsl(0, 72%, 51%)',
        base: 'hsl(0, 84%, 60%)',
      },
      onHold: {
        from: 'hsl(215, 16%, 47%)',
        to: 'hsl(215, 14%, 34%)',
        base: 'hsl(215, 16%, 47%)',
      },
    },
  },

  // Shadow System - Elevation Layers
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    glow: {
      primary: '0 0 20px rgb(var(--primary) / 0.3)',
      success: '0 0 20px rgb(var(--success) / 0.3)',
      warning: '0 0 20px rgb(var(--warning) / 0.3)',
      danger: '0 0 20px rgb(var(--danger) / 0.3)',
    },
  },

  // Typography Scale
  typography: {
    display: {
      fontSize: '3rem',
      lineHeight: '1.1',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    h1: {
      fontSize: '2.25rem',
      lineHeight: '1.2',
      fontWeight: '700',
      letterSpacing: '-0.015em',
    },
    h2: {
      fontSize: '1.875rem',
      lineHeight: '1.3',
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      lineHeight: '1.4',
      fontWeight: '600',
      letterSpacing: '-0.005em',
    },
    h4: {
      fontSize: '1.25rem',
      lineHeight: '1.5',
      fontWeight: '600',
      letterSpacing: '0',
    },
    body: {
      fontSize: '1rem',
      lineHeight: '1.6',
      fontWeight: '400',
      letterSpacing: '0',
    },
    caption: {
      fontSize: '0.875rem',
      lineHeight: '1.5',
      fontWeight: '400',
      letterSpacing: '0.01em',
    },
    small: {
      fontSize: '0.75rem',
      lineHeight: '1.4',
      fontWeight: '400',
      letterSpacing: '0.02em',
    },
  },

  // Spacing Scale (in pixels)
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  // Animation Durations
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  // Animation Easings
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Z-Index Layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    toast: 1500,
  },

  // Breakpoints (in pixels)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

// Helper function to get status gradient
export const getStatusGradient = (status: string) => {
  const statusKey = status.toLowerCase().replace(/_/g, '') as keyof typeof designTokens.colors.status;
  const colors = designTokens.colors.status[statusKey] || designTokens.colors.status.pending;
  return `linear-gradient(135deg, ${colors.from}, ${colors.to})`;
};

// Helper function for shadow with color
export const getColoredShadow = (color: string, opacity = 0.3) => {
  return `0 10px 30px -10px ${color.replace(')', ` / ${opacity})`)}`;
};
