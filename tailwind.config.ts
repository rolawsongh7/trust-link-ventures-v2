import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },
      fontWeight: {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      fontSize: {
        'xs': ['var(--font-size-xs)', { lineHeight: 'var(--line-height-normal)' }],
        'sm': ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        'base': ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        'lg': ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
        'xl': ['var(--font-size-xl)', { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-none)' }],
        '5xl': ['var(--font-size-5xl)', { lineHeight: 'var(--line-height-none)' }],
        '6xl': ['var(--font-size-6xl)', { lineHeight: 'var(--line-height-none)' }],
        '7xl': ['var(--font-size-7xl)', { lineHeight: 'var(--line-height-none)' }],
        '8xl': ['var(--font-size-8xl)', { lineHeight: 'var(--line-height-none)' }],
        '9xl': ['var(--font-size-9xl)', { lineHeight: 'var(--line-height-none)' }],
      },
      letterSpacing: {
        'tighter': 'var(--letter-spacing-tighter)',
        'tight': 'var(--letter-spacing-tight)',
        'normal': 'var(--letter-spacing-normal)',
        'wide': 'var(--letter-spacing-wide)',
        'wider': 'var(--letter-spacing-wider)',
        'widest': 'var(--letter-spacing-widest)',
      },
      lineHeight: {
        'none': 'var(--line-height-none)',
        'tight': 'var(--line-height-tight)',
        'snug': 'var(--line-height-snug)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)',
        'loose': 'var(--line-height-loose)',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Enhanced Primary Palette */
        primary: {
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          300: "hsl(var(--primary-300))",
          400: "hsl(var(--primary-400))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
          800: "hsl(var(--primary-800))",
          900: "hsl(var(--primary-900))",
          950: "hsl(var(--primary-950))",
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
          variant: "hsl(var(--primary-variant))",
        },
        
        /* Enhanced Secondary Palette */
        secondary: {
          50: "hsl(var(--secondary-50))",
          100: "hsl(var(--secondary-100))",
          200: "hsl(var(--secondary-200))",
          300: "hsl(var(--secondary-300))",
          400: "hsl(var(--secondary-400))",
          500: "hsl(var(--secondary-500))",
          600: "hsl(var(--secondary-600))",
          700: "hsl(var(--secondary-700))",
          800: "hsl(var(--secondary-800))",
          900: "hsl(var(--secondary-900))",
          950: "hsl(var(--secondary-950))",
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          glow: "hsl(var(--secondary-glow))",
        },
        
        /* Enhanced Accent Palette */
        accent: {
          50: "hsl(var(--accent-50))",
          100: "hsl(var(--accent-100))",
          200: "hsl(var(--accent-200))",
          300: "hsl(var(--accent-300))",
          400: "hsl(var(--accent-400))",
          500: "hsl(var(--accent-500))",
          600: "hsl(var(--accent-600))",
          700: "hsl(var(--accent-700))",
          800: "hsl(var(--accent-800))",
          900: "hsl(var(--accent-900))",
          950: "hsl(var(--accent-950))",
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          glow: "hsl(var(--accent-glow))",
        },
        
        /* Enhanced Success Palette */
        success: {
          50: "hsl(var(--success-50))",
          100: "hsl(var(--success-100))",
          200: "hsl(var(--success-200))",
          300: "hsl(var(--success-300))",
          400: "hsl(var(--success-400))",
          500: "hsl(var(--success-500))",
          600: "hsl(var(--success-600))",
          700: "hsl(var(--success-700))",
          800: "hsl(var(--success-800))",
          900: "hsl(var(--success-900))",
          950: "hsl(var(--success-950))",
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        
        /* Enhanced Warning Palette */
        warning: {
          50: "hsl(var(--warning-50))",
          100: "hsl(var(--warning-100))",
          200: "hsl(var(--warning-200))",
          300: "hsl(var(--warning-300))",
          400: "hsl(var(--warning-400))",
          500: "hsl(var(--warning-500))",
          600: "hsl(var(--warning-600))",
          700: "hsl(var(--warning-700))",
          800: "hsl(var(--warning-800))",
          900: "hsl(var(--warning-900))",
          950: "hsl(var(--warning-950))",
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        
        /* Enhanced Destructive Palette */
        destructive: {
          50: "hsl(var(--destructive-50))",
          100: "hsl(var(--destructive-100))",
          200: "hsl(var(--destructive-200))",
          300: "hsl(var(--destructive-300))",
          400: "hsl(var(--destructive-400))",
          500: "hsl(var(--destructive-500))",
          600: "hsl(var(--destructive-600))",
          700: "hsl(var(--destructive-700))",
          800: "hsl(var(--destructive-800))",
          900: "hsl(var(--destructive-900))",
          950: "hsl(var(--destructive-950))",
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        /* Enhanced Neutral Palette */
        neutral: {
          50: "hsl(var(--neutral-50))",
          100: "hsl(var(--neutral-100))",
          200: "hsl(var(--neutral-200))",
          300: "hsl(var(--neutral-300))",
          400: "hsl(var(--neutral-400))",
          500: "hsl(var(--neutral-500))",
          600: "hsl(var(--neutral-600))",
          700: "hsl(var(--neutral-700))",
          800: "hsl(var(--neutral-800))",
          900: "hsl(var(--neutral-900))",
          950: "hsl(var(--neutral-950))",
        },
        
        /* Semantic Colors */
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        /* Surface Colors */
        surface: {
          DEFAULT: "hsl(var(--surface))",
          variant: "hsl(var(--surface-variant))",
          container: "hsl(var(--surface-container))",
          bright: "hsl(var(--surface-bright))",
          dim: "hsl(var(--surface-dim))",
        },
        
        /* Interactive Colors */
        interactive: {
          DEFAULT: "hsl(var(--interactive))",
          hover: "hsl(var(--interactive-hover))",
          active: "hsl(var(--interactive-active))",
          disabled: "hsl(var(--interactive-disabled))",
        },
        
        /* Contextual Colors */
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
        
        /* Status Colors */
        status: {
          online: "hsl(var(--status-online))",
          busy: "hsl(var(--status-busy))",
          away: "hsl(var(--status-away))",
          offline: "hsl(var(--status-offline))",
        },
        
        /* Brand Colors */
        brand: {
          primary: "hsl(var(--brand-primary))",
          secondary: "hsl(var(--brand-secondary))",
          tertiary: "hsl(var(--brand-tertiary))",
        },
        
        /* Trust Link Ventures Brand */
        trustlink: {
          navy: {
            50: 'hsl(var(--tl-navy-50))',
            100: 'hsl(var(--tl-navy-100))',
            200: 'hsl(var(--tl-navy-200))',
            300: 'hsl(var(--tl-navy-300))',
            400: 'hsl(var(--tl-navy-400))',
            500: 'hsl(var(--tl-navy-500))',
            600: 'hsl(var(--tl-navy-600))',
            700: 'hsl(var(--tl-navy-700))',
            800: 'hsl(var(--tl-navy-800))',
            900: 'hsl(var(--tl-navy-900))',
            DEFAULT: 'hsl(var(--tl-navy-500))',
          },
          maritime: {
            50: 'hsl(var(--tl-maritime-50))',
            100: 'hsl(var(--tl-maritime-100))',
            200: 'hsl(var(--tl-maritime-200))',
            300: 'hsl(var(--tl-maritime-300))',
            400: 'hsl(var(--tl-maritime-400))',
            500: 'hsl(var(--tl-maritime-500))',
            600: 'hsl(var(--tl-maritime-600))',
            700: 'hsl(var(--tl-maritime-700))',
            800: 'hsl(var(--tl-maritime-800))',
            900: 'hsl(var(--tl-maritime-900))',
            DEFAULT: 'hsl(var(--tl-maritime-500))',
          },
          gold: {
            50: 'hsl(var(--tl-gold-50))',
            100: 'hsl(var(--tl-gold-100))',
            200: 'hsl(var(--tl-gold-200))',
            300: 'hsl(var(--tl-gold-300))',
            400: 'hsl(var(--tl-gold-400))',
            500: 'hsl(var(--tl-gold-500))',
            600: 'hsl(var(--tl-gold-600))',
            700: 'hsl(var(--tl-gold-700))',
            800: 'hsl(var(--tl-gold-800))',
            900: 'hsl(var(--tl-gold-900))',
            DEFAULT: 'hsl(var(--tl-gold-500))',
          },
        },
        
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)', 
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
      },
      aspectRatio: {
        'golden': '1.618 / 1',
        'golden-flip': '1 / 1.618',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(-25%)", animationTimingFunction: "cubic-bezier(0.8,0,1,1)" },
          "50%": { transform: "none", animationTimingFunction: "cubic-bezier(0,0,0.2,1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeInStagger: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' }
        },
        'blink-caret': {
          '0%, 50%': { 'border-color': 'hsl(var(--primary))' },
          '51%, 100%': { 'border-color': 'transparent' }
        },
        reveal: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.6s ease-out",
        fadeInUp: "fadeInUp 0.6s ease-out",
        fadeInLeft: "fadeInLeft 0.6s ease-out",
        fadeInRight: "fadeInRight 0.6s ease-out",
        scaleIn: "scaleIn 0.4s ease-out",
        slideUp: "slideUp 0.5s ease-out",
        shimmer: "shimmer 2s linear infinite",
        bounce: "bounce 1s infinite",
        float: "float 3s ease-in-out infinite",
        "fade-in-stagger": "fadeInStagger 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-in": "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up-fade": "slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "zoom-in": "zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "rotate-slow": "rotateSlow 20s linear infinite",
        "typewriter": "typewriter 3s steps(40, end)",
        "blink-caret": "blink-caret 0.75s step-end infinite",
        "wiggle": "wiggle 1s ease-in-out infinite",
        "heartbeat": "heartbeat 1.5s ease-in-out infinite"
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-primary-vibrant': 'var(--gradient-primary-vibrant)',
        'gradient-primary-soft': 'var(--gradient-primary-soft)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-secondary-vibrant': 'var(--gradient-secondary-vibrant)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-accent-vibrant': 'var(--gradient-accent-vibrant)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-rainbow': 'var(--gradient-rainbow)',
        'gradient-sunset': 'var(--gradient-sunset)',
        'gradient-ocean': 'var(--gradient-ocean)',
        'gradient-forest': 'var(--gradient-forest)',
        'gradient-subtle': 'var(--gradient-subtle)',
        'gradient-surface': 'var(--gradient-surface)',
        'gradient-mesh-primary': 'var(--gradient-mesh-primary)',
        'gradient-mesh-warm': 'var(--gradient-mesh-warm)',
        'gradient-glass': 'var(--gradient-glass)',
        'gradient-glass-dark': 'var(--gradient-glass-dark)',
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'inner': 'var(--shadow-inner)',
        'primary': 'var(--shadow-primary)',
        'secondary': 'var(--shadow-secondary)',
        'accent': 'var(--shadow-accent)',
        'success': 'var(--shadow-success)',
        'warning': 'var(--shadow-warning)',
        'destructive': 'var(--shadow-destructive)',
        'glow-primary': 'var(--shadow-glow-primary)',
        'glow-secondary': 'var(--shadow-glow-secondary)',
        'glow-accent': 'var(--shadow-glow-accent)',
        'glow-success': 'var(--shadow-glow-success)',
        'glow-warning': 'var(--shadow-glow-warning)',
        'glow-destructive': 'var(--shadow-glow-destructive)',
        'elegant': 'var(--shadow-elegant)',
        'glow': 'var(--shadow-glow)',
        'card': 'var(--shadow-card)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;